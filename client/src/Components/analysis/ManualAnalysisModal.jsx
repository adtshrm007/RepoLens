import { useState, useRef } from "react";
import api from "../../services/api.js";
import { useNavigate } from "react-router-dom";

export default function ManualAnalysisModal({ isOpen, onClose }) {
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!filename || !content) {
      setError("Please provide both a filename and content.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/analysis/manual", { filename, content });
      onClose();
      navigate(`/analysis/${data.analysis.id}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative w-full max-w-2xl overflow-hidden rounded-lg shadow-2xl"
        style={{ background: "rgba(10,10,14,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 className="text-white font-mono text-sm tracking-widest uppercase">Manual Analysis</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 text-red-400 font-mono text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-white/50 font-mono text-[10px] uppercase tracking-widest mb-2">Filename</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="e.g. index.js"
                className="w-full bg-black/40 border border-white/10 text-white font-mono text-xs p-3 outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/50 font-mono text-[10px] uppercase tracking-widest mb-2">Code Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your code here..."
                className="w-full h-48 bg-black/40 border border-white/10 text-white font-mono text-xs p-3 outline-none focus:border-white/30 transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex justify-end gap-3" style={{ background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button 
            onClick={onClose}
            className="px-4 py-2 text-white/50 hover:text-white font-mono text-[11px] uppercase tracking-widest transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !filename || !content}
            className="px-6 py-2 bg-white text-black font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
      </div>
    </div>
  );
}
