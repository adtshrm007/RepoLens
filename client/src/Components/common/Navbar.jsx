import { Link } from 'react-router-dom';
import logo from "../../assets/RepoLensLogo.svg";

export default function Navbar() {
  return (
    <nav className="w-full border-b border-white/10 bg-dark-bg backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 cursor-pointer">
          <div className="w-6 h-6 bg-white text-black flex items-center justify-center font-bold text-xs">
            <img src={logo} alt="logo" />
          </div>
          <span className="text-white font-mono font-bold tracking-widest text-sm">
            REPOLENS
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8 text-[10px] font-mono tracking-widest text-white/70">
          <a
            href="#"
            className="hover:text-white transition-colors cursor-pointer"
          >
            FEATURES
          </a>
          <a
            href="#"
            className="hover:text-white transition-colors cursor-pointer"
          >
            DOCUMENTATION
          </a>
          <a
            href="#"
            className="hover:text-white transition-colors cursor-pointer"
          >
            ENTERPRISE
          </a>
          <a
            href="#"
            className="hover:text-white transition-colors cursor-pointer"
          >
            PRICING
          </a>
          <a
            href="#"
            className="hover:text-white transition-colors cursor-pointer"
          >
            BLOG
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            to="/auth"
            className="text-[10px] font-mono tracking-widest text-white hover:text-white/70 transition-colors hidden sm:block cursor-pointer"
          >
            SIGN IN
          </Link>
          <button className="bg-white text-black text-[10px] font-mono font-bold tracking-widest px-4 py-2 hover:bg-white/90 transition-colors flex items-center gap-2 cursor-pointer">
            <span>CONNECT GITHUB</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
