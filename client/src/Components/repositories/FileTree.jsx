import { useState, useCallback } from "react";
import api from "../../services/api.js";

// Return a color-classed SVG icon for each file type
const getFileIcon = (name, type) => {
  if (type === "dir") {
    return (
      <svg className="w-4 h-4 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    );
  }
  const ext = name ? name.split(".").pop()?.toLowerCase() : undefined;
  const extColors = {
    js: "text-yellow-400",
    jsx: "text-yellow-300",
    ts: "text-blue-400",
    tsx: "text-blue-300",
    py: "text-green-400",
    json: "text-orange-400",
    md: "text-purple-400",
    css: "text-pink-400",
    html: "text-red-400",
    env: "text-yellow-500",
    sh: "text-green-300",
    yml: "text-cyan-400",
    yaml: "text-cyan-400",
    toml: "text-orange-300",
    lock: "text-white/20",
    gitignore: "text-white/30",
  };
  const color = extColors[ext] || "text-white/40";
  return (
    <svg className={`w-4 h-4 ${color} shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
};

function FileNode({ node, owner, repo, selectedFiles, onToggleFile, depth = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const isSelected = selectedFiles.includes(node.path);
  const isDir = node.type === "dir";

  const handleClick = useCallback(async () => {
    if (!isDir) {
      // Only allow selecting text-based files
      const ext = node.name ? node.name.split(".").pop()?.toLowerCase() : undefined;
      const binaryExts = ["png", "jpg", "jpeg", "gif", "svg", "ico", "woff", "woff2", "ttf", "eot", "mp4", "mp3", "zip", "tar", "gz"];
      if (binaryExts.includes(ext)) return;
      onToggleFile(node.path);
      return;
    }

    if (expanded) {
      setExpanded(false);
      return;
    }

    if (children.length === 0 && !loadError) {
      setLoading(true);
      try {
        const { data } = await api.get(
          `/repos/${owner}/${repo}/files?path=${encodeURIComponent(node.path)}`,
        );
        setChildren(data.files || []);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  }, [isDir, expanded, children.length, loadError, node.path, node.name, owner, repo, onToggleFile]);

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-2 py-1.5 pr-2 rounded-lg text-left hover:bg-white/[0.05] transition-colors ${
          isSelected && !isDir ? "bg-purple-500/10" : ""
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {/* Expand arrow for dirs */}
        {isDir ? (
          <svg
            className={`w-3 h-3 text-white/30 transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        ) : (
          /* Checkbox for files */
          <div
            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
              isSelected ? "bg-purple-500 border-purple-500" : "border-white/20"
            }`}
          >
            {isSelected && (
              <svg className="w-2 h-2" fill="none" stroke="white" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </div>
        )}

        {getFileIcon(node.name, node.type)}

        <span className={`text-xs font-mono truncate flex-1 ${isDir ? "text-white/70" : "text-white/55"}`}>
          {node.name}
        </span>

        {loading && (
          <div className="w-3 h-3 border border-white/20 border-t-purple-400 rounded-full animate-spin shrink-0" />
        )}
        {loadError && (
          <span className="text-red-400/50 text-[9px] font-mono shrink-0">err</span>
        )}
        {node.size && !isDir && (
          <span className="text-white/15 text-[9px] font-mono shrink-0">
            {node.size < 1024 ? `${node.size}B` : `${(node.size / 1024).toFixed(1)}KB`}
          </span>
        )}
      </button>

      {/* Children */}
      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <FileNode
              key={child.path}
              node={child}
              owner={owner}
              repo={repo}
              selectedFiles={selectedFiles}
              onToggleFile={onToggleFile}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
      {expanded && children.length === 0 && !loading && !loadError && (
        <p
          className="text-white/20 text-[10px] font-mono py-1"
          style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
        >
          Empty folder
        </p>
      )}
    </div>
  );
}

export default function FileTree({ owner, repo, rootFiles, selectedFiles, onToggleFile }) {
  if (!rootFiles || rootFiles.length === 0) {
    return (
      <div className="p-4 text-center text-white/30 text-xs font-mono">
        No files found
      </div>
    );
  }

  return (
    <div className="p-2">
      {rootFiles.map((node) => (
        <FileNode
          key={node.path}
          node={node}
          owner={owner}
          repo={repo}
          selectedFiles={selectedFiles}
          onToggleFile={onToggleFile}
          depth={0}
        />
      ))}
    </div>
  );
}
