import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from "../../assets/RepoLensLogo.svg";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="w-full border-b border-white/10 bg-dark-bg backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 cursor-pointer z-50">
          <div className="w-6 h-6 bg-white text-black flex items-center justify-center font-bold text-xs">
            <img src={logo} alt="logo" />
          </div>
          <span className="text-white font-mono font-bold tracking-widest text-sm">
            REPOLENS
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-[10px] font-mono tracking-widest text-white/70 absolute left-1/2 -translate-x-1/2">
          <a href="#" className="hover:text-white transition-colors cursor-pointer">FEATURES</a>
          <a href="#" className="hover:text-white transition-colors cursor-pointer">DOCUMENTATION</a>
          <a href="#" className="hover:text-white transition-colors cursor-pointer">ENTERPRISE</a>
          <a href="#" className="hover:text-white transition-colors cursor-pointer">PRICING</a>
          <a href="#" className="hover:text-white transition-colors cursor-pointer">BLOG</a>
        </div>

        {/* Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/auth"
            className="text-[10px] font-mono tracking-widest text-white hover:text-white/70 transition-colors cursor-pointer"
          >
            SIGN IN
          </Link>
          <button className="bg-white text-black text-[10px] font-mono font-bold tracking-widest px-4 py-2 hover:bg-white/90 transition-colors flex items-center gap-2 cursor-pointer">
            <span>CONNECT GITHUB</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center z-50">
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="text-white focus:outline-none p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-[#0a0a0c]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl py-6 px-6 flex flex-col gap-6 font-mono text-sm tracking-widest">
          <div className="flex flex-col gap-4 text-white/70">
            <a href="#" className="hover:text-white transition-colors block" onClick={() => setIsOpen(false)}>FEATURES</a>
            <a href="#" className="hover:text-white transition-colors block" onClick={() => setIsOpen(false)}>DOCUMENTATION</a>
            <a href="#" className="hover:text-white transition-colors block" onClick={() => setIsOpen(false)}>ENTERPRISE</a>
            <a href="#" className="hover:text-white transition-colors block" onClick={() => setIsOpen(false)}>PRICING</a>
            <a href="#" className="hover:text-white transition-colors block" onClick={() => setIsOpen(false)}>BLOG</a>
          </div>
          <div className="flex flex-col gap-4 pt-4 border-t border-white/10">
            <Link to="/auth" className="text-white hover:text-white/70 transition-colors" onClick={() => setIsOpen(false)}>
              SIGN IN
            </Link>
            <button className="bg-white text-black font-bold px-4 py-3 text-center w-full hover:bg-white/90 transition-colors" onClick={() => setIsOpen(false)}>
              CONNECT GITHUB
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
