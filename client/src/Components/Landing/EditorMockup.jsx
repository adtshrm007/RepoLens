import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

function MockScoreRing({ value, label, color }) {
  const [fillValue, setFillValue] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setFillValue(value), 500);
    return () => clearTimeout(timer);
  }, [value]);

  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = (fillValue / 100) * circ;
  
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="72" height="72" viewBox="0 0 72 72" className="drop-shadow-lg">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: "stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
        <text x="36" y="41" textAnchor="middle" fill="#fff" fontSize="16" fontFamily="monospace" fontWeight="700">
          {fillValue}
        </text>
      </svg>
      <span className="font-mono text-[9px] text-white/40 tracking-[0.15em] uppercase">
        {label}
      </span>
    </div>
  );
}

export default function EditorMockup() {
  const container = useRef(null);

  useGSAP(() => {
    gsap.from('.editor-window', {
      scrollTrigger: {
        trigger: container.current,
        start: 'top 85%',
      },
      y: 100,
      opacity: 0,
      scale: 0.95,
      duration: 1.2,
      ease: 'power3.out'
    });

    gsap.from('.mockup-element', {
      scrollTrigger: {
        trigger: container.current,
        start: 'top 75%',
      },
      y: 20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power2.out',
      delay: 0.3
    });
  }, { scope: container });

  return (
    <section ref={container} className="w-full px-6 flex justify-center mb-32 perspective-[1200px]">
      <div className="editor-window w-full max-w-5xl border border-white/10 rounded-xl overflow-hidden bg-[#0a0a0c] shadow-[0_0_80px_rgba(139,92,246,0.07)] backdrop-blur-xl">
        
        {/* Window Header */}
        <div className="h-12 border-b border-white/5 flex items-center justify-between px-5 bg-gradient-to-r from-white/[0.03] to-transparent">
          <div className="flex gap-2.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 transition-colors"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 transition-colors"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 transition-colors"></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/30 tracking-[0.2em]">REPOLENS_ANALYSIS_ENGINE</span>
          </div>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>

        {/* Dashboard Body */}
        <div className="flex flex-col h-auto md:h-[520px] p-8 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/[0.02] via-transparent to-transparent">
          
          {/* Header Area */}
          <div className="mockup-element flex justify-between items-start mb-8 pb-6 border-b border-white/5">
            <div>
               <div className="flex items-center gap-3 mb-2">
                 <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase hover:text-white/70 transition-colors cursor-pointer">← LOG</span>
                 <span className="text-white/10">/</span>
                 <h2 className="font-mono font-bold text-sm text-white/90 tracking-wider">Job ID: 8a7b6c5d</h2>
               </div>
               <p className="font-mono text-xs text-white/40">Target: <span className="text-white/80 border-b border-white/20 pb-0.5">facebook/react</span></p>
            </div>
            <div className="text-[9px] font-mono tracking-widest uppercase px-3 py-1.5 rounded-sm border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              COMPLETED
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 h-full">
            
            {/* Left Column */}
            <div className="flex flex-col gap-6 w-full md:w-[320px] shrink-0">
              
              {/* Score Rings */}
              <div className="mockup-element flex justify-center gap-8 p-6 rounded-lg border border-white/5 bg-white/[0.01] shadow-inner">
                <MockScoreRing value={78} label="Health Score" color="#eab308" />
                <MockScoreRing value={85} label="Maintainability" color="#22c55e" />
              </div>

              {/* Severity Pills Grid */}
              <div className="mockup-element grid grid-cols-2 gap-3">
                 {[
                   { label: 'CRITICAL', count: 0, color: 'text-white/30', border: 'border-white/5', bg: 'bg-white/[0.01]' },
                   { label: 'HIGH', count: 2, color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/10' },
                   { label: 'MEDIUM', count: 5, color: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/10' },
                   { label: 'LOW', count: 12, color: 'text-white/50', border: 'border-white/5', bg: 'bg-white/[0.02]' }
                 ].map(sev => (
                   <div key={sev.label} className={`p-4 rounded-md border ${sev.border} ${sev.bg} flex flex-col gap-1.5 transition-transform hover:-translate-y-0.5 duration-300`}>
                      <span className={`font-mono text-[9px] tracking-widest uppercase ${sev.color}`}>{sev.label}</span>
                      <span className={`font-mono text-2xl font-bold ${sev.color}`}>{sev.count}</span>
                   </div>
                 ))}
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6 flex-1 min-w-0">
              
              {/* AI Summary Box */}
              <div className="mockup-element p-5 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 shadow-[0_0_10px_#a855f7]"></div>
                <div className="font-mono text-[10px] text-purple-400 tracking-[0.2em] uppercase mb-3 flex items-center gap-2">
                  <span className="animate-pulse">◆</span> AI Summary
                </div>
                <p className="font-sans text-[13px] text-white/70 leading-relaxed group-hover:text-white/90 transition-colors">
                  The repository demonstrates solid architectural patterns, but several security vulnerabilities and maintainability issues were found in the core rendering engine. Strict mode violations detected.
                </p>
              </div>

              {/* Finding Card Mockup */}
              <div className="mockup-element flex-1 rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent p-5 relative overflow-hidden group hover:border-orange-500/40 transition-colors cursor-pointer">
                 <div className="flex items-center gap-3 mb-4">
                   <span className="font-mono text-[9px] bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-sm tracking-widest font-bold">HIGH</span>
                   <span className="font-mono text-[10px] text-white/40 tracking-widest">SECURITY</span>
                 </div>
                 
                 <h3 className="font-sans font-bold text-[15px] text-white/90 mb-2 group-hover:text-white transition-colors truncate">
                   Potential XSS vulnerability in dangerouslySetInnerHTML
                 </h3>
                 
                 <p className="font-sans text-[13px] text-white/60 mb-4 line-clamp-2">
                   User input is being passed directly into dangerouslySetInnerHTML without prior DOMPurify sanitization. This exposes the application to Cross-Site Scripting.
                 </p>
                 
                 <div className="absolute bottom-5 left-5 right-5">
                   <div className="font-mono text-[10px] text-white/50 bg-black/40 p-2.5 rounded border border-white/5 truncate flex items-center justify-between">
                      <span className="truncate mr-2">packages/react-dom/src/client/ReactDOMHostConfig.js</span>
                      <span className="text-orange-400/80 shrink-0">Line 452</span>
                   </div>
                 </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
