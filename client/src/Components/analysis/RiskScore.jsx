import { useEffect, useState } from "react";

export default function RiskScore({ score }) {
  const [displayed, setDisplayed] = useState(0);

  // Animate score counting up
  useEffect(() => {
    let frame;
    let current = 0;
    const animate = () => {
      current += (score - current) * 0.1;
      if (Math.abs(score - current) < 0.5) {
        setDisplayed(Math.round(score));
        return;
      }
      setDisplayed(Math.round(current));
      frame = requestAnimationFrame(animate);
    };
    const timeout = setTimeout(() => {
      frame = requestAnimationFrame(animate);
    }, 200);
    return () => {
      clearTimeout(timeout);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [score]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayed / 100) * circumference;

  const getColorInfo = (s) => {
    if (s >= 80) return { stroke: "#22c55e", text: "text-green-400", label: "Excellent", glow: "rgba(34,197,94,0.15)" };
    if (s >= 60) return { stroke: "#3b82f6", text: "text-blue-400", label: "Good", glow: "rgba(59,130,246,0.15)" };
    if (s >= 40) return { stroke: "#f59e0b", text: "text-yellow-400", label: "Fair", glow: "rgba(245,158,11,0.15)" };
    return { stroke: "#ef4444", text: "text-red-400", label: "Critical", glow: "rgba(239,68,68,0.15)" };
  };

  const { stroke, text, label } = getColorInfo(displayed);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        {/* Glow effect */}
        <div
          className="absolute inset-4 rounded-full blur-xl opacity-60"
          style={{ backgroundColor: getColorInfo(displayed).glow }}
        />
        <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 128 128">
          {/* Track */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
          />
          {/* Progress */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.05s ease, stroke 0.3s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className={`text-3xl font-mono font-bold ${text}`}>{displayed}</span>
          <span className="text-white/30 text-xs font-mono">/100</span>
        </div>
      </div>
      <div className="text-center">
        <p className={`text-sm font-mono font-bold ${text}`}>{label}</p>
        <p className="text-white/30 text-xs font-mono mt-0.5">Code Health Score</p>
      </div>
    </div>
  );
}
