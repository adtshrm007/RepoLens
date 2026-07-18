export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 pt-20 pb-10 px-6 bg-[#050505]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
        
        {/* Brand */}
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 bg-white text-black flex items-center justify-center font-bold text-[10px]">
              1
            </div>
            <span className="text-white font-mono font-bold tracking-widest text-xs">REPOLENS</span>
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
              <li><a href="#features" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">CODE REVIEW</a></li>
              <li><a href="#features" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">SECURITY SHIELD</a></li>
              <li><a href="#features" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">DOC GENERATOR</a></li>
              <li><a href="#features" className="text-white/50 hover:text-white transition-colors text-[10px] font-mono tracking-widest uppercase">API ACCESS</a></li>
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
          © 2026 REPOLENS AI PLATFORM. UNIVERSAL ENGINEERING.
        </div>
        <div className="flex items-center gap-6 text-[10px] font-mono text-white/30 uppercase tracking-widest">
          <a href="#" className="hover:text-white/70 transition-colors">PRIVACY POLICY</a>
          <a href="#" className="hover:text-white/70 transition-colors">TERMS OF SERVICE</a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white/70 transition-colors">SYSTEM STATUS</a>
        </div>
      </div>
    </footer>
  );
}
