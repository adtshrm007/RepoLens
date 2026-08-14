import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import api from "../services/api.js";

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const SEV_COLORS = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "rgba(255,255,255,0.5)",
};

function ScoreRing({ value, label, color, grade }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const fill = (value / 100) * circ;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", width: "100%", maxWidth: "300px" }}>
      <div style={{ position: "relative", width: "80px", height: "80px" }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={`${fill} ${circ - fill}`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
          <text x="40" y="45" textAnchor="middle" fill="#fff" fontSize="18" fontFamily="monospace" fontWeight="700">
            {value}
          </text>
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
          {label}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px", fontWeight: "bold", color }}>Grade {grade || '-'}</span>
        </div>
      </div>
    </div>
  );
}

function FindingItem({ finding }) {
  // Distinguish Dependency vs Source
  const isDep = finding.category === 'DEPENDENCY';
  const color = SEV_COLORS[finding.severity] || "#fff";

  return (
    <div style={{ padding: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)", borderLeft: `3px solid ${color}`, marginBottom: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span style={{ fontFamily: "monospace", fontSize: "9px", padding: "3px 8px", border: `1px solid ${color}40`, background: `${color}15`, color, letterSpacing: "0.1em" }}>
              {finding.severity}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "bold", color: "#fff" }}>
              {isDep ? finding.symbol : (finding.type || finding.message)}
            </span>
          </div>
          {isDep ? (
            <div style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
              Package: <span style={{ color: "#fff" }}>{finding.symbol}</span> | Version: <span style={{ color: "#fff" }}>{finding.metrics?.version || 'N/A'}</span>
            </div>
          ) : (
            <div style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
              {finding.file}:{finding.startLine || finding.lineNumber || finding.line || 0}
            </div>
          )}
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {finding.cve && <span style={{ fontFamily: "monospace", fontSize: "10px", padding: "3px 6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f87171" }}>CVE: {finding.cve}</span>}
          {finding.cwe && <span style={{ fontFamily: "monospace", fontSize: "10px", padding: "3px 6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#60a5fa" }}>CWE: {finding.cwe}</span>}
          {finding.cvss && <span style={{ fontFamily: "monospace", fontSize: "10px", padding: "3px 6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#eab308" }}>CVSS: {finding.cvss}</span>}
          {finding.confidence && <span style={{ fontFamily: "monospace", fontSize: "10px", padding: "3px 6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>CONFIDENCE: {finding.confidence}</span>}
        </div>
      </div>

      {/* Body */}
      <div style={{ fontFamily: "sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: "1.6" }}>
        {finding.explanation || finding.description}
      </div>

      {/* Code Snippet / Evidence */}
      {(finding.evidence || finding.snippet) && (
        <pre style={{ margin: 0, padding: "12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", fontSize: "11px", color: "#fca5a5", overflowX: "auto", fontFamily: "monospace" }}>
          {finding.evidence || finding.snippet}
        </pre>
      )}

      {/* Footer Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {isDep && finding.metrics?.fixedVersion && (
          <div style={{ padding: "8px 12px", background: "rgba(96,165,250,0.05)", borderLeft: "2px solid #60a5fa", fontFamily: "sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.8)" }}>
            <span style={{ color: "#60a5fa", fontWeight: "bold", marginRight: "6px" }}>Fixed Version:</span> {finding.metrics.fixedVersion}
          </div>
        )}
        {(finding.recommendation) && (
          <div style={{ padding: "8px 12px", background: "rgba(34,197,94,0.05)", borderLeft: "2px solid #22c55e", fontFamily: "sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.8)", lineHeight: "1.5" }}>
            <span style={{ color: "#22c55e", fontWeight: "bold", marginRight: "6px" }}>Recommendation:</span> {finding.recommendation}
          </div>
        )}
      </div>

    </div>
  );
}

export default function FindingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("ALL");

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

  const { allSecurityFindings, breakdown, counts } = useMemo(() => {
    if (!analysis) return { allSecurityFindings: [], breakdown: {}, counts: {} };
    
    // Combine old securityFindings and new RuleEngine findings (where category is SECURITY or DEPENDENCY)
    const combined = [
      ...(analysis.securityFindings || []).map(f => ({ ...f, category: 'SECURITY' })), // Normalize old
      ...(analysis.findings || []).filter(f => f.category === 'SECURITY' || f.category === 'DEPENDENCY')
    ];

    // Filter into buckets
    const b = {
      SAST: combined.filter(f => f.category === 'SECURITY' && f.type !== 'HARDCODED_SECRET' && f.type !== 'CONFIG_ISSUE'),
      DEP: combined.filter(f => f.category === 'DEPENDENCY'),
      SEC: combined.filter(f => f.type === 'HARDCODED_SECRET'),
      CONF: combined.filter(f => f.type === 'CONFIG_ISSUE'),
    };

    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    combined.forEach(f => {
      if (f.severity && c[f.severity.toUpperCase()] !== undefined) {
        c[f.severity.toUpperCase()]++;
      }
    });

    return { allSecurityFindings: combined, breakdown: b, counts: c };
  }, [analysis]);

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

  const securityScore = analysis.healthScore?.securityScore !== undefined ? Math.round(analysis.healthScore.securityScore) : 100;
  const securityGrade = analysis.healthScore?.securityGrade || "A";

  const renderSection = (title, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 16px", fontFamily: "monospace", fontSize: "12px", color: "#8b5cf6", letterSpacing: "0.15em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "20px", height: "1px", background: "#8b5cf6" }} />
          {title} ({items.length})
        </h3>
        {items.map((f, i) => <FindingItem key={i} finding={f} />)}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "fadeUp 0.3s ease", maxWidth: "1000px", margin: "0 auto", width: "100%" }}>
        
        {/* Header */}
        <div style={{ padding: "16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <button
                onClick={() => navigate(`/repo/${analysis.repositoryId}/scan/${analysis.id}`)}
                style={{ background: "none", border: "none", fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.4)", cursor: "pointer", letterSpacing: "0.15em", textTransform: "uppercase" }}
              >
                ← OVERVIEW
              </button>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
              <h1 style={{ margin: 0, fontFamily: "monospace", fontWeight: "700", fontSize: "14px", color: "#fff", letterSpacing: "0.05em" }}>
                Security & Vulnerability Report
              </h1>
            </div>
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
              Repository: <span style={{ color: "rgba(255,255,255,0.8)" }}>{analysis.repository?.fullName}</span>
            </p>
          </div>
        </div>

        {/* Score and Severities */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "stretch" }}>
          <ScoreRing 
            value={securityScore} 
            label="Security Score" 
            grade={securityGrade}
            color={securityScore >= 80 ? "#22c55e" : securityScore >= 60 ? "#eab308" : "#ef4444"} 
          />
          
          <div style={{ flex: "1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px", minWidth: "300px" }}>
            {SEVERITIES.map(sev => (
              <div key={sev} style={{ 
                padding: "16px", 
                border: `1px solid ${counts[sev] > 0 ? SEV_COLORS[sev] + "40" : "rgba(255,255,255,0.05)"}`, 
                background: counts[sev] > 0 ? SEV_COLORS[sev] + "0f" : "rgba(255,255,255,0.01)",
                display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center"
              }}>
                <div style={{ fontFamily: "monospace", fontSize: "10px", color: counts[sev] > 0 ? SEV_COLORS[sev] : "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{sev}</div>
                <div style={{ fontFamily: "monospace", fontSize: "28px", fontWeight: "bold", color: counts[sev] > 0 ? SEV_COLORS[sev] : "rgba(255,255,255,0.2)" }}>{counts[sev]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ marginTop: "16px" }}>
          {allSecurityFindings.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.05)" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🛡️</div>
              <div style={{ fontFamily: "monospace", fontSize: "14px", color: "#22c55e", letterSpacing: "0.1em", fontWeight: "bold" }}>ZERO SECURITY FINDINGS</div>
              <div style={{ fontFamily: "sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>Your repository is clean from known vulnerabilities and exposed secrets.</div>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }}>
                {["ALL", "SAST", "DEP", "SEC", "CONF"].map(sec => {
                  const label = sec === 'ALL' ? 'All Findings' : sec === 'SAST' ? 'Source Vulnerabilities' : sec === 'DEP' ? 'Dependencies' : sec === 'SEC' ? 'Secrets' : 'Configuration';
                  const len = sec === 'ALL' ? allSecurityFindings.length : breakdown[sec].length;
                  return (
                    <button
                      key={sec}
                      onClick={() => setActiveSection(sec)}
                      style={{
                        padding: "8px 16px",
                        background: activeSection === sec ? "rgba(139,92,246,0.15)" : "transparent",
                        border: `1px solid ${activeSection === sec ? "#8b5cf6" : "transparent"}`,
                        color: activeSection === sec ? "#fff" : "rgba(255,255,255,0.5)",
                        fontFamily: "monospace", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                        cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap"
                      }}
                    >
                      {label} ({len})
                    </button>
                  );
                })}
              </div>

              {/* Lists */}
              <div>
                {(activeSection === "ALL" || activeSection === "SAST") && renderSection("Source Code Vulnerabilities", breakdown.SAST)}
                {(activeSection === "ALL" || activeSection === "DEP") && renderSection("Dependency Vulnerabilities", breakdown.DEP)}
                {(activeSection === "ALL" || activeSection === "SEC") && renderSection("Secrets Detected", breakdown.SEC)}
                {(activeSection === "ALL" || activeSection === "CONF") && renderSection("Configuration Issues", breakdown.CONF)}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
