
import React, { useState, useEffect } from 'react';
import { generateActivitiesFromPdf, getStudyMaterials } from './services/geminiService';
import { Activity, LoadingState, ImpactRecord, StudySession } from './types';
import ActivityCard from './components/ActivityCard';
import StudyCorner from './components/StudyCorner';

type AppScreen = 'WELCOME' | 'UPLOAD' | 'PROCESSING' | 'CHOICE' | 'STUDY' | 'RESULTS' | 'JOURNAL';

const App: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [overallTopics, setOverallTopics] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [displayLanguage, setDisplayLanguage] = useState<'original' | 'english'>('original');
  const [appScreen, setAppScreen] = useState<AppScreen>('WELCOME');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState(0);
  
  const [studySession, setStudySession] = useState<StudySession | null>(null);
  const [loadingStudy, setLoadingStudy] = useState(false);
  const [impactRecords, setImpactRecords] = useState<ImpactRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('teachwell_impact');
    if (saved) {
      try {
        setImpactRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load impact data", e);
      }
    }
  }, []);

  const stages = [
    "Analyzing Academic Material...",
    "Extracting Intentional Concepts...",
    "Drafting Shared Missions...",
    "Polishing Your Handbook..."
  ];

  useEffect(() => {
    let interval: any;
    if (appScreen === 'PROCESSING') {
      interval = setInterval(() => {
        setProcessingStage(prev => (prev < stages.length - 1 ? prev + 1 : prev));
      }, 3500);
    } else {
      setProcessingStage(0);
    }
    return () => clearInterval(interval);
  }, [appScreen]);

  const saveImpact = (newRecords: ImpactRecord[]) => {
    setImpactRecords(newRecords);
    localStorage.setItem('teachwell_impact', JSON.stringify(newRecords));
  };

  const handleActivityComplete = (record: Omit<ImpactRecord, 'id' | 'timestamp'>) => {
    const fullRecord: ImpactRecord = {
      ...record,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    saveImpact([fullRecord, ...impactRecords]);
    setAppScreen('JOURNAL');
  };

  const handleChoice = (choice: string) => {
    setSelectedPath(choice);
    setAppScreen('UPLOAD');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setStatus(LoadingState.READING_PDF);
    setAppScreen('PROCESSING');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        setStatus(LoadingState.GENERATING);
        try {
          const response = await generateActivitiesFromPdf(base64Data, selectedPath || "Curriculum Mastery");
          setActivities(response.activities);
          setOverallTopics(response.overallTopics);
          setStatus(LoadingState.SUCCESS);
          setAppScreen('CHOICE');
        } catch (err: any) {
          setError(err.message || "The TeachWell engine is busy. Please try again.");
          setAppScreen('WELCOME');
          setStatus(LoadingState.ERROR);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to read the file. Ensure it's a standard PDF.");
      setAppScreen('WELCOME');
      setStatus(LoadingState.ERROR);
    }
  };

  const startStudyCorner = async () => {
    if (studySession) {
      setAppScreen('STUDY');
      return;
    }
    setLoadingStudy(true);
    try {
      const session = await getStudyMaterials(overallTopics);
      setStudySession(session);
      setAppScreen('STUDY');
    } catch (err) {
      setError("Could not reach resources. Please check your internet.");
    } finally {
      setLoadingStudy(false);
    }
  };

  const reset = () => {
    setActivities([]);
    setOverallTopics([]);
    setStudySession(null);
    setStatus(LoadingState.IDLE);
    setError(null);
    setAppScreen('WELCOME');
  };

  const totalMinutes = impactRecords.reduce((acc, r) => acc + r.durationMinutes, 0);

  const GuidanceLogo = ({ size = "11" }: { size?: string }) => (
    <div className={`w-${size} h-${size} bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 transform group-hover:scale-110 transition-transform`}>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={reset}>
            <GuidanceLogo />
            <div className="flex flex-col">
               <h1 className="text-xl font-black tracking-tight font-['Outfit'] text-slate-900 leading-none">TeachWell</h1>
               <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1.5">Nurturing Human Brilliance</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {(appScreen === 'RESULTS' || appScreen === 'CHOICE') && (
               <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button onClick={() => setDisplayLanguage('original')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${displayLanguage === 'original' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Original</button>
                  <button onClick={() => setDisplayLanguage('english')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${displayLanguage === 'english' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>English</button>
               </div>
            )}
            <button 
              onClick={() => setAppScreen('JOURNAL')} 
              className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl border transition-all active:scale-95 ${appScreen === 'JOURNAL' ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white hover:shadow-xl hover:shadow-blue-200'}`}
            >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeWidth="2.5"/></svg>
               <span className="hidden xs:block">Legacy Journal</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {error && (
          <div className="max-w-2xl mx-auto mt-8 px-6 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center space-x-5 shadow-lg shadow-red-100/50">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/></svg>
              </div>
              <div className="flex-grow">
                <p className="text-red-900 font-bold text-sm">{error}</p>
                <button onClick={() => setError(null)} className="text-red-500 text-[10px] font-black uppercase mt-1 tracking-widest hover:text-red-700 transition-colors">Dismiss Error</button>
              </div>
            </div>
          </div>
        )}

        {appScreen === 'WELCOME' && (
          <div className="max-w-6xl mx-auto px-6 pt-24 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="text-center mb-24 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100/40 rounded-full blur-[100px] -z-10"></div>
              <div className="inline-flex items-center space-x-2 bg-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-8 border border-slate-100 shadow-sm text-blue-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span>Active Guidance Engine</span>
              </div>
              <h2 className="text-6xl sm:text-9xl font-black text-slate-900 tracking-tight mb-10 font-['Outfit'] leading-[0.95]">
                Parent-Led. <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500">Brilliance-Fed.</span>
              </h2>
              <p className="text-xl sm:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed font-medium mb-12">
                TeachWell empowers parents to turn curriculum into meaningful home missions. Connect deeper, learn better, and guide their curiosity.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button 
                  onClick={() => handleChoice("Curriculum Mastery")}
                  className="w-full sm:w-auto px-12 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center group"
                >
                   Start Your First Mission
                   <svg className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" /></svg>
                </button>
                <button 
                  onClick={() => setAppScreen('JOURNAL')}
                  className="w-full sm:w-auto px-12 py-6 bg-white text-slate-900 border-2 border-slate-100 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:border-blue-200 transition-all active:scale-95"
                >
                   View Legacy Journal
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
              <div onClick={() => handleChoice("Curriculum Mastery")} className="group bg-white p-12 rounded-[4rem] shadow-2xl shadow-blue-100/20 hover:shadow-blue-200/40 border border-slate-50 hover:border-blue-500 transition-all cursor-pointer">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-inner">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-3 font-['Outfit']">School Sync</h3>
                <p className="text-slate-500 text-lg font-medium leading-relaxed mb-8">Upload any school PDF (syllabus, worksheets) to create a simplified parent guidance guide.</p>
                <div className="text-blue-600 font-black text-[11px] uppercase tracking-widest flex items-center group-hover:translate-x-2 transition-transform">
                  SYNC MATERIAL <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" /></svg>
                </div>
              </div>

              <div onClick={() => handleChoice("Wellness Exploration")} className="group bg-white p-12 rounded-[4rem] shadow-2xl shadow-indigo-100/20 hover:shadow-indigo-200/40 border border-slate-50 hover:border-indigo-500 transition-all cursor-pointer">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:-rotate-3 transition-all shadow-inner">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-3 font-['Outfit']">Topic Explorer</h3>
                <p className="text-slate-500 text-lg font-medium leading-relaxed mb-8">Don't have a document? Simply choose a curiosity theme and let TeachWell design a mission for you.</p>
                <div className="text-indigo-600 font-black text-[11px] uppercase tracking-widest flex items-center group-hover:translate-x-2 transition-transform">
                  EXPLORE THEMES <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" /></svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {appScreen === 'JOURNAL' && (
          <div className="max-w-7xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="flex flex-col sm:flex-row items-center justify-between mb-20 gap-8">
                <button onClick={() => setAppScreen('WELCOME')} className="flex items-center text-slate-400 font-black text-[11px] uppercase tracking-widest hover:text-blue-600 transition-colors group">
                  <svg className="w-5 h-5 mr-3 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Return Home
                </button>
                <div className="text-center">
                   <h2 className="text-6xl font-black text-slate-900 font-['Outfit'] tracking-tight">Legacy Journal</h2>
                   <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] mt-3 block">Nurturing Human Potential</p>
                </div>
                <div className="hidden sm:block w-32"></div>
             </div>

            {impactRecords.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                {impactRecords.map((record) => (
                  <div key={record.id} className="group bg-white rounded-[3.5rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-slate-50 flex flex-col h-full hover:-translate-y-1">
                    <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden">
                      {record.photoUrl ? (
                        <img src={record.photoUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-6 text-center text-blue-100">
                           <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2.5"/></svg>
                        </div>
                      )}
                      <div className="absolute top-6 left-6 glass-panel px-5 py-2 rounded-full text-[10px] font-black text-slate-800 shadow-xl border border-white/20">
                        {new Date(record.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <button 
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: `Legacy Moment: ${record.activityTitle}`,
                              text: `Completed this mission on TeachWell!`,
                              url: window.location.href
                            });
                          }
                        }}
                        className="absolute bottom-6 right-6 w-14 h-14 bg-white text-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:bg-slate-900 hover:text-white"
                        title="Share Moment"
                      >
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeWidth="3"/></svg>
                      </button>
                    </div>
                    <div className="p-10 space-y-4 flex-grow">
                      <h4 className="text-2xl font-black text-slate-900 font-['Outfit'] line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{record.activityTitle}</h4>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{record.topic}</span>
                        <div className="flex items-center text-[10px] font-bold text-blue-500">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" /></svg>
                          {record.durationMinutes}m
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-40 bg-white rounded-[5rem] border border-blue-50 shadow-inner max-w-4xl mx-auto">
                 <div className="w-24 h-24 bg-blue-50 text-blue-100 rounded-[2rem] flex items-center justify-center mx-auto mb-10 animate-float shadow-inner">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2.5"/></svg>
                 </div>
                 <h3 className="text-4xl font-black text-slate-900 font-['Outfit'] mb-6">Your Legacy Awaits.</h3>
                 <p className="text-slate-500 max-w-sm mx-auto font-medium text-lg leading-relaxed mb-12">Shared missions completed with your child will appear here as beautiful visual milestones.</p>
                 <button onClick={() => setAppScreen('WELCOME')} className="bg-slate-900 text-white px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95">Start First Mission</button>
              </div>
            )}
          </div>
        )}

        {appScreen === 'UPLOAD' && (
          <div className="max-w-4xl mx-auto px-6 py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => setAppScreen('WELCOME')} className="mb-12 flex items-center mx-auto text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors group">
              <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Back
            </button>
            <h2 className="text-5xl font-black text-slate-900 mb-6 font-['Outfit'] tracking-tight">{selectedPath}</h2>
            <p className="text-slate-500 mb-16 max-w-lg mx-auto font-medium text-lg leading-relaxed">TeachWell will distill your material into a clear guidance handbook for intentional learning.</p>

            <label className="group relative flex flex-col items-center justify-center w-full h-[450px] border-4 border-dashed border-slate-100 rounded-[5rem] bg-white hover:border-blue-300 hover:bg-blue-50/10 transition-all cursor-pointer shadow-2xl overflow-hidden ring-offset-4 hover:ring-2 hover:ring-blue-100">
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-[2.5rem] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <p className="text-3xl text-slate-900 font-black mb-4 font-['Outfit']">Sync Learning Material</p>
                <p className="text-xs text-slate-400 font-black uppercase tracking-[0.3em]">PDF Support Enabled</p>
              </div>
              <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {appScreen === 'PROCESSING' && (
          <div className="max-w-4xl mx-auto px-6 py-40 text-center flex flex-col items-center animate-in fade-in duration-700">
            <div className="relative w-40 h-40 mb-16">
               <div className="absolute inset-0 border-[16px] border-slate-100 rounded-full"></div>
               <div className="absolute inset-0 border-[16px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <GuidanceLogo size="14" />
               </div>
            </div>
            <h2 className="text-5xl font-black text-slate-900 font-['Outfit'] mb-6 tracking-tight">{stages[processingStage]}</h2>
            <p className="text-slate-400 text-xl font-medium italic animate-pulse">Designing your custom parenting handbook...</p>
          </div>
        )}

        {appScreen === 'CHOICE' && (
          <div className="max-w-5xl mx-auto px-6 py-24 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="mb-20">
                <div className="w-24 h-24 bg-green-50 text-green-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
                   <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span className="text-blue-600 font-black text-[11px] uppercase tracking-[0.4em] mb-4 block">Engine Analysis Complete</span>
                <h2 className="text-7xl font-black text-slate-900 font-['Outfit'] tracking-tight">Handbook Active.</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <button 
                  onClick={startStudyCorner}
                  disabled={loadingStudy}
                  className="group bg-white p-16 rounded-[4.5rem] shadow-2xl border-2 border-slate-50 hover:border-blue-500 transition-all text-left relative overflow-hidden"
                >
                   {loadingStudy && (
                     <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-10 animate-in fade-in">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                     </div>
                   )}
                   <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[1.7rem] flex items-center justify-center mb-12 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                   </div>
                   <h3 className="text-4xl font-black text-slate-900 mb-6 font-['Outfit']">Parent's Study Lounge</h3>
                   <p className="text-slate-500 text-xl leading-relaxed mb-12">Master the topic first. Get curated insights and media so you lead with absolute clarity.</p>
                   <div className="text-blue-600 font-black text-xs uppercase tracking-[0.2em] flex items-center group-hover:translate-x-3 transition-transform">
                      ENTER PREP MODE <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" /></svg>
                   </div>
                </button>

                <button 
                  onClick={() => setAppScreen('RESULTS')}
                  className="group bg-slate-900 p-16 rounded-[4.5rem] shadow-2xl border-2 border-transparent hover:shadow-blue-300/30 transition-all text-left"
                >
                   <div className="w-20 h-20 bg-white/10 text-white rounded-[1.7rem] flex items-center justify-center mb-12 group-hover:bg-white group-hover:text-slate-900 transition-colors shadow-inner">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <h3 className="text-4xl font-black text-white mb-6 font-['Outfit']">Shared Missions</h3>
                   <p className="text-slate-400 text-xl leading-relaxed mb-12">Guide the wonder. Visuals and scripts designed for you to focus on the connection.</p>
                   <div className="text-white font-black text-xs uppercase tracking-[0.2em] flex items-center group-hover:translate-x-3 transition-transform">
                      LAUNCH MISSIONS <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" /></svg>
                   </div>
                </button>
             </div>
          </div>
        )}

        {appScreen === 'STUDY' && studySession && (
          <div className="py-16 px-6 bg-slate-50/50">
            <StudyCorner session={studySession} onBack={() => setAppScreen('CHOICE')} />
          </div>
        )}

        {appScreen === 'RESULTS' && status === LoadingState.SUCCESS && (
          <div className="max-w-7xl mx-auto px-6 py-20 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between mb-20 gap-10">
              <div className="text-center md:text-left">
                <button onClick={() => setAppScreen('CHOICE')} className="mb-8 flex items-center text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors group">
                  <svg className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Return to Dashboard
                </button>
                <h2 className="text-6xl font-black text-slate-900 tracking-tight font-['Outfit']">Curated Missions</h2>
                <p className="text-slate-500 mt-4 text-2xl font-medium leading-relaxed">Select a mission to lead with intention today.</p>
              </div>
              <div className="bg-white border border-slate-100 p-10 rounded-[4rem] flex items-center space-x-8 shadow-2xl shadow-slate-100">
                 <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center font-black text-4xl text-white shadow-xl shadow-blue-200">
                   {activities.length}
                 </div>
                 <div>
                    <div className="text-[12px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">Handbook Active</div>
                    <div className="font-black text-slate-900 uppercase text-xs tracking-widest">Missions Prepared</div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {activities.map((activity, index) => (
                <ActivityCard 
                  key={index} 
                  activity={activity} 
                  displayLanguage={displayLanguage} 
                  onComplete={handleActivityComplete}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white py-24 border-t border-slate-100 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <div className="flex items-center space-x-4 mb-12 group opacity-80">
            <GuidanceLogo size="10" />
            <h1 className="text-2xl font-black tracking-tight font-['Outfit'] text-slate-900">TeachWell</h1>
          </div>
          <div className="flex flex-wrap justify-center gap-12 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">
             <button onClick={reset} className="hover:text-blue-600 transition-all">Engine Reset</button>
             <button onClick={() => setAppScreen('JOURNAL')} className="hover:text-blue-600 transition-all">Learning Legacy</button>
             <button className="hover:text-blue-600 transition-all">Privacy Protocol</button>
             <a href="mailto:support@teachwell.app" className="hover:text-blue-600 transition-all">Support Center</a>
          </div>
          <p className="mt-16 text-[10px] text-slate-300 font-bold uppercase tracking-[0.4em] text-center">© 2025 TeachWell Engine. Guiding Curiosity, Nurturing Brilliance.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
