import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import api from "../services/api.js";

export default function RepoExplorer() {
  const { owner, repo } = useParams();
  const navigate = useNavigate();

  const [repoInfo, setRepoInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  
  const [activeTab, setActiveTab] = useState("explorer"); // "explorer" | "documentation" | "techstack"
  const [docs, setDocs] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");

  const [techStack, setTechStack] = useState(null);
  const [techStackLoading, setTechStackLoading] = useState(false);
  const [techStackError, setTechStackError] = useState("");

  useEffect(() => {
    const fetchRepo = async () => {
      try {
        const [repoRes] = await Promise.all([
          api.get(`/repos/${owner}/${repo}`)
        ]);
        setRepoInfo(repoRes.data);
      } catch (err) {
        if (err?.response?.data?.code === "GITHUB_TOKEN_EXPIRED") {
          setError("Your GitHub connection has expired.");
        } else {
          setError("Failed to fetch repository data.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRepo();
  }, [owner, repo]);


  const handleRunAnalysis = async () => {
    setRunning(true);
    try {
      const { data } = await api.post("/scan", {
        owner,
        repoName: repo,
      });
      navigate(`/scan/${data.scanId}`);
    } catch (err) {
      if (err?.response?.data?.code === "GITHUB_TOKEN_EXPIRED") {
        setError("Your GitHub connection has expired.");
      } else {
        alert("Scan failed.");
      }
      setRunning(false);
    }
  };



  useEffect(() => {
    if (activeTab === "documentation") {
      const fetchDocs = async () => {
        if (docs) return;
        setDocsLoading(true);
        setDocsError("");
        try {
          const { data } = await api.post("/analysis/generate-docs", { owner, repoName: repo });
          setDocs(data.markdown);
        } catch (err) {
          if (err?.response?.data?.code === "GITHUB_TOKEN_EXPIRED") {
            setError("Your GitHub connection has expired.");
          } else {
            setDocsError(err?.response?.data?.message || "Failed to generate documentation.");
          }
        } finally {
          setDocsLoading(false);
        }
      };
      fetchDocs();
    } else if (activeTab === "techstack") {
      const fetchStack = async () => {
        if (techStack) return;
        setTechStackLoading(true);
        setTechStackError("");
        try {
          const { data } = await api.get(`/repos/${owner}/${repo}/tech-stack`);
          setTechStack(data);
        } catch (err) {
          if (err?.response?.data?.code === "GITHUB_TOKEN_EXPIRED") {
            setError("Your GitHub connection has expired.");
          } else {
            setTechStackError(err?.response?.data?.message || "Failed to load tech stack.");
          }
        } finally {
          setTechStackLoading(false);
        }
      };
      fetchStack();
    }
  }, [activeTab, docs, techStack, owner, repo]);

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-up h-full flex flex-col">
        {/* ── Header Block ── */}
        <div
          className="px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0"
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
        <div className="flex border-b border-white/10 px-4 shrink-0 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("explorer")}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors shrink-0 ${
              activeTab === "explorer" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            Scanner
          </button>
          <button
            onClick={() => setActiveTab("techstack")}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors shrink-0 ${
              activeTab === "techstack" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            Tech Stack & Structure
          </button>
          <button
            onClick={() => setActiveTab("documentation")}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors shrink-0 ${
              activeTab === "documentation" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            Documentation
          </button>
        </div>

        {error ? (
          <div className="p-4 flex flex-col items-center justify-center">
            <div
              className="p-4 text-center text-[#ef4444] font-mono text-[11px] uppercase tracking-widest mb-4"
              style={{ border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.03)" }}
            >
              {error}
            </div>
            {error === "Your GitHub connection has expired." && (
              <a
                href={`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/github`}
                className="px-6 py-2.5 bg-white text-black font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white/90 transition-colors"
                style={{ textDecoration: "none" }}
              >
                Reconnect GitHub
              </a>
            )}
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white/40 font-mono text-[10px] animate-pulse uppercase tracking-widest">
              MOUNTING FILESYSTEM_
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-y-auto lg:overflow-hidden pb-4 px-4">
            {activeTab === "explorer" && (
              <div
                className="w-full flex flex-col justify-center items-center text-center p-12 shrink-0 min-h-[400px]"
                style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
              >
                <div className="mb-6 opacity-30">
                  <svg className="w-24 h-24 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                
                <h2 className="text-white font-mono font-bold text-[16px] mb-2 tracking-[0.2em] uppercase">Repository Intelligence Scanner</h2>
                <p className="text-white/40 font-mono text-[11px] max-w-lg mb-8 leading-relaxed">
                  Initiate a comprehensive scan of the entire repository. The system will map dependencies, extract architecture diagrams, and evaluate overall code health.
                </p>

                <button
                  onClick={handleRunAnalysis}
                  disabled={running}
                  className="px-8 py-3 text-[12px] font-mono font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: running ? "transparent" : "white",
                    color: running ? "rgba(255,255,255,0.4)" : "black",
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    if (!running) e.currentTarget.style.background = "rgba(255,255,255,0.90)";
                  }}
                  onMouseLeave={(e) => {
                    if (!running) e.currentTarget.style.background = "white";
                  }}
                >
                  {running ? "INITIALIZING SEQUENCE..." : "SCAN ENTIRE REPOSITORY"}
                </button>
              </div>
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

            {activeTab === "techstack" && (
              <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden pb-4 px-4">
                {/* Tech Stack Panel */}
                <div className="flex-1 flex flex-col overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono">Tech Stack (package.json)</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {techStackLoading ? (
                      <div className="h-full flex items-center justify-center text-white/40 font-mono text-[10px] animate-pulse uppercase tracking-widest">
                        ANALYZING DEPENDENCIES_
                      </div>
                    ) : techStackError ? (
                      <div className="h-full flex items-center justify-center text-[#ef4444] font-mono text-[11px] uppercase tracking-widest">
                        {techStackError}
                      </div>
                    ) : techStack ? (
                      <div className="space-y-6">
                        {techStack.dependencies && Object.keys(techStack.dependencies).length > 0 && (
                          <div>
                            <h3 className="text-white font-mono font-bold text-[11px] uppercase tracking-widest mb-3 text-emerald-400">Dependencies</h3>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(techStack.dependencies).map(([name, version]) => (
                                <div key={name} className="px-3 py-1.5 bg-emerald-400/5 border border-emerald-400/20 rounded font-mono text-[10px] flex items-center gap-2">
                                  <span className="text-white/80">{name}</span>
                                  <span className="text-emerald-400/60">{version}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {techStack.devDependencies && Object.keys(techStack.devDependencies).length > 0 && (
                          <div>
                            <h3 className="text-white font-mono font-bold text-[11px] uppercase tracking-widest mb-3 text-yellow-500">Dev Dependencies</h3>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(techStack.devDependencies).map(([name, version]) => (
                                <div key={name} className="px-3 py-1.5 bg-yellow-500/5 border border-yellow-500/20 rounded font-mono text-[10px] flex items-center gap-2">
                                  <span className="text-white/80">{name}</span>
                                  <span className="text-yellow-500/60">{version}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {techStack.scripts && Object.keys(techStack.scripts).length > 0 && (
                          <div>
                            <h3 className="text-white font-mono font-bold text-[11px] uppercase tracking-widest mb-3 text-blue-400">Scripts</h3>
                            <div className="flex flex-col gap-2">
                              {Object.entries(techStack.scripts).map(([name, cmd]) => (
                                <div key={name} className="px-3 py-2 bg-blue-400/5 border border-blue-400/20 rounded font-mono text-[10px] flex flex-col gap-1">
                                  <span className="text-blue-400 font-bold">{name}</span>
                                  <span className="text-white/50 truncate" title={cmd}>{cmd}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(!techStack.dependencies || Object.keys(techStack.dependencies).length === 0) &&
                         (!techStack.devDependencies || Object.keys(techStack.devDependencies).length === 0) &&
                         (!techStack.scripts || Object.keys(techStack.scripts).length === 0) && (
                          <div className="text-white/30 font-mono text-[10px] uppercase tracking-widest text-center py-8">
                            No package.json data found.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
