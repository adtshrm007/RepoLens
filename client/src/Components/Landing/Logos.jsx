import React from 'react';

export default function Logos() {
  return (
    <section className="w-full py-12 border-y border-white/5 overflow-hidden flex items-center bg-black/20">
      <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite] group-hover:[animation-play-state:paused]">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center gap-12 px-6">
            <span className="text-sm font-mono tracking-[0.2em] text-white/50 uppercase">
              REPOLENS • UNIFIED INTELLIGENCE WORKFLOW • AI-POWERED REPOSITORY INTELLIGENCE • AUTOMATED ARCHITECTURE INSIGHTS • PROFESSIONAL GRADE TOOLS • 
            </span>
            <span className="text-sm font-mono tracking-[0.2em] text-white/50 uppercase">
              REPOLENS • UNIFIED INTELLIGENCE WORKFLOW • AI-POWERED REPOSITORY INTELLIGENCE • AUTOMATED ARCHITECTURE INSIGHTS • PROFESSIONAL GRADE TOOLS •
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
