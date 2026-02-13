
import React, { useState, useEffect, useRef } from 'react';
import { Activity, ImpactRecord } from '../types';
import { generateStepImage, generateSpeech, suggestMaterialAlternative } from '../services/geminiService';

interface ActivityCardProps {
  activity: Activity;
  displayLanguage: 'original' | 'english';
  onComplete: (record: Omit<ImpactRecord, 'id' | 'timestamp'>) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, displayLanguage, onComplete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stepImages, setStepImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [loadingSwap, setLoadingSwap] = useState<string | null>(null);
  const [isReading, setIsReading] = useState<number | null>(null);
  const [successPhoto, setSuccessPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [mode, setMode] = useState<'PREP' | 'GUIDE'>('PREP');

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (activity.instructions.original.length > 0) {
      setCompletedSteps(new Array(activity.instructions.original.length).fill(false));
    }
  }, [activity]);

  const content = {
    title: activity.title[displayLanguage],
    topic: activity.topic[displayLanguage],
    objective: activity.objective[displayLanguage],
    materials: activity.materials[displayLanguage],
    instructions: activity.instructions[displayLanguage],
    duration: activity.duration[displayLanguage],
    age: activity.ageAppropriateness[displayLanguage],
    parentKnowledge: activity.parentKnowledge[displayLanguage]
  };

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  const playNarration = async (text: string, index: number) => {
    if (isReading !== null) return;
    setIsReading(index);
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioCtxRef.current;
      const audioBytes = await generateSpeech(text);
      const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsReading(null);
      source.start();
    } catch (err) {
      console.error(err);
      setIsReading(null);
    }
  };

  const toggleStep = (index: number) => {
    setCompletedSteps(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const startGuiding = async () => {
    setMode('GUIDE');
    if (stepImages.length === 0 && !loadingImages) {
      setLoadingImages(true);
      try {
        const images = [];
        for (const prompt of activity.stepImagePrompts) {
          try {
            const imgUrl = await generateStepImage(prompt);
            images.push(imgUrl);
            setStepImages([...images]);
          } catch (e) {
            images.push(""); // Fallback empty string if generation fails
          }
        }
      } finally {
        setLoadingImages(false);
      }
    }
  };

  const handleSwap = async (item: string) => {
    if (swaps[item]) return;
    setLoadingSwap(item);
    try {
      const suggestion = await suggestMaterialAlternative(item, content.topic);
      setSwaps(prev => ({ ...prev, [item]: suggestion }));
    } finally {
      setLoadingSwap(null);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    setTimeout(async () => {
      if (videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          videoRef.current.srcObject = stream;
        } catch (e) {
          alert("Could not access camera.");
          setShowCamera(false);
        }
      }
    }, 100);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setSuccessPhoto(canvas.toDataURL('image/png'));
    
    // Stop tracks
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowCamera(false);
  };

  const finishMission = () => {
    const durationMatch = content.duration.match(/\d+/);
    const durationMinutes = durationMatch ? parseInt(durationMatch[0]) : 15;
    onComplete({
      activityTitle: content.title,
      topic: content.topic,
      photoUrl: successPhoto,
      durationMinutes
    });
    setIsExpanded(false);
  };

  const allDone = completedSteps.length > 0 && completedSteps.every(s => s);

  return (
    <>
      <div className="bg-white rounded-[3.5rem] shadow-xl shadow-blue-100/50 border border-slate-50 overflow-hidden hover:shadow-2xl hover:border-blue-400 transition-all duration-500 flex flex-col h-full group">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10">
          <div className="flex justify-between items-center mb-6">
            <span className="bg-white/10 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-2xl border border-white/10">
              {content.topic}
            </span>
            <div className="flex items-center space-x-2 text-white/80 text-[10px] font-black uppercase tracking-widest">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" /></svg>
              <span>{content.duration}</span>
            </div>
          </div>
          <h3 className="text-white text-3xl font-black leading-tight font-['Outfit'] group-hover:translate-x-1 transition-transform">{content.title}</h3>
        </div>
        
        <div className="p-10 space-y-8 flex-grow">
          <div className="bg-blue-50/40 rounded-[2.5rem] p-8 border border-blue-50">
            <h4 className="text-blue-800 font-black text-[9px] uppercase tracking-widest mb-3">Core Objective</h4>
            <p className="text-blue-900 text-lg leading-relaxed font-semibold">{content.objective}</p>
          </div>

          <div>
            <h4 className="text-slate-900 font-black text-[9px] uppercase tracking-widest mb-5">Parent Prep Checklist</h4>
            <div className="flex flex-wrap gap-2.5">
              {content.materials.slice(0, 5).map((item, idx) => (
                <span key={idx} className="bg-white text-slate-500 text-[10px] font-bold px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm">{item}</span>
              ))}
              {content.materials.length > 5 && <span className="text-blue-600 text-[10px] font-black pt-2.5">+{content.materials.length - 5} more</span>}
            </div>
          </div>
        </div>

        <div className="px-10 py-10 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between mt-auto">
          <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{content.age} Target</span>
          <button onClick={() => setIsExpanded(true)} className="bg-slate-900 text-white text-[11px] font-black px-10 py-5 rounded-2xl hover:bg-blue-600 shadow-xl shadow-slate-200 hover:shadow-blue-300 transition-all uppercase tracking-[0.1em] flex items-center group/btn">
            OPEN HANDBOOK
            <svg className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-6xl h-full max-h-[94vh] rounded-[4.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
            
            <div className="w-full md:w-96 bg-slate-50 border-r border-slate-100 flex flex-col h-full">
               <div className="p-12 pb-0">
                  <button 
                      onClick={() => setIsExpanded(false)}
                      className="mb-12 flex items-center text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors group"
                    >
                      <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Mission Selector
                  </button>

                  <div className="mb-12">
                      <div className="flex items-center space-x-2 mb-4">
                         <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                         <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active Handbook</span>
                      </div>
                      <h3 className="text-3xl font-black text-slate-900 font-['Outfit'] leading-tight">{content.title}</h3>
                  </div>
               </div>

               <div className="flex-grow overflow-y-auto px-12 pb-12 space-y-5 custom-scrollbar">
                  <button onClick={() => setMode('PREP')} className={`w-full text-left px-8 py-7 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'PREP' ? 'bg-white shadow-2xl text-blue-600 border border-blue-100 ring-1 ring-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
                    1. Private Prep
                  </button>
                  <button onClick={startGuiding} className={`w-full text-left px-8 py-7 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'GUIDE' ? 'bg-white shadow-2xl text-blue-600 border border-blue-100 ring-1 ring-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
                    2. Shared Mission
                  </button>
               </div>

               <div className="p-12 border-t border-slate-100">
                  <button onClick={() => setIsExpanded(false)} className="flex items-center text-slate-300 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" /></svg>
                      Close Handbook
                  </button>
               </div>
            </div>

            <div className="flex-grow overflow-y-auto bg-white p-10 md:p-24 h-full custom-scrollbar">
               {mode === 'PREP' ? (
                 <div className="space-y-20 animate-in slide-in-from-right-12 duration-700">
                    <div className="max-w-2xl">
                       <h2 className="text-6xl font-black text-blue-900 mb-8 font-['Outfit']">Prepare to Lead.</h2>
                       <p className="text-2xl text-slate-500 font-medium leading-relaxed">TeachWell helps you guide with calm. Master these essentials before you begin.</p>
                    </div>

                    <div className="bg-blue-50/40 rounded-[4rem] p-16 border border-blue-50 shadow-inner">
                       <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-12 flex items-center">
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" strokeWidth="3"/></svg>
                          Mission Checklist
                       </h4>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          {content.materials.map((item, idx) => (
                             <div key={idx} className="flex items-center space-x-4">
                                <button 
                                  onClick={() => handleSwap(item)} 
                                  className={`flex-grow text-left p-8 rounded-[2.5rem] border-2 transition-all font-black text-sm relative group/swap ${swaps[item] ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-xl' : 'border-white bg-white text-slate-600 hover:border-blue-100 shadow-sm'}`}
                                >
                                   {swaps[item] ? (
                                      <div className="flex flex-col">
                                         <span className="text-[9px] uppercase tracking-widest text-blue-400 mb-1">Alternative:</span>
                                         {swaps[item]}
                                      </div>
                                   ) : item}
                                   {loadingSwap === item && <span className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>}
                                   {!swaps[item] && !loadingSwap && (
                                     <svg className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-hover/swap:text-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2.5"/></svg>
                                   )}
                                </button>
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[4.5rem] p-20 text-white shadow-3xl relative overflow-hidden group/card">
                       <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover/card:scale-125 transition-transform duration-1000"></div>
                       <div className="flex items-center space-x-6 mb-10">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-inner">
                             <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0012 18.75c-1.03 0-1.9-.4-2.593-1.003l-.547-.547z" strokeWidth="2.5" /></svg>
                          </div>
                          <h4 className="text-4xl font-black font-['Outfit']">Intentional Insight</h4>
                       </div>
                       <p className="text-2xl font-medium leading-[1.6] mb-14 opacity-90">{content.parentKnowledge}</p>
                       <button onClick={startGuiding} className="bg-white text-blue-600 px-14 py-7 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-slate-900 hover:text-white transition-all shadow-2xl active:scale-95">Begin The Shared Mission</button>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-24 animate-in slide-in-from-right-12 duration-700 pb-20">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-12">
                       <div className="flex items-center space-x-8">
                          <button 
                            onClick={() => setMode('PREP')}
                            className="w-16 h-16 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
                          >
                             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <div>
                            <h2 className="text-5xl font-black text-blue-900 font-['Outfit']">Mission Start.</h2>
                            <p className="text-[12px] font-black text-slate-300 uppercase tracking-[0.4em]">{content.topic} &bull; {content.duration}</p>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-48">
                       {content.instructions.map((step, idx) => (
                         <div key={idx} className="flex flex-col xl:flex-row gap-24 group">
                            <div className="w-full xl:w-[45%]">
                               <div className="relative aspect-square bg-slate-50 rounded-[4.5rem] overflow-hidden border border-slate-100 shadow-3xl group-hover:scale-[1.03] transition-transform duration-1000">
                                  {stepImages[idx] ? (
                                    <img src={stepImages[idx]} className={`w-full h-full object-cover transition-all duration-1000 ${completedSteps[idx] ? 'opacity-20 grayscale scale-110 blur-sm' : ''}`} />
                                  ) : (
                                    <div className="flex flex-col items-center justify-center h-full space-y-6">
                                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Designing Your Vision...</span>
                                    </div>
                                  )}
                                  <div className={`absolute top-12 left-12 w-20 h-20 rounded-[1.7rem] flex items-center justify-center font-black text-3xl shadow-2xl transition-all duration-700 ${completedSteps[idx] ? 'bg-green-500 text-white rotate-[360deg] scale-110' : 'bg-slate-900 text-white'}`}>
                                     {completedSteps[idx] ? '✓' : idx + 1}
                                  </div>
                               </div>
                            </div>
                            <div className="w-full xl:w-[55%] flex flex-col justify-center">
                               <div className="flex items-center space-x-4 mb-10">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                  <span className="text-blue-600 font-black text-[14px] uppercase tracking-[0.2em]">Step {idx + 1}: The Guide's Script</span>
                               </div>
                               <h3 className={`text-4xl sm:text-5xl font-bold leading-[1.5] mb-16 transition-all duration-700 ${completedSteps[idx] ? 'text-slate-100 line-through scale-95 opacity-50' : 'text-slate-800'}`}>{step}</h3>
                               <div className="flex items-center space-x-8">
                                  <button onClick={() => playNarration(step, idx)} className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-3xl transition-all hover:scale-110 active:scale-90 ${isReading === idx ? 'bg-blue-600 text-white ring-[12px] ring-blue-50' : 'bg-white text-slate-700 border border-slate-100 hover:bg-slate-50'}`}>
                                     {isReading === idx ? (
                                        <div className="flex items-end space-x-1">
                                           <div className="w-1.5 h-6 bg-white rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                                           <div className="w-1.5 h-10 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                           <div className="w-1.5 h-8 bg-white rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                        </div>
                                     ) : (
                                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.647-3.676a1 1 0 011.15-.248zM11 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" /></svg>
                                     )}
                                  </button>
                                  <button onClick={() => toggleStep(idx)} className={`px-14 h-20 rounded-[2rem] font-black text-[12px] uppercase tracking-widest transition-all active:scale-95 shadow-2xl ${completedSteps[idx] ? 'bg-green-500 text-white shadow-green-100' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-100'}`}>
                                     {completedSteps[idx] ? 'Mission Step Complete' : 'Mark Step Done'}
                                  </button>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>

                    {allDone && (
                      <div className="mt-48 bg-slate-900 rounded-[5.5rem] p-24 text-center text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden border border-white/5 animate-in zoom-in-95 duration-1000">
                         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full -mr-48 -mt-48 blur-3xl animate-pulse"></div>
                         <div className="relative z-10 max-w-3xl mx-auto">
                            <h4 className="text-7xl font-black mb-10 font-['Outfit'] tracking-tight">Legacy Achieved 🎉</h4>
                            <p className="text-2xl opacity-70 mb-20 leading-relaxed font-medium">You have led with intention. Capture this moment to build your child's Learning Legacy.</p>
                            
                            {!successPhoto && !showCamera ? (
                               <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                                  <button onClick={startCamera} className="bg-blue-600 text-white px-16 py-8 rounded-[2.5rem] font-black uppercase tracking-widest text-sm hover:scale-105 hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/30">Capture Legacy Photo</button>
                                  <button onClick={finishMission} className="px-16 py-8 rounded-[2.5rem] font-black uppercase tracking-widest text-sm border-2 border-white/20 hover:bg-white/10 transition-all">Skip for Now</button>
                               </div>
                            ) : showCamera ? (
                               <div className="space-y-16">
                                  <div className="relative max-w-2xl mx-auto group/cam">
                                     <video ref={videoRef} autoPlay playsInline className="w-full aspect-[4/3] object-cover rounded-[5rem] border-[16px] border-white/5 shadow-3xl" />
                                     <div className="absolute inset-0 border-2 border-white/20 rounded-[5rem] pointer-events-none"></div>
                                     <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover/cam:opacity-100 transition-opacity rounded-[5rem] pointer-events-none"></div>
                                  </div>
                                  <div className="flex items-center justify-center space-x-12">
                                     <button onClick={() => setShowCamera(false)} className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-all active:scale-90">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
                                     </button>
                                     <button onClick={takePhoto} className="group w-32 h-32 bg-white rounded-full border-[10px] border-blue-600 shadow-3xl flex items-center justify-center active:scale-90 transition-all">
                                       <div className="w-20 h-20 border-4 border-slate-200 rounded-full group-hover:border-blue-500 transition-colors"></div>
                                     </button>
                                     <div className="w-20 h-20"></div>
                                  </div>
                               </div>
                            ) : (
                               <div className="space-y-20 animate-in zoom-in duration-700">
                                  <div className="relative inline-block group">
                                    <img src={successPhoto!} className="w-full max-w-2xl mx-auto rounded-[5rem] border-[20px] border-white shadow-[0_60px_120px_-20px_rgba(0,0,0,0.7)] rotate-3 group-hover:rotate-0 transition-transform duration-700" />
                                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-blue-500 rounded-3xl flex items-center justify-center font-black text-5xl rotate-12 shadow-3xl text-white animate-bounce">✓</div>
                                  </div>
                                  <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                                    <button onClick={() => setSuccessPhoto(null)} className="px-12 py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs border-2 border-white/20 hover:bg-white/10 transition-all opacity-60 hover:opacity-100">Retake Photo</button>
                                    <button onClick={finishMission} className="bg-emerald-500 text-white px-20 py-8 rounded-[2.5rem] font-black uppercase tracking-widest text-sm hover:bg-emerald-600 shadow-3xl shadow-emerald-500/40 active:scale-95 transition-all">Save to Wellness Journal</button>
                                  </div>
                               </div>
                            )}
                         </div>
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3b82f6;
        }
      `}</style>
    </>
  );
};

export default ActivityCard;
