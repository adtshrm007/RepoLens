import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../Components/common/DashboardLayout.jsx";
import api from "../services/api.js";
import SparkLine from "../Components/ui/SparkLine.jsx";
import { SkeletonTable } from "../Components/ui/Skeleton.jsx";

function ScoreBadge({ score }) {
  if (score == null) return <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: '12px' }}>—</span>;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
  return <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: '800', color }}>{Math.round(score)}</span>;
}

function DeltaBadge({ current, previous }) {
  if (previous == null || current == null) return null;
  const delta = Math.round(current - previous);
  if (delta === 0) return <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>±0</span>;
  const up = delta > 0;
  return (
    <span style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: 'bold', color: up ? '#22c55e' : '#ef4444', background: up ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${up ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, padding: '2px 5px' }}>
      {up ? '↑' : '↓'}{Math.abs(delta)}
    </span>
  );
}

export default function AnalysisHistory() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

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

  // Build per-repo score history for deltas
  const repoHistory = {};
  analyses.forEach(a => {
    const key = a.repository?.id || a.repository?.fullName || 'unknown';
    if (!repoHistory[key]) repoHistory[key] = [];
    repoHistory[key].push(a);
  });

  const getScoreHistory = (a) => {
    const key = a.repository?.id || a.repository?.fullName || 'unknown';
    return repoHistory[key] || [];
  };

  const getPrevScore = (a) => {
    const hist = getScoreHistory(a);
    const idx = hist.findIndex(h => h.id === a.id);
    if (idx < hist.length - 1) {
      const prev = hist[idx + 1];
      return prev?.healthScore?.overall ?? null;
    }
    return null;
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(s => s.filter(x => x !== id));
    } else if (selectedIds.length < 2) {
      setSelectedIds(s => [...s, id]);
    }
  };

  const handleCompare = () => {
    if (selectedIds.length === 2) {
      navigate(`/compare?a=${selectedIds[0]}&b=${selectedIds[1]}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 page-enter">
        {/* ── Header ── */}
        <div style={{ padding: '14px 18px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>CODEATLAS V2 // ANALYSIS LOG</div>
            <h1 style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '800', color: '#fff', margin: 0 }}>Analysis History</h1>
            <p style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>Historical record of all repository scans · Select 2 to compare</p>
          </div>
          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{selectedIds.length}/2 selected</span>
              <button onClick={handleCompare} disabled={selectedIds.length < 2}
                style={{ fontFamily: 'monospace', fontSize: '10px', color: selectedIds.length === 2 ? '#fff' : 'rgba(255,255,255,0.3)', background: selectedIds.length === 2 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedIds.length === 2 ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`, padding: '8px 16px', cursor: selectedIds.length === 2 ? 'pointer' : 'not-allowed', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.15s' }}>
                ⚖ Compare →
              </button>
              <button onClick={() => setSelectedIds([])}
                style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)', background: 'none', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 10px', cursor: 'pointer' }}>
                Clear
              </button>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)', minHeight: '480px' }}>
          {loading ? (
            <div style={{ padding: '16px' }}>
              <SkeletonTable rows={6} />
            </div>
          ) : analyses.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
              <div style={{ fontSize: '40px', opacity: 0.1 }}>📋</div>
              <p style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>No analyses in log</p>
              <Link to="/repositories" style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 16px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Browse Repositories →
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: '40px' }}>Cmp</th>
                    <th style={{ textAlign: 'left' }}>Job ID / Date</th>
                    <th style={{ textAlign: 'left' }}>Repository</th>
                    <th style={{ textAlign: 'left' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Security</th>
                    <th style={{ textAlign: 'center' }}>Trend</th>
                    <th style={{ textAlign: 'right' }}>Health Score</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((analysis) => {
                    const score = analysis.healthScore?.overall;
                    const prevScore = getPrevScore(analysis);
                    const hist = getScoreHistory(analysis);
                    const histIdx = hist.findIndex(h => h.id === analysis.id);
                    const trendData = hist.slice(histIdx).reverse().map(h => h.healthScore?.overall || 0).filter(Boolean);

                    const critical = analysis.findings?.filter(f => f.severity?.toLowerCase() === 'critical')?.length || 0;
                    const secTotal = analysis.findings?.length || 0;
                    const isSelected = selectedIds.includes(analysis.id);

                    return (
                      <tr key={analysis.id}
                        style={{ background: isSelected ? 'rgba(139,92,246,0.06)' : 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>

                        {/* Compare checkbox */}
                        <td style={{ textAlign: 'center', paddingLeft: '16px' }}>
                          <button onClick={() => toggleSelect(analysis.id)}
                            style={{ width: '16px', height: '16px', border: `1px solid ${isSelected ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.15)'}`, background: isSelected ? 'rgba(139,92,246,0.3)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', fontSize: '10px' }}>
                            {isSelected ? '✓' : ''}
                          </button>
                        </td>

                        <td>
                          <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginBottom: '2px' }}>{analysis.id?.substring(0, 8)}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.55)' }}>
                            {analysis.createdAt ? new Date(analysis.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        </td>

                        <td>
                          <Link to={`/scan/${analysis.id}`} style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: 'bold' }}>
                            {analysis.repository?.name || 'Unknown'}
                          </Link>
                          <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{analysis.repository?.fullName}</div>
                        </td>

                        <td>
                          <span style={{
                            fontFamily: 'monospace', fontSize: '8px', padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.12em',
                            border: `1px solid ${analysis.status === 'COMPLETED' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                            background: analysis.status === 'COMPLETED' ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
                            color: analysis.status === 'COMPLETED' ? '#22c55e' : 'rgba(255,255,255,0.4)'
                          }}>
                            {analysis.status}
                          </span>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {secTotal > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{secTotal}</span>
                              {critical > 0 && (
                                <span style={{ fontFamily: 'monospace', fontSize: '8px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '1px 5px' }}>
                                  {critical} crit
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>—</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {trendData.length > 1 ? (
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <SparkLine data={trendData} width={60} height={24} color={score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'} />
                            </div>
                          ) : (
                            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>—</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <DeltaBadge current={score} previous={prevScore} />
                            <ScoreBadge score={score} />
                          </div>
                        </td>

                        <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                          <Link to={`/scan/${analysis.id}`}
                            style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(139,92,246,0.7)', textDecoration: 'none', letterSpacing: '0.1em', border: '1px solid rgba(139,92,246,0.2)', padding: '4px 8px', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.color = '#a78bfa'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(139,92,246,0.7)'; }}>
                            VIEW →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
