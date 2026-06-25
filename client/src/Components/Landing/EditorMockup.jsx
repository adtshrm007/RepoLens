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

          {/* Tabs */}
          <div className="mockup-element flex items-center gap-1 overflow-x-auto mb-6 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="px-4 py-2 border-b-2 border-[#8b5cf6] text-[#8b5cf6] font-mono font-bold text-[10px] tracking-widest bg-white/[0.02]">
              OVERVIEW & HEALTH
            </div>
            <div className="px-4 py-2 text-white/30 font-mono font-bold text-[10px] tracking-widest">
              COMPLEXITY METRICS
            </div>
            <div className="px-4 py-2 text-white/30 font-mono font-bold text-[10px] tracking-widest">
              SECURITY FINDINGS
            </div>
            <div className="px-4 py-2 text-white/30 font-mono font-bold text-[10px] tracking-widest">
              ARCHITECTURE GRAPH
            </div>
          </div>

          <div className="flex flex-col h-full gap-6">
            
            {/* AI Summary Box */}
            <div className="mockup-element p-5 border border-purple-500/40 bg-purple-500/5 relative shadow-[0_4px_20px_rgba(0,0,0,0.2)] border-l-4 border-l-purple-500">
              <div className="font-mono text-[11px] text-purple-500 tracking-[0.2em] uppercase mb-2 font-bold">
                ◆ WHAT EXACTLY THIS REPOSITORY DOES
              </div>
              <p className="font-sans text-[13px] text-white/90 leading-relaxed">
                RepoLens is a powerful AI-driven static analysis engine and code documentation generator. Under the hood, it utilizes a modular architecture to scan abstract syntax trees (AST), map dependency graphs, and identify dead code or security vulnerabilities like XSS. The backend orchestrates these pipelines seamlessly before rendering a comprehensive visual dashboard.
              </p>
            </div>

            {/* Health Scores */}
            <div className="mockup-element flex flex-wrap justify-between md:justify-start gap-8 p-6 rounded-lg border border-white/5 bg-white/[0.02] shadow-inner">
              <MockScoreRing value={92} label="Overall" color="#22c55e" />
              <MockScoreRing value={85} label="Maintain" color="#60a5fa" />
              <MockScoreRing value={100} label="Security" color="#10b981" />
              <MockScoreRing value={88} label="Arch" color="#f59e0b" />
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
