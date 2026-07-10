import { useAuth } from "../../context/AuthContext.jsx";
import { Link } from "react-router-dom";

export default function DashboardNavbar({ toggleSidebar }) {
  const { user } = useAuth();

  return (
    <header
      className="h-[60px] flex items-center shrink-0 z-30"
      style={{
        background: "rgba(5,5,8,0.7)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Hamburger & Search */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button 
            onClick={toggleSidebar}
            className="md:hidden text-white/50 hover:text-white transition-colors p-1 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Search — hidden on xs, shown from sm */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 h-8 min-w-0"
            style={{ width: "clamp(140px, 30vw, 260px)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
          <svg
            className="w-3 h-3 shrink-0"
            style={{ color: "rgba(255,255,255,0.25)" }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Jump to repository..."
            className="bg-transparent border-none outline-none font-mono w-full placeholder-white/25 text-white"
            style={{ fontSize: "11px" }}
          />
        </div>
        </div>

        {/* Right: user + settings */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* User info */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {user?.profilePic ? (
              <img
                src={user.profilePic}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover grayscale-[20%] shrink-0"
                style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              />
            ) : (
              <div
                className="w-6 h-6 flex items-center justify-center font-mono font-bold shrink-0"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 10, color: "rgba(255,255,255,0.8)" }}
              >
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <span className="hidden sm:inline font-mono truncate max-w-[100px]" style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
              {user?.username || user?.name || "dev"}
            </span>
          </div>

          <div className="w-[1px] h-4" style={{ background: "rgba(255,255,255,0.08)" }} />

          {/* Settings link */}
          <Link
            to="/settings"
            className="transition-colors"
            style={{ color: "rgba(255,255,255,0.25)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

