import { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import api from "../services/api.js";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const SEVERITY_COLOR = {
  LOW: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)", text: "#22c55e" },
  MEDIUM: { bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", text: "#eab308" },
  HIGH: { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", text: "#f97316" },
  CRITICAL: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", text: "#ef4444" },
};

const RISK_BG = {
  LOW: "rgba(34,197,94,0.15)",
  MEDIUM: "rgba(234,179,8,0.15)",
  HIGH: "rgba(249,115,22,0.15)",
  CRITICAL: "rgba(239,68,68,0.15)",
};

/* ─── sub-components ────────────────────────────────────────────────────────── */
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 20px",
        fontFamily: "monospace",
        fontSize: "11px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        background: active ? "rgba(139,92,246,0.15)" : "transparent",
        color: active ? "#a78bfa" : "rgba(255,255,255,0.4)",
        border: "none",
        borderBottom: active ? "2px solid #8b5cf6" : "2px solid transparent",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {children}
    </button>
  );
}

function Chip({ color, children }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 7px",
        borderRadius: "3px",
        fontSize: "9px",
        fontFamily: "monospace",
        letterSpacing: "0.1em",
        fontWeight: "700",
        background: color.bg,
        border: `1px solid ${color.border}`,
        color: color.text,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/* Simple inline file-tree for repo picker */
function FileItem({ item, owner, repo, onSelectFile, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const isDir = item.type === "dir";

  const toggle = async () => {
    if (!isDir) {
      onSelectFile(item.path, item.name);
      return;
    }
    if (!open && children.length === 0) {
      setLoadingChildren(true);
      try {
        const { data } = await api.get(`/repos/${owner}/${repo}/files?path=${item.path}`);
        setChildren(data.files || []);
      } catch {
        // ignore
      } finally {
        setLoadingChildren(false);
      }
    }
    setOpen((o) => !o);
  };

  return (
    <div>
      <div
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 8px",
          paddingLeft: `${8 + depth * 16}px`,
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: "11px",
          color: isDir ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.5)",
          transition: "background 0.15s",
          borderRadius: "3px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {isDir ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
            {open ? (
              <path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h7a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            )}
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        <span>{item.name}</span>
        {loadingChildren && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "9px" }}>...</span>}
      </div>
      {open && children.map((child) => (
        <FileItem key={child.path} item={child} owner={owner} repo={repo} onSelectFile={onSelectFile} depth={depth + 1} />
      ))}
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────────────────── */
export default function CodeExplorer() {
  // Input mode
  const [inputMode, setInputMode] = useState("repo"); // "repo" | "manual"

  // Repo picker state
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null); // { owner, name }
  const [rootFiles, setRootFiles] = useState([]);
  const [rootLoading, setRootLoading] = useState(false);
  const [selectedRepoFile, setSelectedRepoFile] = useState(null); // { path, name }

  // Manual mode state
  const [manualMode, setManualMode] = useState("paste"); // "paste" | "upload"
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const fileInputRef = useRef(null);

  // Analysis state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Result view tabs
  const [resultTab, setResultTab] = useState("lines"); // "overview" | "lines" | "security"

  // Load repos on mount if in repo mode
  useEffect(() => {
    if (inputMode === "repo" && repos.length === 0) {
      setReposLoading(true);
      api.get("/repos")
        .then(({ data }) => setRepos(data || []))
        .catch(() => {})
        .finally(() => setReposLoading(false));
    }
  }, [inputMode]);

  // When a repo is selected, load root files
  useEffect(() => {
    if (!selectedRepo) return;
    setRootLoading(true);
    setRootFiles([]);
    setSelectedRepoFile(null);
    api.get(`/repos/${selectedRepo.owner}/${selectedRepo.name}/files`)
      .then(({ data }) => setRootFiles(data.files || []))
      .catch(() => {})
      .finally(() => setRootLoading(false));
  }, [selectedRepo]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setContent(ev.target.result);
    reader.readAsText(file);
  };

  const handleSelectRepoFile = useCallback((path, name) => {
    setSelectedRepoFile({ path, name });
    setResult(null);
    setError("");
  }, []);

  const canRun = inputMode === "repo"
    ? !!(selectedRepo && selectedRepoFile)
    : !!(filename && content);

  const handleExplore = async () => {
    if (!canRun) return;
    setLoading(true);
    setError("");
    setResult(null);
    setResultTab("lines");

    try {
      let data;
      if (inputMode === "repo") {
        const res = await api.post("/analysis/explore-repo", {
          owner: selectedRepo.owner,
          repoName: selectedRepo.name,
          filePath: selectedRepoFile.path,
        });
        data = res.data;
      } else {
        const res = await api.post("/analysis/explore", { filename, content });
        data = res.data;
      }
      setResult(data.explanation);
    } catch (err) {
      setError(err?.response?.data?.message || "Exploration failed.");
    } finally {
      setLoading(false);
    }
  };

  const displayName = inputMode === "repo"
    ? selectedRepoFile?.path || "No file selected"
    : filename || "No file selected";

  const risk = result?.securityReport?.overallRisk || "LOW";
  const riskColor = SEVERITY_COLOR[risk] || SEVERITY_COLOR.LOW;

  return (
    <DashboardLayout>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "rgba(5,5,10,0.98)",
        }}
      >
        {/* ── Top Header ── */}
        <div
          style={{
            padding: "18px 24px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: "monospace",
              fontWeight: "700",
              fontSize: "18px",
              color: "#fff",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Code Explorer
          </h1>
          <p style={{ margin: "6px 0 0", fontFamily: "monospace", fontSize: "12px", color: "rgba(255,255,255,0.35)", lineHeight: "1.5" }}>
            Select a file from your repo or paste code manually — get line-by-line AI analysis + security report.
          </p>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", gap: 0 }}>

          {/* ── Left Panel: Input ── */}
          <div
            style={{
              width: "340px",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            {/* Mode Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
              <TabBtn active={inputMode === "repo"} onClick={() => { setInputMode("repo"); setResult(null); }}>
                From Repo
              </TabBtn>
              <TabBtn active={inputMode === "manual"} onClick={() => { setInputMode("manual"); setResult(null); }}>
                Manual
              </TabBtn>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
              {/* ── REPO MODE ── */}
              {inputMode === "repo" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Repo Select */}
                  <div>
                    <label style={{ display: "block", fontFamily: "monospace", fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", marginBottom: "6px", textTransform: "uppercase" }}>
                      1 — Select Repository
                    </label>
                    {reposLoading ? (
                      <p style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "12px 0" }}>Loading repos…</p>
                    ) : (
                      <div
                        style={{
                          maxHeight: "140px",
                          overflowY: "auto",
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(0,0,0,0.3)",
                          borderRadius: "4px",
                        }}
                      >
                        {repos.map((r) => {
                          const isSelected = selectedRepo?.name === r.name && selectedRepo?.owner === r.owner?.login;
                          return (
                            <div
                              key={r.id}
                              onClick={() => setSelectedRepo({ owner: r.owner?.login, name: r.name })}
                              style={{
                                padding: "7px 10px",
                                fontFamily: "monospace",
                                fontSize: "11px",
                                cursor: "pointer",
                                color: isSelected ? "#a78bfa" : "rgba(255,255,255,0.55)",
                                background: isSelected ? "rgba(139,92,246,0.12)" : "transparent",
                                borderLeft: isSelected ? "2px solid #8b5cf6" : "2px solid transparent",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                            >
                              {r.full_name}
                            </div>
                          );
                        })}
                        {repos.length === 0 && (
                          <p style={{ padding: "12px", fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
                            No repos found. Connect GitHub first.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* File Browser */}
                  {selectedRepo && (
                    <div>
                      <label style={{ display: "block", fontFamily: "monospace", fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", marginBottom: "6px", textTransform: "uppercase" }}>
                        2 — Browse &amp; Select File
                      </label>
                      <div
                        style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(0,0,0,0.3)",
                          borderRadius: "4px",
                          maxHeight: "260px",
                          overflowY: "auto",
                          padding: "4px 0",
                        }}
                      >
                        {rootLoading ? (
                          <p style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "12px 0" }}>Loading files…</p>
                        ) : rootFiles.map((f) => (
                          <FileItem
                            key={f.path}
                            item={f}
                            owner={selectedRepo.owner}
                            repo={selectedRepo.name}
                            onSelectFile={handleSelectRepoFile}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected File indicator */}
                  {selectedRepoFile && (
                    <div
                      style={{
                        padding: "8px 10px",
                        border: "1px solid rgba(139,92,246,0.3)",
                        background: "rgba(139,92,246,0.08)",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                        fontSize: "10px",
                        color: "#a78bfa",
                        wordBreak: "break-all",
                      }}
                    >
                      ✓ {selectedRepoFile.path}
                    </div>
                  )}
                </div>
              )}

              {/* ── MANUAL MODE ── */}
              {inputMode === "manual" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Sub-tabs */}
                  <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "8px" }}>
                    {["paste", "upload"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setManualMode(m)}
                        style={{
                          background: "none",
                          border: "none",
                          fontFamily: "monospace",
                          fontSize: "10px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          color: manualMode === m ? "#a78bfa" : "rgba(255,255,255,0.35)",
                          borderBottom: manualMode === m ? "1px solid #8b5cf6" : "1px solid transparent",
                          paddingBottom: "4px",
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Filename */}
                  <div>
                    <label style={{ display: "block", fontFamily: "monospace", fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", marginBottom: "5px", textTransform: "uppercase" }}>
                      Filename
                    </label>
                    <input
                      type="text"
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      placeholder="e.g. index.js"
                      style={{
                        width: "100%",
                        background: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff",
                        fontFamily: "monospace",
                        fontSize: "11px",
                        padding: "8px 10px",
                        outline: "none",
                        borderRadius: "3px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Content */}
                  {manualMode === "paste" ? (
                    <div>
                      <label style={{ display: "block", fontFamily: "monospace", fontSize: "9px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", marginBottom: "5px", textTransform: "uppercase" }}>
                        Code
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Paste your code here…"
                        style={{
                          width: "100%",
                          height: "200px",
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff",
                          fontFamily: "monospace",
                          fontSize: "11px",
                          padding: "8px 10px",
                          outline: "none",
                          resize: "none",
                          borderRadius: "3px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        height: "120px",
                        border: "1px dashed rgba(139,92,246,0.3)",
                        background: "rgba(139,92,246,0.04)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        borderRadius: "4px",
                        transition: "border-color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)")}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" style={{ marginBottom: "6px" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
                        {filename ? `✓ ${filename}` : "Click to upload file"}
                      </span>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  margin: "0 16px 10px",
                  padding: "8px 12px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "3px",
                  fontFamily: "monospace",
                  fontSize: "10px",
                  color: "#ef4444",
                  flexShrink: 0,
                }}
              >
                {error}
              </div>
            )}

            {/* Run Button */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
              <button
                onClick={handleExplore}
                disabled={loading || !canRun}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: loading || !canRun ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #7c3aed, #8b5cf6)",
                  color: loading || !canRun ? "rgba(255,255,255,0.3)" : "#fff",
                  border: "1px solid rgba(139,92,246,0.4)",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: loading || !canRun ? "not-allowed" : "pointer",
                  borderRadius: "4px",
                  transition: "all 0.2s",
                }}
              >
                {loading ? "⟳  Analysing…" : "▶  Run Explorer"}
              </button>
            </div>
          </div>

          {/* ── Right Panel: Results ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {!result && !loading && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.12)", userSelect: "none" }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <p style={{ fontFamily: "monospace", fontSize: "12px", marginTop: "12px" }}>
                  {inputMode === "repo" ? "Select a repo file and run the explorer" : "Paste code and run the explorer"}
                </p>
              </div>
            )}

            {loading && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", border: "2px solid rgba(139,92,246,0.2)", borderTop: "2px solid #8b5cf6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
                  AI is analysing {displayName}…
                </p>
              </div>
            )}

            {result && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Result Header */}
                <div
                  style={{
                    padding: "12px 20px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                    <span style={{ color: "#8b5cf6" }}>◆ </span>{displayName}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>SECURITY RISK:</span>
                    <Chip color={riskColor}>{risk}</Chip>
                  </div>
                </div>

                {/* Tab bar */}
                <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                  <TabBtn active={resultTab === "overview"} onClick={() => setResultTab("overview")}>Overview</TabBtn>
                  <TabBtn active={resultTab === "lines"} onClick={() => setResultTab("lines")}>
                    Notable Lines {result.notableLines ? `(${result.notableLines.length})` : ""}
                  </TabBtn>
                  <TabBtn active={resultTab === "security"} onClick={() => setResultTab("security")}>
                    Security {result.securityReport?.vulnerabilities?.length ? `(${result.securityReport.vulnerabilities.length})` : ""}
                  </TabBtn>
                </div>

                {/* Tab Content */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

                  {/* ── OVERVIEW TAB ── */}
                  {resultTab === "overview" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* Purpose */}
                      <div style={{ padding: "16px 20px", background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "6px" }}>
                        <h3 style={{ margin: "0 0 8px", fontFamily: "monospace", fontSize: "10px", color: "#8b5cf6", letterSpacing: "0.15em", textTransform: "uppercase" }}>Purpose</h3>
                        <p style={{ margin: 0, fontFamily: "sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.8)", lineHeight: "1.7" }}>{result.purpose}</p>
                      </div>
                      {/* Architecture */}
                      {result.architecture && (
                        <div style={{ padding: "16px 20px", background: "rgba(10,10,20,0.7)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px" }}>
                          <h3 style={{ margin: "0 0 8px", fontFamily: "monospace", fontSize: "10px", color: "#60a5fa", letterSpacing: "0.15em", textTransform: "uppercase" }}>Architecture</h3>
                          <p style={{ margin: 0, fontFamily: "sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: "1.7" }}>{result.architecture}</p>
                        </div>
                      )}
                      {/* Improvements */}
                      {result.improvements?.length > 0 && (
                        <div style={{ padding: "16px 20px", background: "rgba(10,10,20,0.7)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px" }}>
                          <h3 style={{ margin: "0 0 10px", fontFamily: "monospace", fontSize: "10px", color: "#34d399", letterSpacing: "0.15em", textTransform: "uppercase" }}>High-Level Improvements</h3>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                            {result.improvements.map((imp, idx) => (
                              <li key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                <span style={{ color: "#34d399", fontSize: "12px", flexShrink: 0, marginTop: "1px" }}>→</span>
                                <span style={{ fontFamily: "sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: "1.6" }}>{imp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── LINE ANALYSIS TAB ── */}
                  {resultTab === "lines" && (
                    <div>
                      {!result.notableLines || result.notableLines.length === 0 ? (
                        <p style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0" }}>
                          No notable lines identified.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {result.notableLines.map((line, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "40px 1fr",
                                borderRadius: "3px",
                                overflow: "hidden",
                                border: line.securityFlag
                                  ? "1px solid rgba(239,68,68,0.2)"
                                  : line.improvement
                                  ? "1px solid rgba(234,179,8,0.1)"
                                  : "1px solid rgba(255,255,255,0.04)",
                                background: line.securityFlag
                                  ? "rgba(239,68,68,0.04)"
                                  : "rgba(255,255,255,0.015)",
                                marginBottom: "3px",
                              }}
                            >
                              {/* Line number gutter */}
                              <div
                                style={{
                                  background: "rgba(0,0,0,0.3)",
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "center",
                                  padding: "8px 4px",
                                  fontFamily: "monospace",
                                  fontSize: "10px",
                                  color: "rgba(255,255,255,0.2)",
                                  userSelect: "none",
                                  flexShrink: 0,
                                }}
                              >
                                {line.number}
                              </div>
                              {/* Content */}
                              <div style={{ padding: "8px 12px" }}>
                                {/* Code */}
                                <pre
                                  style={{
                                    margin: "0 0 6px",
                                    fontFamily: "monospace",
                                    fontSize: "11px",
                                    color: "rgba(255,255,255,0.75)",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {line.code || " "}
                                </pre>
                                {/* Explanation */}
                                {line.explanation && (
                                  <p
                                    style={{
                                      margin: "0 0 4px",
                                      fontFamily: "sans-serif",
                                      fontSize: "11px",
                                      color: "rgba(255,255,255,0.45)",
                                      lineHeight: "1.5",
                                    }}
                                  >
                                    {line.explanation}
                                  </p>
                                )}
                                {/* Tags row */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                                  {line.improvement && (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "4px",
                                        background: "rgba(234,179,8,0.07)",
                                        border: "1px solid rgba(234,179,8,0.2)",
                                        borderRadius: "3px",
                                        padding: "3px 7px",
                                        maxWidth: "100%",
                                      }}
                                    >
                                      <span style={{ color: "#eab308", fontSize: "9px", fontFamily: "monospace", fontWeight: "700", flexShrink: 0, marginTop: "1px" }}>IMPROVE</span>
                                      <span style={{ fontFamily: "sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.5)", lineHeight: "1.4" }}>{line.improvement}</span>
                                    </div>
                                  )}
                                  {line.securityFlag && (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "4px",
                                        background: "rgba(239,68,68,0.07)",
                                        border: "1px solid rgba(239,68,68,0.2)",
                                        borderRadius: "3px",
                                        padding: "3px 7px",
                                        maxWidth: "100%",
                                      }}
                                    >
                                      <span style={{ color: "#ef4444", fontSize: "9px", fontFamily: "monospace", fontWeight: "700", flexShrink: 0, marginTop: "1px" }}>⚠ SEC</span>
                                      <span style={{ fontFamily: "sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.5)", lineHeight: "1.4" }}>{line.securityFlag}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── SECURITY TAB ── */}
                  {resultTab === "security" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* Overall risk banner */}
                      <div
                        style={{
                          padding: "16px 20px",
                          background: RISK_BG[risk] || "rgba(34,197,94,0.15)",
                          border: `1px solid ${riskColor.border}`,
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: "monospace", fontSize: "9px", letterSpacing: "0.15em", color: riskColor.text, textTransform: "uppercase", marginBottom: "4px" }}>
                            Overall Risk Level
                          </div>
                          <div style={{ fontFamily: "monospace", fontSize: "24px", fontWeight: "700", color: riskColor.text }}>{risk}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontFamily: "sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: "1.6" }}>
                            {result.securityReport?.summary || "No summary available."}
                          </p>
                        </div>
                      </div>

                      {/* Vulnerabilities */}
                      {result.securityReport?.vulnerabilities?.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <h3 style={{ margin: 0, fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                            Vulnerabilities ({result.securityReport.vulnerabilities.length})
                          </h3>
                          {result.securityReport.vulnerabilities.map((vuln, idx) => {
                            const sc = SEVERITY_COLOR[vuln.severity] || SEVERITY_COLOR.LOW;
                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: "14px 18px",
                                  background: sc.bg,
                                  border: `1px solid ${sc.border}`,
                                  borderRadius: "6px",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                                  <div style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: "700", color: "#fff" }}>{vuln.title}</div>
                                  <Chip color={sc}>{vuln.severity}</Chip>
                                </div>
                                {vuln.lineNumbers?.length > 0 && (
                                  <div style={{ fontFamily: "monospace", fontSize: "9px", color: sc.text, letterSpacing: "0.1em", marginBottom: "6px" }}>
                                    LINES: {vuln.lineNumbers.join(", ")}
                                  </div>
                                )}
                                <p style={{ margin: "0 0 8px", fontFamily: "sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: "1.6" }}>
                                  {vuln.description}
                                </p>
                                <div
                                  style={{
                                    padding: "8px 10px",
                                    background: "rgba(0,0,0,0.3)",
                                    borderRadius: "3px",
                                    fontFamily: "sans-serif",
                                    fontSize: "11px",
                                    color: "rgba(255,255,255,0.5)",
                                    lineHeight: "1.5",
                                    borderLeft: `2px solid ${sc.text}`,
                                  }}
                                >
                                  <span style={{ color: sc.text, fontFamily: "monospace", fontSize: "9px", letterSpacing: "0.1em", fontWeight: "700" }}>FIX: </span>
                                  {vuln.recommendation}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "30px",
                            textAlign: "center",
                            fontFamily: "monospace",
                            fontSize: "11px",
                            color: "#22c55e",
                            border: "1px solid rgba(34,197,94,0.2)",
                            borderRadius: "6px",
                            background: "rgba(34,197,94,0.05)",
                          }}
                        >
                          ✓ No vulnerabilities detected.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
      `}</style>
    </DashboardLayout>
  );
}
