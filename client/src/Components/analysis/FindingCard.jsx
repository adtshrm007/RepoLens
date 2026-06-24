import { useState } from "react";
import SeverityBadge from "./SeverityBadge.jsx";

export default function FindingCard({ finding }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden hover:border-white/20 transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <SeverityBadge severity={finding.severity} />
            <span className="text-white/30 text-[10px] font-mono uppercase tracking-widest">
              {finding.category}
            </span>
          </div>
          <p className="text-white text-sm font-mono font-bold mt-1">{finding.issue}</p>
          <p className="text-white/40 text-xs font-mono mt-1 truncate">
            {finding.filePath}
            {finding.lineNumber ? ` : L${finding.lineNumber}` : ""}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-white/30 transition-transform mt-1 shrink-0 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-3 animate-fade-up">
          {/* Problem */}
          <div className="flex gap-2 items-start">
            <span className="text-emerald-400 text-[11px] shrink-0 mt-[1px]">⚑</span>
            <span className="font-sans text-[13px] text-white/75 leading-relaxed font-medium">
              {finding.reason}
            </span>
          </div>

          {/* Code Quote */}
          {finding.codeSnippet && (
            <div>
              <div className="font-mono text-[8px] text-yellow-500/70 tracking-widest uppercase mb-1">
                ↳ Affected Code
              </div>
              <pre className="m-0 px-3 py-2 bg-black/50 border border-yellow-500/20 border-l-[3px] border-l-yellow-500 rounded font-mono text-[11px] text-yellow-500 whitespace-pre-wrap break-all leading-relaxed">
                {finding.codeSnippet}
              </pre>
            </div>
          )}

          {/* How to Fix */}
          {finding.suggestion && (
            <div className="px-3 py-2.5 bg-emerald-400/5 border border-emerald-400/20 rounded flex gap-2 items-start mt-2">
              <span className="font-mono text-[9px] text-emerald-400 font-bold shrink-0 mt-[2px] tracking-widest uppercase">
                HOW TO FIX
              </span>
              <span className="font-sans text-xs text-white/60 leading-relaxed">
                {finding.suggestion}
              </span>
            </div>
          )}
          {finding.lineNumber && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Line:</span>
              <span className="text-white/40 text-xs font-mono">{finding.lineNumber}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
