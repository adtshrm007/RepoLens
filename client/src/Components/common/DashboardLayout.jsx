import Sidebar from "./Sidebar.jsx";
import DashboardNavbar from "./DashboardNavbar.jsx";

export default function DashboardLayout({ children }) {
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

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 relative z-10" style={{ marginLeft: 200 }}>
        <DashboardNavbar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
