import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import ManualAnalysisModal from "../Components/analysis/ManualAnalysisModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ repos: 0, analyses: 0, findings: 0, score: null });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reposRes, historyRes] = await Promise.all([
          api.get("/repos").catch(() => ({ data: [] })),
          api.get("/analysis/history").catch(() => ({ data: { analyses: [] } })),
        ]);

        const repos = Array.isArray(reposRes.data) ? reposRes.data : (reposRes.data?.repos || []);
        const analyses = historyRes.data?.analyses || [];
        const totalFindings = analyses.reduce((sum, a) => sum + (a.findings?.length || 0), 0);
        const score = analyses.length
          ? Math.round(analyses.reduce((sum, a) => sum + (a.overallScore || 0), 0) / analyses.length)
          : null;

        setStats({ repos: repos.length, analyses: analyses.length, findings: totalFindings, score });
        setRecent(analyses.slice(0, 5));
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    {
      label: "Repositories",
      value: loading ? "—" : stats.repos,
      sub: stats.repos === 1 ? "repository connected" : "repositories connected",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
          <path strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      ),
    },
    {
      label: "Analyses Run",
      value: loading ? "—" : stats.analyses,
      sub: "total scans completed",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
          <path strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Issues Found",
      value: loading ? "—" : stats.findings,
      sub: "across all analyses",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
          <path strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      label: "Avg. Health Score",
      value: loading ? "—" : stats.score !== null ? `${stats.score}%` : "N/A",
      sub: stats.score !== null ? (stats.score >= 80 ? "Good shape" : stats.score >= 60 ? "Needs attention" : "Requires review") : "run an analysis to see",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
          <path strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <DashboardLayout>
        <div className="space-y-4 animate-fade-up">

        {/* Header */}
        <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }} className="px-5 py-4">
          <h1 className="text-white font-mono text-[13px] tracking-wide mb-0.5">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-white/40 font-mono text-[11px] leading-relaxed">
            Here's an overview of your repository intelligence.
          </p>
        </div>

        {/* GitHub Connection Banner */}
        {!user?.githubId && (
          <div className="p-4 flex items-center justify-between" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-white font-mono text-xs font-bold">Connect to GitHub to get repo analysis</h3>
                <p className="text-white/50 font-mono text-[10px] mt-0.5">You can still run manual analyses by uploading files or pasting code.</p>
              </div>
            </div>
            <a 
              href={`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/github`}
              className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors"
            >
              Connect GitHub
            </a>
          </div>
        )}

        {/* Stats */}
        <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)" }}>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.06]">
            {statCards.map((s) => (
              <div key={s.label} className="p-4 relative">
                <h3 className="text-white/40 text-[10px] uppercase tracking-widest font-mono mb-2">{s.label}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white text-lg font-mono font-bold">{s.value}</span>
                </div>
                <p className="text-white/25 text-[9px] font-mono mt-0.5">{s.sub}</p>
                <div className="absolute right-3 top-3 opacity-[0.07]">{s.icon}</div>
                <div className="mt-3 w-12 h-[1px] bg-white/15" />
              </div>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Recent Analyses */}
          <div className="col-span-2 p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-mono text-[11px]">Recent Analyses</h2>
              <Link
                to="/analysis"
                className="text-white/40 font-mono text-[9px] tracking-[0.15em] uppercase hover:text-white transition-colors"
              >
                View All →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : recent.length > 0 ? (
              <table className="w-full text-left data-table border-collapse">
                <thead>
                  <tr>
                    <th>Repository</th>
                    <th>Status</th>
                    <th>Issues</th>
                    <th className="text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((a) => (
                    <tr key={a.id} className="group">
                      <td className="flex items-center gap-2">
                        <span className="text-white/20 text-[10px]">&lt;&gt;</span>
                        <Link
                          to={`/analysis/${a.id}`}
                          className="text-white/80 group-hover:text-white transition-colors hover:underline"
                        >
                          {a.repository?.name || "Unknown"}
                        </Link>
                      </td>
                      <td>
                        <span
                          style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
                          className="text-[8px] px-1.5 py-0.5 uppercase tracking-widest text-white/50"
                        >
                          {a.status || "Complete"}
                        </span>
                      </td>
                      <td>{a.findings?.length || 0}</td>
                      <td className="text-right font-bold text-white">
                        {a.overallScore != null ? Math.round(a.overallScore) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <svg className="w-8 h-8 text-white/10 mb-3" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-white/30 font-mono text-[11px] mb-3">No analyses yet</p>
                <Link
                  to="/repositories"
                  className="text-[10px] font-mono uppercase tracking-widest px-4 py-2 hover:text-white transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}
                >
                  Browse Repositories →
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h2 className="text-white font-mono text-[11px] mb-4 flex items-center gap-2">
                <svg className="w-3 h-3 text-white/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Quick Actions
              </h2>
              <div className="space-y-2">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full text-left flex items-center gap-3 p-3 group transition-colors cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                >
                  <span className="text-base">📝</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-white/80 group-hover:text-white transition-colors">Manual Analysis</p>
                    <p className="text-[9px] font-mono text-white/30">Upload file or paste code</p>
                  </div>
                  <span className="text-white/20 group-hover:text-white/60 transition-colors text-xs">→</span>
                </button>

                {[
                  { label: "Browse Repositories", sub: "Select files to analyse", to: "/repositories", icon: "📁" },
                  { label: "View Analysis History", sub: "See past findings", to: "/analysis", icon: "🕐" },
                ].map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="flex items-center gap-3 p-3 group transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  >
                    <span className="text-base">{action.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono text-white/80 group-hover:text-white transition-colors">{action.label}</p>
                      <p className="text-[9px] font-mono text-white/30">{action.sub}</p>
                    </div>
                    <span className="text-white/20 group-hover:text-white/60 transition-colors text-xs">→</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Getting Started — only shown when no analyses */}
            {!loading && stats.analyses === 0 && (
              <div className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <h2 className="text-white/40 font-mono text-[10px] uppercase tracking-widest mb-3">Getting Started</h2>
                <ol className="space-y-2.5">
                  {[
                    "Go to Repositories",
                    "Open a repo & select files",
                    "Click Run Analysis",
                    "Review findings here",
                  ].map((step, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <span
                        className="w-4 h-4 shrink-0 flex items-center justify-center font-mono text-[8px] font-bold"
                        style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[10px] font-mono text-white/50">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
      <ManualAnalysisModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
