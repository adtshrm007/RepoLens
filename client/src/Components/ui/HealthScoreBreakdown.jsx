import { useState } from 'react';

const DIMENSIONS = [
  {
    key: 'maintainability',
    label: 'Maintainability',
    weight: 35,
    color: '#60a5fa',
    description: 'Code complexity, function length, nesting depth, dead code. Weight: 35%',
    factors: (metrics) => [
      metrics?.largeFilesCount > 0 && { label: 'Large files (>300 LOC)', deduction: metrics.largeFilesCount * 5, value: metrics.largeFilesCount },
      metrics?.largeFunctionsCount > 0 && { label: 'Large functions (>50 LOC)', deduction: metrics.largeFunctionsCount * 2, value: metrics.largeFunctionsCount },
      metrics?.deadCodeIndicators > 0 && { label: 'Dead code indicators', deduction: metrics.deadCodeIndicators * 3, value: metrics.deadCodeIndicators },
      metrics?.maxNestingDepth > 4 && { label: `Deep nesting (depth ${metrics.maxNestingDepth})`, deduction: (metrics.maxNestingDepth - 4) * 5, value: metrics.maxNestingDepth },
      metrics?.avgFunctionLength > 30 && { label: 'High avg function length', deduction: metrics.avgFunctionLength > 50 ? 10 : 5, value: Math.round(metrics.avgFunctionLength) },
    ].filter(Boolean)
  },
  {
    key: 'security',
    label: 'Security',
    weight: 35,
    color: '#10b981',
    description: 'Security findings weighted by severity (Critical -20, High -15, Medium -5, Low -2). Weight: 35%',
    factors: (_, findings) => (findings || []).slice(0, 6).map(f => ({
      label: `[${f.severity?.toUpperCase()}] ${f.type || 'Finding'}`,
      deduction: { CRITICAL: 20, HIGH: 15, MEDIUM: 5, LOW: 2 }[f.severity?.toUpperCase()] || 1,
      value: f.file ? f.file.split('/').pop() : ''
    }))
  },
  {
    key: 'architecture',
    label: 'Architecture',
    weight: 20,
    color: '#f59e0b',
    description: 'Dependency coupling heuristics (deps per file ratio). Weight: 20%',
    factors: (metrics) => [
      metrics?.dependencyCount > 0 && {
        label: `Avg ${((metrics.dependencyCount || 0) / Math.max(metrics.fileCount || 1, 1)).toFixed(1)} deps/file`,
        deduction: ((metrics.dependencyCount || 0) / Math.max(metrics.fileCount || 1, 1)) > 10 ? 10 : 0,
        value: metrics.dependencyCount
      }
    ].filter(Boolean)
  },
  {
    key: 'documentation',
    label: 'Documentation',
    weight: 10,
    color: '#a78bfa',
    description: 'Baseline documentation score (JSDoc heuristics). Weight: 10%',
    factors: () => [{ label: 'Baseline heuristic score', deduction: 30, value: 70 }]
  }
];

export default function HealthScoreBreakdown({ health, metrics, findings }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  if (!health) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Overall Formula Banner */}
      <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginRight: 4 }}>Formula</span>
        {DIMENSIONS.map((d, i) => (
          <span key={d.key} style={{ fontFamily: 'monospace', fontSize: '10px' }}>
            <span style={{ color: d.color, fontWeight: 'bold' }}>{d.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}> ×{d.weight}%</span>
            {i < DIMENSIONS.length - 1 && <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 6px' }}>+</span>}
          </span>
        ))}
      </div>

      {/* Score Dimensions */}
      {DIMENSIONS.map(dim => {
        const score = health[dim.key] || 0;
        const dimFactors = dim.factors(metrics, findings);
        const contribution = Math.round(score * dim.weight / 100);

        return (
          <div key={dim.key} style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dim.color, flexShrink: 0, display: 'block' }} />
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' }}>{dim.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>weight {dim.weight}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>contributes <span style={{ color: dim.color, fontWeight: 'bold' }}>+{contribution}pts</span></span>
                <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', color: score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444' }}>{score}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginBottom: '10px', overflow: 'hidden' }}>
              <div style={{
                width: `${score}%`, height: '100%', borderRadius: '2px',
                background: `linear-gradient(90deg, ${dim.color}99, ${dim.color})`,
                transition: 'width 0.8s cubic-bezier(0.34,1.12,0.64,1)'
              }} />
            </div>

            {/* Deductions */}
            {dimFactors.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dimFactors.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>{f.label}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#ef4444', fontWeight: 'bold' }}>−{f.deduction}pts</span>
                  </div>
                ))}
              </div>
            )}

            {dimFactors.length === 0 && (
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#22c55e', opacity: 0.7 }}>✓ No deductions</div>
            )}

            {/* Tooltip description */}
            <div style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' }}>{dim.description}</div>
          </div>
        );
      })}
    </div>
  );
}
