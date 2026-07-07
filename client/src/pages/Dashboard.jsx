import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import ManualAnalysisModal from "../Components/analysis/ManualAnalysisModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import SparkLine from "../Components/ui/SparkLine.jsx";
import { SeverityDonut, SeverityBars } from "../Components/ui/SeverityChart.jsx";
import { SkeletonStats, SkeletonTable, SkeletonCard } from "../Components/ui/Skeleton.jsx";

// ─── Sub-components ────────────────────────────────────────────────────────

function StatBlock({ label, value, sub, icon, accent = "rgba(255,255,255,0.8)", loading }) {
  return (
    <div className="p-4 relative overflow-hidden group"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: "8px" }}>
        {label}
      </div>
      {loading ? (
        <div className="skeleton" style={{ width: "60%", height: "24px", marginBottom: "6px" }} />
      ) : (
        <div style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: "800", color: accent, lineHeight: 1, marginBottom: "4px" }}>
          {value}
        </div>
      )}
      {sub && !loading && (
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {sub}
        </div>
      )}
      {/* Subtle icon watermark */}
      <div className="absolute right-3 bottom-3 opacity-[0.04] text-white text-4xl select-none pointer-events-none">
        {icon}
      </div>
    </div>
  );
}

function ScorePill({ score }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";
  const label = score >= 80 ? "HEALTHY" : score >= 60 ? "FAIR" : "AT RISK";
  return (
    <span style={{
      fontFamily: "monospace", fontSize: "8px", fontWeight: "bold",
      color, border: `1px solid ${color}44`, background: `${color}0f`,
      padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.12em"
    }}>
      {label}
    </span>
  );
}

function ScoreDelta({ current, previous }) {
  if (previous == null || current == null) return null;
  const delta = current - previous;
  if (delta === 0) return <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>—</span>;
  const up = delta > 0;
  return (
    <span style={{ fontFamily: "monospace", fontSize: "9px", fontWeight: "bold", color: up ? "#22c55e" : "#ef4444" }}>
      {up ? "↑" : "↓"}{Math.abs(delta)}
    </span>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get("/analysis/dashboard-stats");
        setStats(data);
      } catch (err) {
        // Fallback to old endpoint if new one isn't deployed yet
        try {
          const [reposRes, historyRes] = await Promise.all([
            api.get("/repos").catch(() => ({ data: [] })),
            api.get("/analysis/history").catch(() => ({ data: [] })),
          ]);
          const repos = Array.isArray(reposRes.data) ? reposRes.data : [];
          const analyses = Array.isArray(historyRes.data) ? historyRes.data : [];
          const totalFindings = analyses.reduce((s, a) => s + (a.findings?.length || 0), 0);
          const validScores = analyses.filter(a => a.healthScore?.overall != null);
          const avgHealth = validScores.length
            ? Math.round(validScores.reduce((s, a) => s + a.healthScore.overall, 0) / validScores.length)
            : null;
          const securityBySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
          analyses.forEach(a => (a.findings || []).forEach(f => {
            const sev = f.severity?.toUpperCase();
            if (sev && securityBySeverity[sev] !== undefined) securityBySeverity[sev]++;
          }));
          setStats({
            totalRepositories: repos.length,
            totalScans: analyses.length,
            completedScans: analyses.filter(a => a.status === "COMPLETED").length,
            totalFilesAnalyzed: 0,
            totalFunctions: 0,
            totalComponents: 0,
            securityBySeverity,
            avgHealth,
            largestRepo: null,
            mostComplexRepo: null,
            recentScans: analyses.slice(0, 6).map(a => ({
              id: a.id, repository: a.repository, healthScore: a.healthScore, createdAt: a.createdAt, totalFiles: 0
            })),
            healthTrend: validScores.slice(-10).map(a => ({ date: a.createdAt, overall: a.healthScore.overall, repoName: a.repository?.name || "" }))
          });
        } catch (e) {
          console.error("Dashboard fallback error:", e);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalFindings = stats ? Object.values(stats.securityBySeverity || {}).reduce((s, v) => s + v, 0) : 0;
  const trendValues = (stats?.healthTrend || []).map(t => t.overall);

  return (
    <>
      <DashboardLayout>
        <div className="space-y-4 page-enter">

          {/* ── Header ── */}
          <div style={{ padding: "14px 18px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>
                  REPOLENS V2 // INTELLIGENCE DASHBOARD
                </div>
                <h1 style={{ fontFamily: "monospace", fontSize: "15px", fontWeight: "800", color: "#fff", letterSpacing: "0.03em", margin: 0 }}>
                  {user?.name ? `${user.name.split(" ")[0]}'s` : "Your"} Repository Intelligence
                </h1>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: "bold", color: "#fff", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)", padding: "8px 16px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.25)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(139,92,246,0.15)"}
                >
                  + Manual Analysis
                </button>
                <Link to="/repositories"
                  style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: "bold", color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 16px", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                >
                  Browse Repos
                </Link>
              </div>
            </div>
          </div>

          {/* ── GitHub Banner ── */}
          {!user?.githubId && (
            <div style={{ padding: "12px 18px", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#eab308", fontSize: "14px" }}>⚠</span>
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#fff", fontWeight: "bold" }}>Connect GitHub to scan repositories</div>
                  <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>You can still run manual analyses below</div>
                </div>
              </div>
              <a href={`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/github`}
                style={{ fontFamily: "monospace", fontSize: "9px", fontWeight: "bold", color: "#eab308", background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", padding: "7px 14px", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                CONNECT GITHUB →
              </a>
            </div>
          )}

          {/* ── Stats Grid (8 metrics) ── */}
          {loading ? (
            <SkeletonStats count={4} />
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "rgba(255,255,255,0.04)" }}>
                <StatBlock label="Repositories" value={stats?.totalRepositories ?? 0} sub="connected" icon="📁" />
                <StatBlock label="Total Scans" value={stats?.totalScans ?? 0} sub={`${stats?.completedScans ?? 0} completed`} icon="⚡" />
                <StatBlock label="Files Analyzed" value={(stats?.totalFilesAnalyzed ?? 0).toLocaleString()} sub="across all scans" icon="📄" />
                <StatBlock label="Functions Found" value={(stats?.totalFunctions ?? 0).toLocaleString()} sub={`${stats?.totalComponents ?? 0} components`} icon="ƒ" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "rgba(255,255,255,0.04)" }}>
                <StatBlock label="Avg. Health" value={stats?.avgHealth != null ? `${stats.avgHealth}` : "N/A"}
                  sub={stats?.avgHealth >= 80 ? "Good shape" : stats?.avgHealth >= 60 ? "Needs attention" : "Review required"}
                  accent={stats?.avgHealth >= 80 ? "#22c55e" : stats?.avgHealth >= 60 ? "#eab308" : "#ef4444"} icon="♥" />
                <StatBlock label="Security Issues" value={totalFindings}
                  sub={`${stats?.securityBySeverity?.CRITICAL ?? 0} critical, ${stats?.securityBySeverity?.HIGH ?? 0} high`}
                  accent={totalFindings === 0 ? "#22c55e" : stats?.securityBySeverity?.CRITICAL > 0 ? "#ef4444" : "#eab308"} icon="🔒" />
                <StatBlock label="Largest Repo"
                  value={stats?.largestRepo?.repoName ?? "N/A"}
                  sub={stats?.largestRepo ? `${stats.largestRepo.totalFiles} files` : "no data"} icon="🏗" />
                <StatBlock label="Most Complex"
                  value={stats?.mostComplexRepo?.repoName ?? "N/A"}
                  sub={stats?.mostComplexRepo ? `health ${stats.mostComplexRepo.health}` : "no data"}
                  accent={stats?.mostComplexRepo?.health < 60 ? "#ef4444" : "#eab308"} icon="⚙" />
              </div>
            </>
          )}

          {/* ── Main Content Grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 320px", gap: "12px" }}>

            {/* ── Recent Scans Table ── */}
            <div style={{ gridColumn: "1 / 3", padding: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <h2 style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.18em", margin: 0 }}>
                  Recently Scanned
                </h2>
                <Link to="/analysis" style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.15em", textDecoration: "none" }}>
                  View All →
                </Link>
              </div>

              {loading ? <SkeletonTable rows={5} /> : (stats?.recentScans?.length > 0 ? (
                <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Repository</th>
                      <th style={{ textAlign: "left" }}>Files</th>
                      <th style={{ textAlign: "left" }}>Date</th>
                      <th style={{ textAlign: "right" }}>Health</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentScans.map((scan) => {
                      const score = scan.healthScore?.overall;
                      const scoreColor = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";
                      return (
                        <tr key={scan.id}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "10px" }}>&lt;/&gt;</span>
                              <Link to={`/repositories/${scan.repository?.fullName || ''}`}
                                style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.8)", textDecoration: "none", fontWeight: "bold" }}>
                                {scan.repository?.name || "Unknown"}
                              </Link>
                            </div>
                            <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.25)", marginTop: "2px", paddingLeft: "24px" }}>
                              {scan.repository?.fullName}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>
                              {scan.analyzedFiles ?? scan.totalFiles ?? 0}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>
                              {scan.createdAt ? new Date(scan.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {score != null ? (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                                <ScorePill score={score} />
                                <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "800", color: scoreColor }}>{score}</span>
                              </div>
                            ) : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Link to={`/scan/${scan.id}`}
                              style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(139,92,246,0.8)", textDecoration: "none", letterSpacing: "0.1em" }}>
                              VIEW →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.15 }}>📊</div>
                  <p style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.25)", marginBottom: "16px" }}>No scans yet</p>
                  <Link to="/repositories"
                    style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.5)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 16px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    Browse Repositories →
                  </Link>
                </div>
              ))}
            </div>

            {/* ── Right Column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* Security Overview */}
              <div style={{ padding: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
                <h2 style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.18em", margin: "0 0 14px" }}>
                  Security Overview
                </h2>
                {loading ? <SkeletonCard lines={4} /> : (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                    <SeverityDonut data={stats?.securityBySeverity || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }} size={72} />
                    <div style={{ flex: 1 }}>
                      <SeverityBars data={stats?.securityBySeverity || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }} />
                    </div>
                  </div>
                )}
                {!loading && totalFindings > 0 && (
                  <Link to="/analysis"
                    style={{ display: "block", marginTop: "12px", fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    Review findings →
                  </Link>
                )}
              </div>

              {/* Health Trend */}
              <div style={{ padding: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
                <h2 style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.18em", margin: "0 0 14px" }}>
                  Health Trend
                </h2>
                {loading ? <SkeletonCard lines={1} /> : trendValues.length > 1 ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "20px", fontWeight: "800", color: trendValues[trendValues.length - 1] >= 80 ? "#22c55e" : trendValues[trendValues.length - 1] >= 60 ? "#eab308" : "#ef4444" }}>
                        {trendValues[trendValues.length - 1]}
                      </span>
                      <ScoreDelta current={trendValues[trendValues.length - 1]} previous={trendValues[trendValues.length - 2]} />
                    </div>
                    <SparkLine
                      data={trendValues}
                      width={260}
                      height={48}
                      color={trendValues[trendValues.length - 1] >= 80 ? "#22c55e" : trendValues[trendValues.length - 1] >= 60 ? "#eab308" : "#ef4444"}
                      showDots
                    />
                    <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.2)", marginTop: "6px" }}>
                      Last {trendValues.length} scans
                    </div>
                  </div>
                ) : (
                  <div style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "20px 0" }}>
                    Run 2+ scans to see trends
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div style={{ padding: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
                <h2 style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.18em", margin: "0 0 12px" }}>
                  Quick Actions
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[
                    { label: "Manual Analysis", sub: "Paste code or upload a file", to: null, onClick: () => setIsModalOpen(true), icon: "📝" },
                    { label: "Browse Repositories", sub: "Scan a GitHub repo", to: "/repositories", icon: "📁" },
                    { label: "Analysis History", sub: "View all past scans", to: "/analysis", icon: "🕐" },
                    { label: "Compare Scans", sub: "Side-by-side diff", to: "/compare", icon: "⚖" },
                  ].map((a, i) => {
                    const inner = (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", width: "100%", textAlign: "left", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
                        <span style={{ fontSize: "14px", flexShrink: 0 }}>{a.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.8)", fontWeight: "bold" }}>{a.label}</div>
                          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>{a.sub}</div>
                        </div>
                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "10px" }}>→</span>
                      </div>
                    );
                    if (a.onClick) return <button key={i} onClick={a.onClick} style={{ background: "none", border: "none", padding: 0, width: "100%" }}>{inner}</button>;
                    return <Link key={i} to={a.to} style={{ textDecoration: "none" }}>{inner}</Link>;
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      </DashboardLayout>
      <ManualAnalysisModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
