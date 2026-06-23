import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const LANGUAGE_COLORS = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  Python: "#3572a5",
  Java: "#b07219",
  Go: "#00add8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
  Vue: "#41b883",
  default: "#6b7280",
};

export default function RepoCard({ repo }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const langColor = LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.default;
  const owner = repo.owner?.login || user?.username;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      onClick={() => navigate(`/repositories/${owner}/${repo.name}`)}
      className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 hover:border-purple-500/30 hover:bg-white/[0.05] transition-all cursor-pointer group relative overflow-hidden"
    >
      {/* Hover glow */}
      <div className="absolute inset-0 bg-linear-to-br from-purple-500/0 via-transparent to-transparent group-hover:from-purple-500/5 transition-all rounded-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between mb-3 relative">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <svg
            className="w-4 h-4 text-white/40 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
            />
          </svg>
          <span className="text-white font-mono font-bold text-sm group-hover:text-purple-300 transition-colors truncate">
            {repo.name}
          </span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ml-2 ${
            repo.private
              ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
              : "bg-green-500/10 border-green-500/20 text-green-400"
          }`}
        >
          {repo.private ? "Private" : "Public"}
        </span>
      </div>

      {/* Description */}
      <p className="text-white/40 text-xs font-mono mb-4 line-clamp-2 min-h-[2.5rem] relative">
        {repo.description || "No description provided."}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          {repo.language && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: langColor }}
              />
              <span className="text-white/50 text-xs font-mono">{repo.language}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-yellow-400/70" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span className="text-white/30 text-xs font-mono">{repo.stargazers_count || 0}</span>
          </div>
        </div>
        <p className="text-white/20 text-[10px] font-mono">
          {formatDate(repo.updated_at)}
        </p>
      </div>

      {/* Arrow indicator */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </div>
  );
}
