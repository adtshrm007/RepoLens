import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import logo from "../../assets/RepoLensLogo.svg";

const NAV = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    path: "/repositories",
    label: "Repositories",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  },
  {
    path: "/analysis",
    label: "Analysis History",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },

  {
    path: "/explorer",
    label: "Code Explorer",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-full flex flex-col z-50 transition-transform duration-300 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      style={{
        width: "200px",
        background: "rgba(5,5,8,0.85)",
        backdropFilter: "blur(16px)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Brand */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/dashboard")} className="text-left w-full flex items-center gap-2.5">
          <div className="w-5 h-5 bg-white text-black flex items-center justify-center font-bold text-[10px] shrink-0">
            <img src={logo} alt="logo" />
          </div>
          <div>
            <div className="text-white font-mono font-bold tracking-widest" style={{ fontSize: 11, letterSpacing: "0.12em" }}>
              REPOLENS
            </div>
            <div className="font-mono tracking-widest mt-0.5" style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em" }}>
              AI INTELLIGENCE
            </div>
          </div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.path + item.label}
            to={item.path}
            end={item.path === "/dashboard"}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-2.5 transition-all cursor-pointer ${
                isActive
                  ? "text-white bg-white/[0.06] border-r-2 border-white"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.02] border-r-2 border-transparent"
              }`
            }
            style={{ textDecoration: "none" }}
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}>
                  {item.icon}
                </span>
                <span className="font-mono" style={{ fontSize: 11, letterSpacing: "0.02em" }}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-5 py-4 flex flex-col gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <NavLink
          to="/settings"
          onClick={() => setIsOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 transition-all cursor-pointer ${
              isActive
                ? "text-white"
                : "text-white/40 hover:text-white/80"
            }`
          }
          style={{ textDecoration: "none" }}
        >
          {({ isActive }) => (
            <>
              <span style={{ color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <span className="font-mono" style={{ fontSize: 11, letterSpacing: "0.02em" }}>
                Settings
              </span>
            </>
          )}
        </NavLink>

        {user && (
          <div className="flex items-center gap-2.5 mb-3">
            {user?.profilePic ? (
              <img
                src={user.profilePic}
                alt={user.name}
                className="w-5 h-5 rounded-full object-cover grayscale-[20%]"
                style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <span className="text-white text-[9px] font-mono font-bold">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            )}
            <span className="font-mono text-white/60 truncate" style={{ fontSize: 10 }}>
              {user?.username || user?.name || "dev"}
            </span>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full transition-colors group"
          style={{ color: "rgba(255,255,255,0.25)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(239,68,68,0.8)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span className="font-mono" style={{ fontSize: 11 }}>Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
}
