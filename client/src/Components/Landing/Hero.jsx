export default function Hero() {
  return (
    <section className="w-full pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center">
      {/* Tagline */}
      <div className="mb-6 border border-white/20 rounded-full px-4 py-1 text-[10px] font-mono tracking-widest text-white/70 uppercase">
        AI-Powered Repository Intelligence
      </div>

      {/* Headline */}
      <h1 className="max-w-4xl text-5xl md:text-6xl lg:text-7xl font-mono font-bold tracking-tight text-white mb-8 leading-tight">
        UNDERSTAND YOUR CODEBASE<br />LIKE A<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">SENIOR ENGINEER</span>
      </h1>

      {/* Description */}
      <p className="max-w-2xl text-sm md:text-base font-mono text-white/60 mb-12 uppercase tracking-widest leading-relaxed">
        Analyze dependencies, detect security issues, review code quality, generate documentation, and understand architecture with AI.
      </p>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button className="w-full sm:w-auto bg-white text-black text-xs font-mono font-bold tracking-widest px-8 py-4 hover:bg-white/90 transition-colors">
          CONNECT GITHUB
        </button>
        <button className="w-full sm:w-auto bg-transparent border border-white/20 text-white text-xs font-mono font-bold tracking-widest px-8 py-4 hover:bg-white/5 transition-colors">
          VIEW DEMO
        </button>
      </div>
    </section>
  );
}
