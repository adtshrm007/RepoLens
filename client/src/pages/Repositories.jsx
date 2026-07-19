import { useEffect, useState } from "react";
import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import api from "../services/api.js";

export default function Repositories() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const { data } = await api.get("/repos");
        setRepos(data || []);
      } catch (err) {
        if (err?.response?.data?.code === "GITHUB_TOKEN_EXPIRED") {
          setError("Your GitHub connection has expired.");
        } else {
          setError(err?.response?.data?.message || "Failed to fetch repositories.");
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.language?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-up">

        {/* ── Header ── */}
        <div
          className="px-4 py-3 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between"
          style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
        >
          <div>
            <h1 className="text-white font-mono text-[13px] tracking-wide mb-0.5">
              Connected Repositories
            </h1>
            <p className="text-white/40 font-mono text-[11px]">
              Manage and analyze your synchronized codebases.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-56 shrink-0">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
              style={{ color: "rgba(255,255,255,0.3)" }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[11px] font-mono text-white placeholder-white/30 focus:outline-none transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </div>
        </div>

        {/* ── Table Panel ── */}
        <div
          className="flex-1 bg-black/40 p-4 lg:p-6 overflow-hidden flex flex-col relative z-10"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-white/40 font-mono text-[10px] animate-pulse uppercase tracking-widest">
                SCANNING GITHUB REPOSITORIES_
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div
                className="text-[#ef4444] font-mono text-[11px] uppercase tracking-widest text-center mb-4 p-4"
                style={{ border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.03)" }}
              >
                {error}
              </div>
              {error === "Your GitHub connection has expired." && (
                <a
                  href={`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/github`}
                  className="px-6 py-2.5 bg-white text-black font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white/90 transition-colors"
                  style={{ textDecoration: "none" }}
                >
                  Reconnect GitHub
                </a>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <table className="w-full text-left data-table border-collapse min-w-[600px]">
                <thead>
                <tr>
                  <th>Repository Name</th>
                  <th>Language</th>
                  <th>Visibility</th>
                  <th>Last Updated</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((repo) => (
                  <tr
                    key={repo.id}
                    className="group"
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                      </svg>
                      <span className="text-white/80 group-hover:text-white transition-colors truncate max-w-[180px]">
                        {repo.name}
                      </span>
                    </td>
                    <td><span className="text-white/50">{repo.language || "—"}</span></td>
                    <td>
                      <span
                        className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 border ${
                          repo.private
                            ? "border-[rgba(239,68,68,0.3)] text-[#ef4444] bg-[rgba(239,68,68,0.05)]"
                            : "border-[rgba(34,197,94,0.3)] text-[#22c55e] bg-[rgba(34,197,94,0.05)]"
                        }`}
                      >
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </td>
                    <td className="text-white/40">{new Date(repo.updated_at).toLocaleDateString()}</td>
                    <td className="text-right">
                      <a
                        href={repo.owner?.login ? `/repositories/${repo.owner.login}/${repo.name}` : '#'}
                        className="text-[9px] uppercase tracking-[0.1em] text-white/60 px-3 py-1 hover:bg-white hover:text-black transition-colors inline-block"
                        style={{ border: "1px solid rgba(255,255,255,0.15)", textDecoration: "none" }}
                      >
                        Explore
                      </a>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-white/30 uppercase tracking-widest text-[10px]">
                      NO MATCHING REPOSITORIES FOUND.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
