
import React from 'react';
import { StudySession } from '../types';

interface StudyCornerProps {
  session: StudySession;
  onBack: () => void;
}

const StudyCorner: React.FC<StudyCornerProps> = ({ session, onBack }) => {
  const videoMaterials = session.materials.filter(m => m.type === 'video');
  const audioMaterials = session.materials.filter(m => m.type === 'audio');

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-right-8 duration-700">
      <button onClick={onBack} className="mb-10 flex items-center text-blue-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors group">
        <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to Handbook
      </button>

      <div className="bg-white rounded-[4.5rem] shadow-3xl shadow-blue-100/50 border border-blue-50 overflow-hidden mb-12">
        <div className="bg-gradient-to-br from-blue-700 to-indigo-900 p-16 text-white relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl animate-pulse"></div>
          <div className="relative z-10">
            <span className="bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] px-5 py-2 rounded-full border border-white/10 mb-6 inline-block">Prep Mode</span>
            <h2 className="text-5xl sm:text-6xl font-black mb-6 font-['Outfit'] tracking-tight">Parent's Study Lounge</h2>
            <p className="text-blue-100 text-xl font-medium max-w-2xl leading-relaxed">Distilled insights and curated media to help you lead your child's mission with absolute clarity.</p>
          </div>
        </div>
        
        <div className="p-10 sm:p-24 space-y-24">
          <section>
            <div className="flex items-center space-x-5 mb-12">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                 <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="3"/></svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-blue-900 font-['Outfit'] tracking-tight">Core Curriculum Insights</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">TeachWell Distillation</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {session.summary.map((point, i) => (
                <div key={i} className="flex items-start space-x-8 bg-blue-50/20 p-10 rounded-[3rem] border border-blue-50 hover:bg-white hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-50 transition-all group">
                  <div className="flex-shrink-0 w-14 h-14 rounded-[1.5rem] bg-white text-blue-600 border border-blue-100 flex items-center justify-center font-black text-lg shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {i + 1}
                  </div>
                  <p className="text-slate-700 leading-relaxed font-semibold text-lg flex-grow pt-2">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 border-t border-slate-100 pt-24">
            <div className="space-y-10">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-inner">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M10 15.5l6-3.5-6-3.5v7zM21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">Visual Missions</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Grounding Videos</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5">
                {videoMaterials.length > 0 ? videoMaterials.map((item, idx) => (
                  <a 
                    key={idx} 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center space-x-6 group p-8 bg-white border border-slate-100 rounded-[3rem] hover:border-red-400 hover:shadow-2xl transition-all"
                  >
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 group-hover:bg-red-500 group-hover:text-white transition-all shadow-inner">
                      <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24"><path d="M10 15.5l6-3.5-6-3.5v7zM21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-red-600 transition-colors mb-2 text-lg leading-tight">{item.title}</h4>
                      <div className="flex items-center text-[10px] font-black uppercase text-slate-400 tracking-widest group-hover:text-red-400">
                         View Shared Resource
                         <svg className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2.5"/></svg>
                      </div>
                    </div>
                  </a>
                )) : <div className="p-8 bg-slate-50 rounded-[2.5rem] text-slate-400 font-medium italic">Preparing Video Deep Dives...</div>}
              </div>
            </div>

            <div className="space-y-10">
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shadow-inner">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">Audio Insights</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Grounding Pods</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5">
                {audioMaterials.length > 0 ? audioMaterials.map((item, idx) => (
                  <a 
                    key={idx} 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center space-x-6 group p-8 bg-white border border-slate-100 rounded-[3rem] hover:border-indigo-400 hover:shadow-2xl transition-all"
                  >
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-inner">
                      <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mb-2 text-lg leading-tight">{item.title}</h4>
                      <div className="flex items-center text-[10px] font-black uppercase text-slate-400 tracking-widest group-hover:text-indigo-400">
                         Listen to Context
                         <svg className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2.5"/></svg>
                      </div>
                    </div>
                  </a>
                )) : <div className="p-8 bg-slate-50 rounded-[2.5rem] text-slate-400 font-medium italic">Curating Audio Exploration...</div>}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StudyCorner;
