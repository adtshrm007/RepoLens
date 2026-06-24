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
    <section ref={container} className="w-full pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center">
      {/* Tagline */}
      <div className="hero-element mb-6 border border-white/20 rounded-full px-4 py-1 text-[10px] font-mono tracking-widest text-white/70 uppercase">
        AI-Powered Code Analysis & Documentation
      </div>

      {/* Headline */}
      <h1 className="hero-element max-w-4xl text-5xl md:text-6xl lg:text-6xl font-mono font-bold tracking-tight text-white mb-8 leading-tight">
        UNDERSTAND ANY REPOSITORY<br />LIKE A<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">SENIOR ENGINEER</span>
      </h1>

      {/* Description */}
      <p className="hero-element max-w-2xl text-sm md:text-base font-mono text-white/60 mb-12 uppercase tracking-widest leading-relaxed">
        Connect your GitHub, select files, and let AI analyze your code for bugs, security risks, and structural issues. Automatically generate technical documentation as you scan.
      </p>

      {/* Buttons */}
      <div className="hero-element flex flex-col sm:flex-row items-center gap-4">
        <Link to="/auth" className="w-full sm:w-auto bg-white text-black text-xs font-mono font-bold tracking-widest px-8 py-4 hover:bg-white/90 transition-colors text-center inline-block">
          GET STARTED
        </Link>
        <Link to="/explorer" className="w-full sm:w-auto bg-transparent border border-white/20 text-white text-xs font-mono font-bold tracking-widest px-8 py-4 hover:bg-white/5 transition-colors text-center inline-block">
          TRY EXPLORER
        </Link>
      </div>
    </section>
  );
}
