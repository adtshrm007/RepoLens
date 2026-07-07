export function SeverityDonut({ data, size = 80 }) {
  // data: { CRITICAL: N, HIGH: N, MEDIUM: N, LOW: N }
  const COLORS = { CRITICAL: '#ff4d4f', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };
  const LABELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const total = LABELS.reduce((s, k) => s + (data[k] || 0), 0);
  
  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={size/2 - 4} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <text x={size/2} y={size/2 + 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">0</text>
        </svg>
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Clean</span>
      </div>
    );
  }

  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const cx = size / 2, cy = size / 2;

  const segments = LABELS.map(k => {
    const count = data[k] || 0;
    const frac = count / total;
    const len = frac * circ;
    const seg = { key: k, count, frac, len, offset, color: COLORS[k] };
    offset += len;
    return seg;
  }).filter(s => s.count > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
        {segments.map(s => (
          <circle key={s.key} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth="6"
            strokeDasharray={`${s.len} ${circ - s.len}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
          />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fff"
          fontSize={size > 80 ? 14 : 11} fontFamily="monospace" fontWeight="bold"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px` }}>
          {total}
        </text>
      </svg>
    </div>
  );
}

export function SeverityBars({ data, maxWidth = 200 }) {
  const COLORS = { CRITICAL: '#ff4d4f', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };
  const LABELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const max = Math.max(...LABELS.map(k => data[k] || 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {LABELS.map(k => {
        const count = data[k] || 0;
        const pct = (count / max) * 100;
        return (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: COLORS[k], width: '56px', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>{k}</span>
            <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: COLORS[k], borderRadius: '2px', transition: 'width 0.6s cubic-bezier(0.34,1.12,0.64,1)' }} />
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: count > 0 ? COLORS[k] : 'rgba(255,255,255,0.2)', width: '20px', textAlign: 'right', fontWeight: 'bold' }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}
