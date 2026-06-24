import { Link } from 'react-router-dom';

export default function CallToAction() {
  return (
    <section className="w-full px-6 py-24 relative z-10 border-t border-white/10">
      <div className="max-w-4xl mx-auto py-16 flex flex-col items-center text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-mono font-bold tracking-tight text-white mb-8 leading-tight">
          STOP GUESSING.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">UNDERSTAND YOUR REPOSITORY.</span>
        </h2>
        
        <div className="mb-12 border-l-2 border-white/50 pl-4">
          <p className="text-xs font-mono text-white/50 tracking-widest uppercase max-w-lg text-left leading-relaxed">
            JOIN OVER 10,000 ENGINEERING TEAMS SHAPING THE FUTURE OF SOFTWARE.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link to="/auth" className="w-full sm:w-auto bg-white text-black text-xs font-mono font-bold tracking-widest px-8 py-4 hover:bg-white/90 transition-colors text-center inline-block">
            GET STARTED
          </Link>
          <Link to="/explorer" className="w-full sm:w-auto bg-transparent border border-white/20 text-white text-xs font-mono font-bold tracking-widest px-8 py-4 hover:bg-white/5 transition-colors text-center inline-block">
            TRY EXPLORER
          </Link>
        </div>
      </div>
    </section>
  );
}
