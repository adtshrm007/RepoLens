import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import FileTree from "../Components/repositories/FileTree.jsx";
import api from "../services/api.js";

export default function RepoExplorer() {
  const { owner, repo } = useParams();
  const navigate = useNavigate();

  const [repoInfo, setRepoInfo] = useState(null);
  const [rootFiles, setRootFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  
  const [activeTab, setActiveTab] = useState("explorer"); // "explorer" | "documentation"
  const [docs, setDocs] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");

  useEffect(() => {
    const fetchRepo = async () => {
      try {
        const [repoRes, filesRes] = await Promise.all([
          api.get(`/repos/${owner}/${repo}`),
          api.get(`/repos/${owner}/${repo}/files`),
        ]);
        setRepoInfo(repoRes.data);
        setRootFiles(filesRes.data?.files || []);
      } catch {
        setError("ACCESS DENIED OR REPOSITORY UNAVAILABLE.");
      } finally {
        setLoading(false);
      }
    };
    fetchRepo();
  }, [owner, repo]);

  const handleToggleFile = (path) => {
    setSelectedFiles((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleRunAnalysis = async () => {
    if (selectedFiles.length === 0) return;
    setRunning(true);
    try {
      const { data } = await api.post("/analysis/run", {
        owner,
        repoName: repo,
        filePaths: selectedFiles,
      });
      navigate(`/analysis/${data.analysis.id}`, {
        state: {
          maintainabilityScore: data.maintainabilityScore,
          goodPractices: data.goodPractices,
          structureIssues: data.structureIssues,
          improvementPriorities: data.improvementPriorities,
        }
      });
    } catch (err) {
      alert("Analysis failed.");
      setRunning(false);
    }
  };

  const loadDocumentation = async () => {
    if (docs) return; // already loaded
    setDocsLoading(true);
    setDocsError("");
    try {
      const { data } = await api.post("/analysis/generate-docs", { owner, repoName: repo });
      setDocs(data.markdown);
    } catch (err) {
      setDocsError(err?.response?.data?.message || "Failed to generate documentation.");
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "documentation") {
      loadDocumentation();
    }
  }, [activeTab]);

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-up h-full flex flex-col">
        {/* ── Header Block ── */}
        <div
          className="px-4 py-3 flex items-center justify-between shrink-0"
          style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <a
                href="/repositories"
                className="text-white/40 hover:text-white transition-colors text-[10px] font-mono uppercase tracking-widest"
                style={{ textDecoration: "none" }}
              >
                ← BACK
              </a>
              <span className="text-white/20">/</span>
              <h1 className="text-white font-mono font-bold text-[13px] tracking-wide">
                {owner} / {repo}
              </h1>
            </div>
            <p className="text-white/40 font-mono text-[11px] leading-relaxed">
              Target acquired. Select payload files for static analysis sequence.
            </p>
          </div>

          {repoInfo && (
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-white/60">
              <div className="flex flex-col items-end">
                <span className="text-white/30 text-[9px] mb-0.5">Language</span>
                <span className="text-white font-mono font-bold">{repoInfo.language || "UNKNOWN"}</span>
              </div>
              <div className="w-[1px] h-6 bg-white/10" />
              <div className="flex flex-col items-end">
                <span className="text-white/30 text-[9px] mb-0.5">Visibility</span>
                <span className={`font-mono font-bold ${repoInfo.private ? "text-[#ef4444]" : "text-[#22c55e]"}`}>
                  {repoInfo.private ? "PRIVATE" : "PUBLIC"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-white/10 px-4 shrink-0">
          <button
            onClick={() => setActiveTab("explorer")}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              activeTab === "explorer" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            File Explorer
          </button>
          <button
            onClick={() => setActiveTab("documentation")}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              activeTab === "documentation" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            Documentation
          </button>
        </div>

        {error ? (
          <div
            className="p-4 text-center text-[#ef4444] font-mono text-[11px] uppercase tracking-widest"
            style={{ border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.03)" }}
          >
            {error}
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white/40 font-mono text-[10px] animate-pulse uppercase tracking-widest">
              MOUNTING FILESYSTEM_
            </div>
          </div>
        ) : (
          <div className="flex-1 flex gap-4 overflow-hidden pb-4 px-4">
            {activeTab === "explorer" && (
              <>
                {/* File Tree */}
                <div
                  className="w-[300px] flex flex-col shrink-0"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
                >
                  <div
                    className="p-3 flex justify-between items-center"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                  >
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono">
                      File Explorer
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 text-[11px]">
                    <FileTree
                      owner={owner}
                      repo={repo}
                      rootFiles={rootFiles}
                      selectedFiles={selectedFiles}
                      onToggleFile={handleToggleFile}
                    />
                  </div>
                </div>

                {/* Actions Panel */}
                <div
                  className="flex-1 p-4 flex flex-col relative overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
                >
                  {/* bg icon */}
                  <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none">
                    <svg className="w-64 h-64 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>

                  <h2 className="text-white font-mono font-bold text-[12px] mb-3">Selected Payload</h2>

                  <div
                    className="flex-1 p-3 overflow-y-auto z-10"
                    style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}
                  >
                    {selectedFiles.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-white/25 text-[10px] uppercase tracking-widest font-mono">
                        AWAITING FILE SELECTION...
                      </div>
                    ) : (
                      <ul className="space-y-1">
                        {selectedFiles.map((f) => (
                          <li key={f} className="text-[11px] text-white/60 font-mono flex items-center gap-2">
                            <span className="text-white/40">&gt;</span> {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between shrink-0 z-10">
                    <div className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
                      Total Files: <span className="text-white">{selectedFiles.length}</span>
                    </div>

                    <button
                      onClick={handleRunAnalysis}
                      disabled={selectedFiles.length === 0 || running}
                      className="px-6 py-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: selectedFiles.length === 0 || running ? "transparent" : "white",
                        color: selectedFiles.length === 0 || running ? "rgba(255,255,255,0.4)" : "black",
                        border: "1px solid rgba(255,255,255,0.3)",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedFiles.length > 0 && !running) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.90)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedFiles.length > 0 && !running) {
                          e.currentTarget.style.background = "white";
                        }
                      }}
                    >
                      {running ? "INITIALIZING SEQUENCE..." : "EXECUTE ANALYSIS"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === "documentation" && (
              <div className="flex-1 flex flex-col overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(234,179,8,0.1)" }}>
                  <p className="text-[#eab308] font-mono text-[11px]">
                    <strong>NOTE:</strong> This documentation is generated dynamically based on the files analyzed so far. If the documentation is inaccurate or incomplete, please analyze more files from different folders of the repository to provide more context.
                  </p>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                  {docsLoading ? (
                    <div className="h-full flex items-center justify-center text-white/40 font-mono text-[10px] animate-pulse uppercase tracking-widest">
                      SYNTHESIZING KNOWLEDGE BASE...
                    </div>
                  ) : docsError ? (
                    <div className="h-full flex items-center justify-center text-[#ef4444] font-mono text-[11px] uppercase tracking-widest">
                      {docsError}
                    </div>
                  ) : docs ? (
                    <div className="text-white/80 font-sans text-[13px] leading-relaxed">
                      {docs.split('\n').map((line, i) => {
                        if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-white mt-4 mb-2">{line.replace('# ', '')}</h1>;
                        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.replace('## ', '')}</h2>;
                        if (line.startsWith('### ')) return <h3 key={i} className="text-md font-bold text-white mt-3 mb-1">{line.replace('### ', '')}</h3>;
                        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 mb-1">{line.replace(/^[-*]\s/, '')}</li>;
                        if (line.trim() === '') return <br key={i} />;
                        return <p key={i} className="mb-2">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
