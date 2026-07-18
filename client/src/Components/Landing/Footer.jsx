import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 pt-20 pb-10 px-6 bg-[#050505]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
        
        {/* Brand */}
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 bg-white text-black flex items-center justify-center font-bold text-[10px]">
              ◈
            </div>
            <span className="text-white font-mono font-bold tracking-widest text-xs">CODEATLAS</span>
          </div>
          <p className="text-[10px] font-mono text-white/50 leading-relaxed uppercase tracking-widest max-w-[200px]">
            THE NEXT GENERATION OF REPOSITORY INTELLIGENCE. UNDERSTAND THE ARCHITECTURE, INSIGHTS, AND FIXES INSTANTLY.
          </p>
        </div>

        {/* Links */}
        <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-white font-mono font-bold text-[10px] tracking-widest uppercase mb-6">PRODUCT</h4>
            <ul className="space-y-4">
              <li><Link to="/explorer" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">CODE EXPLORER</Link></li>
              <li><Link to="/repositories" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">REPOSITORIES</Link></li>
              <li><Link to="/analysis" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">ANALYSIS HISTORY</Link></li>
              <li><Link to="/compare" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">COMPARE SCANS</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-mono font-bold text-[10px] tracking-widest uppercase mb-6">RESOURCES</h4>
            <ul className="space-y-4">
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">DOCUMENTATION</a></li>
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">API REFERENCE</a></li>
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">CHANGELOG</a></li>
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">COMMUNITY</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-mono font-bold text-[10px] tracking-widest uppercase mb-6">COMPANY</h4>
            <ul className="space-y-4">
              <li><a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">X / TWITTER</a></li>
              <li><a href="https://discord.com" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">DISCORD</a></li>
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">GITHUB</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">LINKEDIN</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/5 pt-6">
        <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
          © 2026 CODEATLAS AI PLATFORM. UNIVERSAL ENGINEERING.
        </div>
        <div className="flex items-center gap-6 text-[10px] font-mono text-white/30 uppercase tracking-widest">
          <Link to="/auth" className="hover:text-white/70 transition-colors">PRIVACY POLICY</Link>
          <Link to="/auth" className="hover:text-white/70 transition-colors">TERMS OF SERVICE</Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white/70 transition-colors">SYSTEM STATUS</a>
        </div>
      </div>
    </footer>
  );
}
