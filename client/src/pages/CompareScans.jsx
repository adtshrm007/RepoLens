import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import api from "../services/api.js";
import { SkeletonTable } from "../Components/ui/Skeleton.jsx";

export default function CompareScans() {
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanAId, setScanAId] = useState(params.get("a") || "");
  const [scanBId, setScanBId] = useState(params.get("b") || "");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get("/analysis/history").then(r => setHistory(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const a = params.get("a");
    const b = params.get("b");
    if (a && b) {
      setScanAId(a);
      setScanBId(b);
      fetchCompare(a, b);
    }
  }, []);

  const fetchCompare = async (a = scanAId, b = scanBId) => {
    if (!a || !b) return;
    setLoading(true);
    setError("");
    try {
      const { data: d } = await api.get(`/analysis/compare?a=${a}&b=${b}`);
      setData(d);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load comparison.");
    } finally {
      setLoading(false);
    }
  };

  const ROWS = [
    { label: "Repository", keyA: d => d.repository?.fullName || "—", keyB: d => d.repository?.fullName || "—", noHighlight: true },
    { label: "Scan Date", keyA: d => d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—", keyB: d => d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—", noHighlight: true },
    { label: "Files Analyzed", keyA: d => d.analyzedFiles ?? 0, keyB: d => d.analyzedFiles ?? 0, higherBetter: true },
    { label: "Overall Health", keyA: d => d.healthScore?.overall ?? "N/A", keyB: d => d.healthScore?.overall ?? "N/A", higherBetter: true },
    { label: "Maintainability", keyA: d => d.healthScore?.maintainability ?? "N/A", keyB: d => d.healthScore?.maintainability ?? "N/A", higherBetter: true },
    { label: "Security Score", keyA: d => d.healthScore?.security ?? "N/A", keyB: d => d.healthScore?.security ?? "N/A", higherBetter: true },
    { label: "Architecture Score", keyA: d => d.healthScore?.architecture ?? "N/A", keyB: d => d.healthScore?.architecture ?? "N/A", higherBetter: true },
    { label: "Total LOC", keyA: d => (d.metrics?.linesOfCode ?? 0).toLocaleString(), keyB: d => (d.metrics?.linesOfCode ?? 0).toLocaleString(), higherBetter: false },
    { label: "Functions", keyA: d => d.metrics?.functionCount ?? 0, keyB: d => d.metrics?.functionCount ?? 0, higherBetter: false },
    { label: "Components", keyA: d => d.metrics?.componentCount ?? 0, keyB: d => d.metrics?.componentCount ?? 0, higherBetter: false },
    { label: "Max Nesting", keyA: d => d.metrics?.nestingDepth ?? 0, keyB: d => d.metrics?.nestingDepth ?? 0, higherBetter: false },
    { label: "Large Files", keyA: d => d.metrics?.largeFilesCount ?? 0, keyB: d => d.metrics?.largeFilesCount ?? 0, higherBetter: false },
    { label: "Security Findings", keyA: d => d.securityFindings?.length ?? 0, keyB: d => d.securityFindings?.length ?? 0, higherBetter: false },
    { label: "Critical Findings", keyA: d => d.securityFindings?.filter(f => f.severity?.toUpperCase() === "CRITICAL").length ?? 0, keyB: d => d.securityFindings?.filter(f => f.severity?.toUpperCase() === "CRITICAL").length ?? 0, higherBetter: false },
  ];

  const getDiffClass = (a, b, higherBetter) => {
    if (a === b || typeof a !== "number" || typeof b !== "number") return "";
    if (higherBetter) return a > b ? "diff-better" : "diff-worse";
    return a < b ? "diff-better" : "diff-worse";
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 page-enter">
        {/* Header */}
        <div style={{ padding: "14px 18px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
          <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>CODEATLAS V2 // SCAN COMPARISON</div>
          <h1 style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "800", color: "#fff", margin: 0 }}>Compare Scans</h1>
          <p style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>Side-by-side analysis of two scans or repositories</p>
        </div>

        {/* Selector */}
        <div style={{ padding: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          {[{ label: "Scan A", val: scanAId, set: setScanAId }, { label: "Scan B", val: scanBId, set: setScanBId }].map(({ label, val, set }) => (
            <div key={label} style={{ flex: "1 1 200px" }}>
              <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "6px" }}>{label}</div>
              <select value={val} onChange={e => set(e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "monospace", fontSize: "11px", padding: "8px 10px", outline: "none", cursor: "pointer" }}>
                <option value="" style={{ background: "#050508" }}>— Select a scan —</option>
                {history.map(h => (
                  <option key={h.id} value={h.id} style={{ background: "#050508" }}>
                    {h.repository?.name || "Unknown"} · {h.id?.substring(0, 8)} · Score {h.healthScore?.overall ?? "N/A"}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button onClick={() => fetchCompare(scanAId, scanBId)} disabled={!scanAId || !scanBId || loading}
            style={{ padding: "9px 20px", fontFamily: "monospace", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.1em", textTransform: "uppercase", cursor: scanAId && scanBId ? "pointer" : "not-allowed", background: scanAId && scanBId ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${scanAId && scanBId ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.08)"}`, color: scanAId && scanBId ? "#a78bfa" : "rgba(255,255,255,0.3)", transition: "all 0.15s" }}>
            {loading ? "COMPARING..." : "COMPARE ⚖"}
          </button>
        </div>

        {error && (
          <div style={{ padding: "14px 16px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", fontFamily: "monospace", fontSize: "11px", color: "#ef4444" }}>
            ✗ {error}
          </div>
        )}

        {/* Results */}
        {loading && (
          <div style={{ padding: "16px", border: "1px solid rgba(255,255,255,0.07)" }}>
            <SkeletonTable rows={8} />
          </div>
        )}

        {data && !loading && (
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.15em", padding: "12px 16px", textAlign: "left", width: "35%" }}>Metric</th>
                  <th style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(139,92,246,0.8)", textTransform: "uppercase", letterSpacing: "0.15em", padding: "12px 16px", textAlign: "center", width: "32.5%", borderLeft: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.04)" }}>
                    SCAN A · {data.scanA?.id?.substring(0, 8)}
                  </th>
                  <th style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(96,165,250,0.8)", textTransform: "uppercase", letterSpacing: "0.15em", padding: "12px 16px", textAlign: "center", width: "32.5%", borderLeft: "1px solid rgba(96,165,250,0.15)", background: "rgba(96,165,250,0.04)" }}>
                    SCAN B · {data.scanB?.id?.substring(0, 8)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => {
                  const valA = row.keyA(data.scanA || {});
                  const valB = row.keyB(data.scanB || {});
                  const numA = typeof valA === "number" ? valA : null;
                  const numB = typeof valB === "number" ? valB : null;
                  const classA = !row.noHighlight ? getDiffClass(numA, numB, row.higherBetter) : "";
                  const classB = !row.noHighlight ? getDiffClass(numB, numA, row.higherBetter) : "";

                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.45)", padding: "10px 16px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{row.label}</td>
                      <td className={classA} style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: "bold", padding: "10px 16px", textAlign: "center", borderLeft: "1px solid rgba(139,92,246,0.08)", background: "rgba(139,92,246,0.02)" }}>
                        {String(valA)}
                      </td>
                      <td className={classB} style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: "bold", padding: "10px 16px", textAlign: "center", borderLeft: "1px solid rgba(96,165,250,0.08)", background: "rgba(96,165,250,0.02)" }}>
                        {String(valB)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "16px", alignItems: "center" }}>
              <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#22c55e" }}>■ Better</span>
              <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#ef4444" }}>■ Worse</span>
              <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>■ Same / no comparison</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                {data.scanA?.id && <Link to={`/scan/${data.scanA.id}`} style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(139,92,246,0.7)", textDecoration: "none", border: "1px solid rgba(139,92,246,0.2)", padding: "4px 8px" }}>Open Scan A →</Link>}
                {data.scanB?.id && <Link to={`/scan/${data.scanB.id}`} style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(96,165,250,0.7)", textDecoration: "none", border: "1px solid rgba(96,165,250,0.2)", padding: "4px 8px" }}>Open Scan B →</Link>}
              </div>
            </div>
          </div>
        )}

        {!data && !loading && !error && (
          <div style={{ padding: "60px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.1 }}>⚖</div>
            <p style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }}>Select two scans above to compare</p>
            <p style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.15)", marginTop: "8px" }}>Tip: You can also select scans from Analysis History and click Compare</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
