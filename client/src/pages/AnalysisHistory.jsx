import { useEffect, useState } from "react";
import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import api from "../services/api.js";

export default function AnalysisHistory() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get("/analysis/history");
        setAnalyses(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-up">
        {/* ── Header Block ── */}
        <div
          className="px-4 py-3"
          style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
        >
          <h1 className="text-white font-mono font-bold text-[13px] tracking-wide mb-0.5">
            Analysis History Log
          </h1>
          <p className="text-white/40 font-mono text-[11px] leading-relaxed">
            Historical record of all static and AI-assisted repository analyses.
          </p>
        </div>

        {/* ── Table Panel ── */}
        <div
          className="p-4"
          style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", minHeight: 480 }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-white/40 font-mono text-[10px] animate-pulse tracking-widest uppercase">
                QUERYING HISTORY LOG_
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <table className="w-full text-left data-table border-collapse min-w-[600px]">
                <thead>
                <tr>
                  <th>Job ID / Date</th>
                  <th>Target Repository</th>
                  <th>Status</th>
                  <th>Findings</th>
                  <th className="text-right">Health Score</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((analysis) => {
                  const critical = analysis.findings?.filter(f => f.severity === "critical")?.length || 0;
                  return (
                    <tr
                      key={analysis.id}
                      className="group transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-white/30 tracking-widest uppercase mb-1">
                            {analysis.id.substring(0, 8)}
                          </span>
                          <span className="text-white/70">
                            {new Date(analysis.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="text-white/70 font-bold">{analysis.repository?.fullName}</td>
                      <td>
                        <span
                          className="text-[8px] px-1.5 py-0.5 uppercase tracking-widest text-white/50"
                          style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
                        >
                          {analysis.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-white/80">{analysis.findings?.length || 0} Total</span>
                          {critical > 0 && (
                            <span className="text-[8px] text-[#ef4444] bg-[rgba(239,68,68,0.1)] px-1 uppercase tracking-wider">
                              {critical} Crit
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <a
                          href={`/scan/${analysis.id}`}
                          className="flex items-center justify-end gap-3 text-white/80 hover:text-white transition-colors"
                          style={{ textDecoration: "none" }}
                        >
                          <span className="font-bold text-lg">{Math.round(analysis.overallScore || 0)}</span>
                          <span className="text-[10px]">→</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {analyses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-white/30 uppercase tracking-widest text-[10px]">
                      NO ANALYSES FOUND IN LOG.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
