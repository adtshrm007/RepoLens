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
          <div>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1.5">
              Reason
            </p>
            <p className="text-white/70 text-xs font-mono leading-relaxed">{finding.reason}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1.5">
              Suggestion
            </p>
            <p className="text-white/70 text-xs font-mono leading-relaxed">{finding.suggestion}</p>
          </div>
          {finding.codeSnippet && (
            <div>
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1.5">
                Code
              </p>
              <pre className="bg-black/40 border border-white/[0.06] rounded-lg px-3 py-2.5 text-xs font-mono text-white/60 overflow-x-auto whitespace-pre-wrap break-all">
                {finding.codeSnippet}
              </pre>
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
