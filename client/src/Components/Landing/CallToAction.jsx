export default function CallToAction() {
  return (
    <section className="w-full px-6 py-24">
      <div className="max-w-5xl mx-auto bg-white text-black py-24 px-6 flex flex-col items-center text-center shadow-2xl">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-mono font-bold tracking-tight mb-6 uppercase">
          STOP GUESSING.<br />
          <span className="border-b-4 border-black pb-2">UNDERSTAND YOUR REPOSITORY.</span>
        </h2>
        
        <p className="text-xs font-mono tracking-widest text-black/60 uppercase mb-12 max-w-lg">
          JOIN OVER 10,000 ENGINEERING TEAMS SHAPING THE FUTURE OF SOFTWARE.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button className="w-full sm:w-auto bg-black text-white text-xs font-mono font-bold tracking-widest px-8 py-4 hover:bg-black/90 transition-colors flex items-center justify-center gap-2">
            <span>🐙</span> CONNECT GITHUB
          </button>
          <button className="w-full sm:w-auto bg-transparent border border-black/20 text-black text-xs font-mono font-bold tracking-widest px-8 py-4 hover:bg-black/5 transition-colors flex items-center justify-center gap-2">
            <span>📁</span> UPLOAD CODE FILE
          </button>
        </div>
      </div>
    </section>
  );
}
