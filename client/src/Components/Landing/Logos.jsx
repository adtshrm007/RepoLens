export default function Logos() {
  return (
    <section className="w-full py-16 px-6 border-y border-white/5 flex flex-col items-center">
      <div className="text-[10px] font-mono tracking-widest text-white/40 mb-10 uppercase">
        BUILT FOR MODERN ENGINEERING TEAMS.
      </div>
      
      <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
        <div className="flex items-center gap-2 font-mono text-sm tracking-wider text-white">
          <span className="text-xl">🐙</span> GITHUB
        </div>
        <div className="flex items-center gap-2 font-mono text-sm tracking-wider text-white">
          <span className="text-xl">▲</span> NEXT.JS
        </div>
        <div className="flex items-center gap-2 font-mono text-sm tracking-wider text-white">
          <span className="text-xl">⚡</span> SUPABASE
        </div>
        <div className="flex items-center gap-2 font-mono text-sm tracking-wider text-white">
          <span className="text-xl">💳</span> STRIPE
        </div>
        <div className="flex items-center gap-2 font-mono text-sm tracking-wider text-white">
          <span className="text-xl">🌊</span> TAILWIND
        </div>
        <div className="flex items-center gap-2 font-mono text-sm tracking-wider text-white">
          <span className="text-xl">☁️</span> VERCEL
        </div>
      </div>
    </section>
  );
}
