export default function StatsCard({ label, value, icon, trend, color = "purple" }) {
  const colorMap = {
    purple: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      icon: "text-purple-400",
      glow: "group-hover:shadow-purple-500/10",
    },
    blue: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      icon: "text-blue-400",
      glow: "group-hover:shadow-blue-500/10",
    },
    green: {
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      icon: "text-green-400",
      glow: "group-hover:shadow-green-500/10",
    },
    orange: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      icon: "text-orange-400",
      glow: "group-hover:shadow-orange-500/10",
    },
  };
  const c = colorMap[color] || colorMap.purple;

  return (
    <div className={`bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 hover:border-white/20 hover:bg-white/[0.05] transition-all group shadow-lg ${c.glow}`}>
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center ${c.icon} group-hover:scale-110 transition-transform`}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${
              trend >= 0
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-mono font-bold text-white mb-1">{value}</p>
      <p className="text-white/40 text-xs font-mono uppercase tracking-widest">{label}</p>
    </div>
  );
}
