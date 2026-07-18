import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const toast = useToast();

  const handleSave = () => {
    toast.success("Preferences saved successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-up max-w-[800px] w-full mx-auto page-enter">
        {/* ── Header ── */}
        <div className="px-5 py-4" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>CODEATLAS V2 // NODE CONFIGURATION</div>
          <h1 className="text-white font-mono font-bold text-[14px] tracking-wide mb-0.5 m-0">
            System Settings &amp; Identity
          </h1>
          <p className="text-white/40 font-mono text-[10px] leading-relaxed mt-1 mb-0">
            Manage your identity, integration hooks, and system preferences.
          </p>
        </div>

        {/* ── Profile ── */}
        <div className="p-5" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}>
          <h2 className="text-white/60 text-[10px] uppercase tracking-widest mb-4 font-mono font-bold flex items-center gap-2">
            <span style={{ color: "#8b5cf6" }}>◆</span> User Profile Node
          </h2>
          <div className="flex items-center gap-5">
            {user?.profilePic ? (
              <img src={user.profilePic} alt="Avatar" className="w-14 h-14 object-cover grayscale-[20%]" style={{ border: "1px solid rgba(255,255,255,0.15)" }} />
            ) : (
              <div className="w-14 h-14 flex items-center justify-center" style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)" }}>
                <span className="text-white text-xl font-bold font-mono">{user?.name?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Assigned Name</div>
              <div className="text-white text-[13px] font-bold mb-2 font-mono">{user?.name}</div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Comm Channel</div>
              <div className="text-white/60 text-[11px] font-mono">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* ── Integrations ── */}
        <div className="p-5" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}>
          <h2 className="text-white/60 text-[10px] uppercase tracking-widest mb-4 font-mono font-bold flex items-center gap-2">
            <span style={{ color: "#3b82f6" }}>◆</span> Integration Hooks
          </h2>
          <div className="px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <div>
                <div className="text-white text-[11px] font-bold font-mono">GitHub Source Provider</div>
                <div className="text-white/40 text-[9px] mt-0.5 font-mono">{user?.provider === "GITHUB" ? `Linked as @${user.username}` : "Not connected"}</div>
              </div>
            </div>
            {user?.provider === "GITHUB" ? (
              <span className="text-[#22c55e] text-[8px] uppercase tracking-widest px-2 py-0.5 font-mono" style={{ border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.05)" }}>SECURE</span>
            ) : (
              <a href={`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/github`} className="text-white/70 px-3 py-1 text-[8px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors font-mono" style={{ border: "1px solid rgba(255,255,255,0.2)", textDecoration: "none" }}>INITIATE LINK</a>
            )}
          </div>
        </div>

        {/* ── Preferences ── */}
        <div className="p-5" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}>
          <h2 className="text-white/60 text-[10px] uppercase tracking-widest mb-4 font-mono font-bold flex items-center gap-2">
            <span style={{ color: "#10b981" }}>◆</span> System Preferences
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-[10px] text-white/60 uppercase tracking-widest font-mono mb-2">Display Density</div>
              <select className="w-full font-mono text-[11px] text-white outline-none cursor-pointer p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <option value="compact" style={{ background: "#050508" }}>Compact (Terminal)</option>
                <option value="comfortable" style={{ background: "#050508" }}>Comfortable</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] text-white/60 uppercase tracking-widest font-mono mb-2">Export Format Default</div>
              <select className="w-full font-mono text-[11px] text-white outline-none cursor-pointer p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <option value="markdown" style={{ background: "#050508" }}>Markdown Report (.md)</option>
                <option value="json" style={{ background: "#050508" }}>Raw Data (.json)</option>
                <option value="pdf" style={{ background: "#050508" }}>PDF Document</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="text-[10px] text-white/60 uppercase tracking-widest font-mono mb-2">Custom OpenRouter API Key (Optional)</div>
              <input type="password" placeholder="sk-or-v1-..." className="w-full font-mono text-[11px] text-white outline-none p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }} />
              <div className="text-[9px] text-white/30 font-mono mt-1">If provided, AI Insights will use this key instead of the system default.</div>
            </div>
          </div>
          
          <button onClick={handleSave} className="font-mono text-[10px] font-bold tracking-[0.1em] text-white uppercase px-6 py-2 transition-colors" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.25)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(139,92,246,0.15)"}>
            Save Preferences
          </button>
        </div>

        {/* ── Shortcuts ── */}
        <div className="p-5" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}>
          <h2 className="text-white/60 text-[10px] uppercase tracking-widest mb-4 font-mono font-bold flex items-center gap-2">
            <span style={{ color: "#f59e0b" }}>◆</span> Global Keyboard Shortcuts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "Cmd/Ctrl + K", label: "Open Global Search" },
              { key: "G then D", label: "Go to Dashboard" },
              { key: "G then R", label: "Go to Repositories" },
              { key: "G then A", label: "Go to Analysis History" },
              { key: "Esc", label: "Close Modals / Drawers" }
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between p-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="font-mono text-[10px] text-white/50">{s.label}</span>
                <kbd className="font-mono text-[9px] text-white/80" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", padding: "2px 6px" }}>{s.key}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* ── Danger Zone ── */}
        <div className="p-5" style={{ border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.02)" }}>
          <h2 className="text-[#ef4444] text-[10px] uppercase tracking-widest mb-3 font-mono font-bold">Danger Zone</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-white/50 text-[10px] font-mono">Sever current session connection and clear local cache.</span>
            <button onClick={logout} className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors font-mono text-[#ef4444] hover:bg-[rgba(239,68,68,0.15)]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.4)" }}>
              TERMINATE SESSION
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
