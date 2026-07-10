import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import DashboardNavbar from "./DashboardNavbar.jsx";
import GlobalSearch from "../ui/GlobalSearch.jsx";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  // Global Keyboard Shortcuts
  useEffect(() => {
    let keySeq = [];
    let timeout;
    
    const handleKeyDown = (e) => {
      // Cmd+K / Ctrl+K for Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      // Avoid triggering navigation if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Sequential shortcuts (G D, G R, G A)
      keySeq.push(e.key.toLowerCase());
      if (timeout) clearTimeout(timeout);
      
      const seqStr = keySeq.join('');
      if (seqStr === 'gd') {
        navigate('/dashboard');
        keySeq = [];
      } else if (seqStr === 'gr') {
        navigate('/repositories');
        keySeq = [];
      } else if (seqStr === 'ga') {
        navigate('/analysis');
        keySeq = [];
      } else {
        timeout = setTimeout(() => { keySeq = []; }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeout) clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: "#050508" }}>
      {/* ── Landing-style animated background ── */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#1a1a24] via-[#08080f] to-[#050508] animate-gradient pointer-events-none z-0" />
      <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.06] animate-blob pointer-events-none z-0" />
      <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.06] animate-blob animation-delay-2000 pointer-events-none z-0" />
      <div className="absolute top-60 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.04] animate-blob animation-delay-4000 pointer-events-none z-0" />

      {/* ── Subtle grid overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} onSearchOpen={() => setSearchOpen(true)} />
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 relative z-10 md:ml-[200px]">
        <DashboardNavbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <div className="max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
