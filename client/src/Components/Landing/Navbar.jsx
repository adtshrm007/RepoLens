import logo from "../../assets/RepoLensLogo.svg"
export default function Navbar() {
  return (
    <nav className="w-full border-b border-white/10 bg-[#0a0a0c] backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white text-black flex items-center justify-center font-bold text-xs">
            <img src={logo} alt="logo" />
          </div>
          <span className="text-white font-mono font-bold tracking-widest text-sm">REPOLENS</span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8 text-[10px] font-mono tracking-widest text-white/70">
          <a href="#" className="text-white border-b border-white pb-1">FEATURES</a>
          <a href="#" className="hover:text-white transition-colors">DOCUMENTATION</a>
          <a href="#" className="hover:text-white transition-colors">ENTERPRISE</a>
          <a href="#" className="hover:text-white transition-colors">PRICING</a>
          <a href="#" className="hover:text-white transition-colors">BLOG</a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <a href="#" className="text-[10px] font-mono tracking-widest text-white hover:text-white/70 transition-colors hidden sm:block">
            SIGN IN
          </a>
          <button className="bg-white text-black text-[10px] font-mono font-bold tracking-widest px-4 py-2 hover:bg-white/90 transition-colors flex items-center gap-2">
            <span>CONNECT GITHUB</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
