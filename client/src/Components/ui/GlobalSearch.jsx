import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api.js";

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ scans: [], findings: [], files: [] });
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("scans");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults({ scans: [], findings: [], files: [] });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setResults({ scans: [], findings: [], files: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/analysis/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data);
      } catch {
        setResults({ scans: [], findings: [], files: [] });
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleKeyDown = useCallback(e => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const totalResults = results.scans.length + results.findings.length + results.files.length;
  const hasResults = totalResults > 0;
  const SEVERITY_COLORS = { CRITICAL: "#ff4d4f", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22c55e" };

  const sections = [
    { key: "scans", label: "Scans", count: results.scans.length },
    { key: "findings", label: "Findings", count: results.findings.length },
    { key: "files", label: "Files", count: results.files.length },
  ].filter(s => s.count > 0);

  const currentSection = sections.find(s => s.key === activeSection) ? activeSection : sections[0]?.key;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "80px" }}
      onClick={onClose}>
      <div className="modal-enter" style={{ width: "100%", maxWidth: "640px", maxHeight: "70vh", background: "rgba(6,6,14,0.98)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}>

        {/* Search Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px", flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search repos, files, findings, scans..."
            style={{ flex: 1, background: "none", border: "none", color: "#fff", fontFamily: "monospace", fontSize: "13px", outline: "none" }}
          />
          {loading && <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(139,92,246,0.7)", letterSpacing: "0.1em" }}>SEARCHING...</span>}
          <kbd style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "2px 6px" }}>ESC</kbd>
        </div>

        {/* Section tabs */}
        {hasResults && (
          <div style={{ display: "flex", gap: "2px", padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {sections.map(s => (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                style={{ fontFamily: "monospace", fontSize: "9px", padding: "4px 10px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid transparent", transition: "all 0.15s", background: currentSection === s.key ? "rgba(255,255,255,0.07)" : "transparent", color: currentSection === s.key ? "#fff" : "rgba(255,255,255,0.4)", borderColor: currentSection === s.key ? "rgba(255,255,255,0.15)" : "transparent" }}>
                {s.label} ({s.count})
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto" }} className="custom-scrollbar">
          {query.trim().length < 2 ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em" }}>TYPE TO SEARCH</div>
              <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.12)", marginTop: "8px" }}>Repos, files, security findings, scan history...</div>
            </div>
          ) : !hasResults && !loading ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em" }}>NO RESULTS FOR "{query}"</div>
            </div>
          ) : (
            <div>
              {/* Scans */}
              {currentSection === "scans" && results.scans.map(s => (
                <div key={s.id} onClick={() => { navigate(`/scan/${s.id}`); onClose(); }}
                  style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: "14px", opacity: 0.5 }}>📊</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#fff", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.repository?.fullName || "Unknown"}
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"} · {s.status}
                    </div>
                  </div>
                  {s.healthScore?.overall != null && (
                    <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: "800", color: s.healthScore.overall >= 80 ? "#22c55e" : s.healthScore.overall >= 60 ? "#eab308" : "#ef4444" }}>
                      {s.healthScore.overall}
                    </span>
                  )}
                </div>
              ))}

              {/* Findings */}
              {currentSection === "findings" && results.findings.map(f => (
                <div key={f.id} onClick={() => { navigate(`/scan/${f.scanId}`); onClose(); }}
                  style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "8px", padding: "1px 6px", border: "1px solid", textTransform: "uppercase", color: SEVERITY_COLORS[f.severity?.toUpperCase()] || "#fff", borderColor: `${SEVERITY_COLORS[f.severity?.toUpperCase()] || "#fff"}40`, background: `${SEVERITY_COLORS[f.severity?.toUpperCase()] || "#fff"}0f` }}>
                      {f.severity?.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: SEVERITY_COLORS[f.severity?.toUpperCase()] || "#fff", fontWeight: "bold" }}>{f.type}</span>
                  </div>
                  <div style={{ fontFamily: "sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.description}</div>
                  <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                    {f.repository?.name} · {f.file?.split("/").pop()}
                  </div>
                </div>
              ))}

              {/* Files */}
              {currentSection === "files" && results.files.map(f => (
                <div key={f.id} onClick={() => { navigate(`/scan/${f.scanId}`); onClose(); }}
                  style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "12px", opacity: 0.4 }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.path}</div>
                      <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                        {f.repository?.name} · {f.metrics?.linesOfCode || 0} LOC · {f.classification?.type || f.extension}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>↑↓ Navigate · Enter Select · Esc Close</span>
          {hasResults && <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>{totalResults} result{totalResults !== 1 ? "s" : ""}</span>}
        </div>
      </div>
    </div>
  );
}
