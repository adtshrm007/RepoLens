import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Link } from 'react-router-dom';

export default function Hero() {
  const container = useRef(null);

  useGSAP(() => {
    gsap.from('.hero-element', {
      y: 50,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      ease: 'power3.out',
      delay: 0.2
    });
  }, { scope: container });
  return (
    <section ref={container} className="relative w-full pt-40 pb-24 px-6 flex flex-col items-center justify-center text-center overflow-visible">
      
      {/* Floating decorative elements */}
      <div className="hero-element absolute top-20 left-[15%] hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
        <span className="text-[9px] font-mono text-white/60 tracking-widest">AST_PARSER_ACTIVE</span>
      </div>
      <div className="hero-element absolute top-32 right-[15%] hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md">
        <span className="text-[9px] font-mono text-white/60 tracking-widest">LLM_READY</span>
        <span className="text-white text-[10px]">✨</span>
      </div>

      {/* Tagline */}
      <div className="hero-element relative mb-8 group cursor-default">
        <div className="absolute inset-0 bg-white blur-md opacity-5 group-hover:opacity-10 transition-opacity duration-500 rounded-full"></div>
        <div className="relative border border-white/30 rounded-full px-5 py-1.5 text-[10px] font-mono tracking-[0.2em] text-white uppercase bg-black/80 backdrop-blur-sm">
          INSTANTLY AUDIT DEPENDENCIES AND HEALTH
        </div>
      </div>

      {/* Headline */}
      <h1 className="hero-element max-w-5xl text-5xl md:text-7xl lg:text-[5rem] font-mono font-black tracking-tighter text-white mb-8 leading-[1.1]">
        SEE THROUGH<br />YOUR<br />
        <span className="relative inline-block">
          <span className="absolute -inset-1 blur-2xl bg-white opacity-10"></span>
          <span className="relative text-white">SOURCE CODE</span>
        </span>
      </h1>

      {/* Description */}
      <p className="hero-element max-w-2xl text-sm md:text-base font-mono text-white/60 mb-14 uppercase tracking-widest leading-relaxed">
        Connect your GitHub to map dependency graphs, track explainable health metrics over time, audit security vulnerabilities, and chat directly with an AI assistant that understands your entire codebase.
      </p>

      {/* Buttons */}
      <div className="hero-element flex flex-col sm:flex-row items-center gap-6">
        <Link to="/auth" className="group relative inline-flex items-center justify-center px-8 py-4 font-mono font-bold text-xs tracking-[0.2em] text-black overflow-hidden rounded-sm transition-all hover:scale-105 active:scale-95 bg-white">
          <span className="absolute inset-0 w-full h-full shadow-[0_0_40px_rgba(255,255,255,0.2)] group-hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-shadow"></span>
          <span className="relative z-10 flex items-center gap-2">
            GET STARTED <span className="text-[10px] group-hover:translate-x-1 transition-transform">→</span>
          </span>
        </Link>
        <Link to="/explorer" className="group relative inline-flex items-center justify-center px-8 py-4 font-mono font-bold text-xs tracking-[0.2em] text-white overflow-hidden rounded-sm border border-white/20 bg-white/[0.03] backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/40">
          <span className="relative z-10">
            TRY EXPLORER
          </span>
        </Link>
      </div>
    </section>
  );
}
