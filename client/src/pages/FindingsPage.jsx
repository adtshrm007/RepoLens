import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import RiskScore from "../Components/analysis/RiskScore.jsx";
import FindingCard from "../Components/analysis/FindingCard.jsx";
import api from "../services/api.js";

const SEVERITIES = ["critical", "high", "medium", "low"];
const SEV_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "rgba(255,255,255,0.5)",
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
function ScoreRing({ value, label, color }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = (value / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x="36" y="40" textAnchor="middle" fill="#fff" fontSize="14" fontFamily="monospace" fontWeight="700">
          {value}
        </text>
      </svg>
      <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function SectionHeader({ color, label }) {
  return (
    <h3 style={{
      margin: "0 0 12px",
      fontFamily: "monospace",
      fontSize: "9px",
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color,
      display: "flex",
      alignItems: "center",
      gap: "6px",
    }}>
      <span style={{ display: "inline-block", width: "16px", height: "1px", background: color }} />
      {label}
    </h3>
  );
}

/* ── main component ──────────────────────────────────────────────────────── */
export default function FindingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("findings"); // "findings" | "insights"

  // Extra data passed via navigation state (from repo analysis)
  const navState = location.state || {};
  const [insights, setInsights] = useState({
    maintainabilityScore: navState.maintainabilityScore ?? null,
    goodPractices: navState.goodPractices ?? [],
    structureIssues: navState.structureIssues ?? [],
    improvementPriorities: navState.improvementPriorities ?? [],
  });

  const hasInsights = insights.maintainabilityScore !== null ||
    insights.goodPractices.length > 0 ||
    insights.structureIssues.length > 0 ||
    insights.improvementPriorities.length > 0;

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const { data } = await api.get(`/analysis/${id}`);
        setAnalysis(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [id]);

  if (loading)
    return (
      <DashboardLayout>
        <div style={{ marginTop: "80px", textAlign: "center", fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", animation: "pulse 1.5s infinite" }}>
          DECRYPTING RESULTS_
        </div>
      </DashboardLayout>
    );

  if (!analysis)
    return (
      <DashboardLayout>
        <div style={{ marginTop: "80px", textAlign: "center", fontFamily: "monospace", fontSize: "10px", color: "#ef4444", letterSpacing: "0.2em" }}>
          ANALYSIS NOT FOUND.
        </div>
      </DashboardLayout>
    );

  const findings = analysis.findings || [];
  const filtered = filter === "all" ? findings : findings.filter((f) => f.severity === filter);
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  findings.forEach((f) => { if (counts[f.severity] !== undefined) counts[f.severity]++; });

  const overallScore = Math.round(analysis.overallScore || 0);
  const maintScore = insights.maintainabilityScore !== null ? Math.round(insights.maintainabilityScore) : null;

  return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", animation: "fadeUp 0.3s ease" }}>

        {/* ── Header ── */}
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <button
                onClick={() => navigate("/analysis")}
                style={{ background: "none", border: "none", fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.4)", cursor: "pointer", letterSpacing: "0.15em", textTransform: "uppercase" }}
              >
                ← LOG
              </button>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
              <h1 style={{ margin: 0, fontFamily: "monospace", fontWeight: "700", fontSize: "13px", color: "#fff", letterSpacing: "0.05em" }}>
                Job ID: {analysis.id.substring(0, 8)}
              </h1>
            </div>
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
              Target: <span style={{ color: "rgba(255,255,255,0.8)" }}>{analysis.repository?.fullName}</span>
            </p>
          </div>
          <div
            style={{
              fontSize: "9px", fontFamily: "monospace", letterSpacing: "0.2em",
              textTransform: "uppercase", padding: "3px 8px",
              border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.7)"
            }}
          >
            {analysis.status}
          </div>
        </div>

        {/* ── AI Summary ── */}
        {analysis.summary && (
          <div style={{ padding: "14px 18px", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.05)", borderLeft: "3px solid #8b5cf6" }}>
            <div style={{ fontFamily: "monospace", fontSize: "9px", color: "#8b5cf6", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "6px" }}>
              ◆ AI Summary
            </div>
            <p style={{ margin: 0, fontFamily: "sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: "1.7" }}>
              {analysis.summary}
            </p>
          </div>
        )}

        {/* ── Score Cards ── */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 auto", padding: "16px 24px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: "24px" }}>
            <ScoreRing
              value={overallScore}
              label="Health Score"
              color={overallScore >= 80 ? "#22c55e" : overallScore >= 60 ? "#eab308" : "#ef4444"}
            />
            {maintScore !== null && (
              <ScoreRing
                value={maintScore}
                label="Maintainability"
                color={maintScore >= 80 ? "#60a5fa" : maintScore >= 60 ? "#a78bfa" : "#f97316"}
              />
            )}
          </div>

          {/* Severity pills */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 min-w-[280px]">
            {SEVERITIES.map((sev) => (
              <div
                key={sev}
                style={{
                  padding: "12px",
                  border: `1px solid ${counts[sev] > 0 ? SEV_COLORS[sev] + "40" : "rgba(255,255,255,0.06)"}`,
                  background: counts[sev] > 0 ? SEV_COLORS[sev] + "0d" : "rgba(255,255,255,0.01)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span style={{ fontFamily: "monospace", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: counts[sev] > 0 ? SEV_COLORS[sev] : "rgba(255,255,255,0.3)" }}>
                  {sev}
                </span>
                <span style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: "700", color: counts[sev] > 0 ? SEV_COLORS[sev] : "rgba(255,255,255,0.2)" }}>
                  {counts[sev]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab Bar (only show Insights tab if has insights data) ── */}
        {hasInsights && (
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {["findings", "insights"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "9px 20px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab ? "2px solid #8b5cf6" : "2px solid transparent",
                  fontFamily: "monospace",
                  fontSize: "10px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: activeTab === tab ? "#a78bfa" : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {tab === "findings" ? `Findings (${findings.length})` : "Code Insights"}
              </button>
            ))}
          </div>
        )}

        {/* ── FINDINGS TAB ── */}
        {activeTab === "findings" && (
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-start">
            {/* Filter sidebar */}
            <div className="w-full md:w-[180px] shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
              <div className="hidden md:block font-mono text-[9px] text-white/30 tracking-[0.2em] uppercase mb-1">Filter</div>
              {["all", ...SEVERITIES].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    textAlign: "left",
                    padding: "7px 10px",
                    background: filter === f ? "rgba(255,255,255,0.07)" : "transparent",
                    border: `1px solid ${filter === f ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)"}`,
                    fontFamily: "monospace",
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: filter === f ? "#fff" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.15s",
                  }}
                  className="shrink-0"
                >
                  {f === "all" ? "All Findings" : f} ({f === "all" ? findings.length : counts[f]})
                </button>
              ))}
            </div>

            {/* Findings list */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {filtered.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                  NO FINDINGS MATCH CURRENT PARAMETERS.
                </div>
              ) : (
                filtered.map((f) => <FindingCard key={f.id} finding={f} />)
              )}
            </div>
          </div>
        )}

        {/* ── INSIGHTS TAB ── */}
        {activeTab === "insights" && hasInsights && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Improvement Priorities */}
            {insights.improvementPriorities.length > 0 && (
              <div style={{ padding: "18px 20px", border: "1px solid rgba(139,92,246,0.25)", background: "rgba(139,92,246,0.06)", borderRadius: "2px" }}>
                <SectionHeader color="#a78bfa" label="Top Improvement Priorities" />
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {insights.improvementPriorities.map((item, i) => {
                    const isObj = item && typeof item === "object";
                    return (
                      <div
                        key={i}
                        style={{
                          border: "1px solid rgba(139,92,246,0.2)",
                          borderRadius: "4px",
                          overflow: "hidden",
                          background: "rgba(0,0,0,0.2)",
                        }}
                      >
                        {/* Priority header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 14px",
                            background: "rgba(139,92,246,0.08)",
                            borderBottom: isObj && (item.problem || item.codeQuote || item.howToFix) ? "1px solid rgba(139,92,246,0.15)" : "none",
                          }}
                        >
                          <span style={{
                            flexShrink: 0, width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "monospace", fontSize: "10px", fontWeight: "700", color: "#a78bfa",
                            border: "1px solid rgba(139,92,246,0.4)", borderRadius: "2px",
                          }}>
                            {i + 1}
                          </span>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: "700", color: "#c4b5fd" }}>
                            {isObj ? item.title || `Priority ${i + 1}` : item}
                          </span>
                        </div>

                        {isObj && (
                          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            {/* Problem */}
                            {item.problem && (
                              <p style={{ margin: 0, fontFamily: "sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: "1.6" }}>
                                {item.problem}
                              </p>
                            )}
                            {/* Code Quote */}
                            {item.codeQuote && (
                              <div>
                                <div style={{ fontFamily: "monospace", fontSize: "8px", color: "rgba(234,179,8,0.7)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                                  ↳ Affected Code
                                </div>
                                <pre
                                  style={{
                                    margin: 0,
                                    padding: "8px 12px",
                                    background: "rgba(0,0,0,0.5)",
                                    border: "1px solid rgba(234,179,8,0.2)",
                                    borderLeft: "3px solid #eab308",
                                    borderRadius: "3px",
                                    fontFamily: "monospace",
                                    fontSize: "11px",
                                    color: "#eab308",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all",
                                    lineHeight: "1.5",
                                  }}
                                >
                                  {item.codeQuote}
                                </pre>
                              </div>
                            )}
                            {/* How to Fix */}
                            {item.howToFix && (
                              <div
                                style={{
                                  padding: "9px 12px",
                                  background: "rgba(52,211,153,0.05)",
                                  border: "1px solid rgba(52,211,153,0.15)",
                                  borderRadius: "3px",
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "flex-start",
                                }}
                              >
                                <span style={{ fontFamily: "monospace", fontSize: "8px", color: "#34d399", fontWeight: "700", flexShrink: 0, marginTop: "3px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                  How to Fix
                                </span>
                                <span style={{ fontFamily: "sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6" }}>
                                  {item.howToFix}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {/* Good Practices */}
              {insights.goodPractices.length > 0 && (
                <div style={{ padding: "18px 20px", border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.04)", borderRadius: "2px" }}>
                  <SectionHeader color="#4ade80" label="Good Practices Observed" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {insights.goodPractices.map((gp, i) => (
                      <div key={i} style={{ borderLeft: "2px solid rgba(34,197,94,0.4)", paddingLeft: "10px" }}>
                        <div style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: "700", color: "#4ade80", marginBottom: "3px" }}>{gp.title}</div>
                        <p style={{ margin: 0, fontFamily: "sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: "1.5" }}>{gp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Structure Issues */}
              {insights.structureIssues.length > 0 && (
                <div style={{ padding: "18px 20px", border: "1px solid rgba(249,115,22,0.2)", background: "rgba(249,115,22,0.04)", borderRadius: "2px" }}>
                  <SectionHeader color="#fb923c" label="Structure Issues" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {insights.structureIssues.map((si, i) => (
                      <div key={i}>
                        <div style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: "700", color: "#fb923c", marginBottom: "3px" }}>{si.title}</div>
                        <p style={{ margin: "0 0 5px", fontFamily: "sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: "1.5" }}>{si.description}</p>
                        {si.recommendation && (
                          <div style={{ padding: "5px 8px", background: "rgba(0,0,0,0.3)", borderLeft: "2px solid rgba(249,115,22,0.5)", fontFamily: "sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.45)", lineHeight: "1.4" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "8px", color: "#fb923c", letterSpacing: "0.1em", fontWeight: "700" }}>FIX: </span>
                            {si.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </DashboardLayout>
  );
}
