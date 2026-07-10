export default function SparkLine({ data = [], width, height = 28, color = '#8b5cf6', showDots = false }) {
  // Use a fixed internal coordinate system; SVG scales to the given width or 100% of container
  const VW = 260; // internal viewBox width
  const VH = height;

  if (!data.length || data.length < 2) {
    return <div style={{ width: width || '100%', height: VH, opacity: 0.2, fontSize: 9, fontFamily: 'monospace', display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.3)' }}>NO DATA</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padX = 2;
  const padY = 3;
  const iw = VW - padX * 2;
  const ih = VH - padY * 2;

  const points = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * iw,
    y: padY + ih - ((v - min) / range) * ih
  }));

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${d} L ${points[points.length-1].x} ${padY + ih} L ${points[0].x} ${padY + ih} Z`;

  return (
    <svg
      width={width || '100%'}
      height={VH}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="chart-line" />
      {showDots && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} />
      ))}
    </svg>
  );
}
