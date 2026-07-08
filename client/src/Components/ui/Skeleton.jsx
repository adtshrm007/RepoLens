export function SkeletonBlock({ width = '100%', height = '16px', style = {} }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <SkeletonBlock width="40%" height="9px" />
      <SkeletonBlock width="60%" height="20px" />
      {lines > 2 && <SkeletonBlock width="80%" height="9px" />}
    </div>
  );
}

export function SkeletonTable({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      <div style={{ display: 'flex', gap: '16px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {[40, 25, 15, 20].map((w, i) => <SkeletonBlock key={i} width={`${w}%`} height="9px" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '16px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          {[40, 25, 15, 20].map((w, j) => <SkeletonBlock key={j} width={`${w}%`} height="11px" />)}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: '1px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}
