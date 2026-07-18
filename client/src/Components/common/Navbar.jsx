import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from "../../assets/RepoLensLogo.svg";
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <nav className="w-full border-b border-white/10 bg-dark-bg backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 cursor-pointer z-50">
          <div className="w-6 h-6 bg-white text-black flex items-center justify-center font-bold text-xs">
            <img src={logo} alt="logo" />
          </div>
          <span className="text-white font-mono font-bold tracking-widest text-sm">
            CODEATLAS
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-[10px] font-mono tracking-widest text-white/70 absolute left-1/2 -translate-x-1/2">
          <a href="#features" className="hover:text-white transition-colors cursor-pointer">FEATURES</a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors cursor-pointer">DOCUMENTATION</a>
          <a href="/auth" className="hover:text-white transition-colors cursor-pointer">ENTERPRISE</a>
          <a href="#pricing" className="hover:text-white transition-colors cursor-pointer">PRICING</a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors cursor-pointer">BLOG</a>
        </div>

        {/* Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            // --- Logged in state ---
            <div className="flex items-center gap-4">
              {!user.githubId && (
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/github`}
                  className="bg-white text-black text-[10px] font-mono font-bold tracking-widest px-4 py-2 hover:bg-white/90 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  CONNECT GITHUB
                </a>
              )}
              <Link
                to="/dashboard"
                className="flex items-center gap-2 group cursor-pointer"
              >
                {user.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt={user.name}
                    className="w-7 h-7 rounded-full border border-white/20 group-hover:border-white/60 transition-colors"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-[10px] font-mono font-bold group-hover:border-white/60 transition-colors">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-white/70 text-[10px] font-mono tracking-widest group-hover:text-white transition-colors">
                  {user.name?.split(' ')[0]?.toUpperCase() || 'DASHBOARD'}
                </span>
              </Link>
              <button
                onClick={logout}
                className="text-white/40 text-[10px] font-mono tracking-widest hover:text-white transition-colors cursor-pointer"
              >
                SIGN OUT
              </button>
            </div>
          ) : (
            // --- Logged out state ---
            <>
              <Link
                to="/auth"
                className="text-[10px] font-mono tracking-widest text-white hover:text-white/70 transition-colors cursor-pointer"
              >
                SIGN IN
              </Link>
              <Link
                to="/auth"
                className="bg-white text-black text-[10px] font-mono font-bold tracking-widest px-4 py-2 hover:bg-white/90 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>CONNECT GITHUB</span>
              </Link>
            </>
          )}
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
            <a href="#features" className="hover:text-white transition-colors block" onClick={() => setIsOpen(false)}>FEATURES</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors block" onClick={() => setIsOpen(false)}>DOCUMENTATION</a>
            <a href="/auth" className="hover:text-white transition-colors block" onClick={() => setIsOpen(false)}>ENTERPRISE</a>
            <a href="#pricing" className="hover:text-white transition-colors block" onClick={() => setIsOpen(false)}>PRICING</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors block" onClick={() => setIsOpen(false)}>BLOG</a>
          </div>
          <div className="flex flex-col gap-4 pt-4 border-t border-white/10">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  {user.profilePic ? (
                    <img src={user.profilePic} alt={user.name} className="w-8 h-8 rounded-full border border-white/20" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-[11px] font-bold">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-white text-xs">{user.name}</span>
                </div>
                {!user.githubId && (
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/github`}
                    className="bg-white text-black font-bold px-4 py-3 text-center w-full hover:bg-white/90 transition-colors text-xs"
                    onClick={() => setIsOpen(false)}
                  >
                    CONNECT GITHUB
                  </a>
                )}
                <Link to="/dashboard" className="text-white hover:text-white/70 transition-colors" onClick={() => setIsOpen(false)}>
                  DASHBOARD
                </Link>
                <button onClick={() => { logout(); setIsOpen(false); }} className="text-left text-white/50 hover:text-white transition-colors text-xs">
                  SIGN OUT
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" className="text-white hover:text-white/70 transition-colors" onClick={() => setIsOpen(false)}>
                  SIGN IN
                </Link>
                <Link
                  to="/auth"
                  className="bg-white text-black font-bold px-4 py-3 text-center w-full hover:bg-white/90 transition-colors block"
                  onClick={() => setIsOpen(false)}
                >
                  CONNECT GITHUB
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
