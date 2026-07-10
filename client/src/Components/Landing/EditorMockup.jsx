import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

import HealthScoreBreakdown from '../ui/HealthScoreBreakdown.jsx';
import { SeverityBars, SeverityDonut } from '../ui/SeverityChart.jsx';

function MetricCard({ title, value, subtitle, accent }) {
  return (
    <div className="mockup-element" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: '800', color: accent || '#fff', lineHeight: 1, marginBottom: '4px' }}>{value}</div>
      {subtitle && <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{subtitle}</div>}
    </div>
  );
}

function ScoreRing({ value, label, color, size = 80 }) {
  const r = (size / 2) - 7;
  const circ = 2 * Math.PI * r;
  const fill = ((value || 0) / 100) * circ;
  const cx = size / 2, cy = size / 2;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.12,0.64,1)' }} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#fff" fontSize={size > 70 ? 14 : 11} fontFamily="monospace" fontWeight="700">{value || 0}</text>
      </svg>
      <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

export default function EditorMockup() {
  const container = useRef(null);

  useGSAP(() => {
    gsap.from('.editor-window', {
      scrollTrigger: {
        trigger: container.current,
        start: 'top 85%',
      },
      y: 100,
      opacity: 0,
      scale: 0.95,
      duration: 1.2,
      ease: 'power3.out'
    });

    gsap.from('.mockup-element', {
      scrollTrigger: {
        trigger: container.current,
        start: 'top 75%',
      },
      y: 20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power2.out',
      delay: 0.3
    });
  }, { scope: container });

  const fakeHealth = { overall: 84, maintainability: 92, security: 78, architecture: 88, documentation: 70 };
  const fakeMetrics = { largeFilesCount: 2, largeFunctionsCount: 5, deadCodeIndicators: 1, maxNestingDepth: 5, avgFunctionLength: 28, dependencyCount: 140, fileCount: 420 };
  const fakeFindings = [
    { severity: 'CRITICAL', type: 'Hardcoded Secret', file: 'auth.js' },
    { severity: 'HIGH', type: 'Eval Usage', file: 'parser.js' }
  ];
  const secCounts = { CRITICAL: 1, HIGH: 1, MEDIUM: 0, LOW: 0 };

  const TABS = [
    { id: 'overview',     label: 'Overview & Health' },
    { id: 'complexity',   label: 'Complexity' },
    { id: 'structure',    label: 'Repo Structure' },
    { id: 'insights',     label: 'Insights' },
    { id: 'security',     label: 'Security' },
    { id: 'architecture', label: 'Dep Graph' },
    { id: 'onboarding',  label: 'Onboarding' },
    { id: 'ai',          label: '◆ AI Assistant' },
  ];

  return (
    <section ref={container} className="w-full px-6 flex justify-center mb-32 perspective-[1200px]">
      <div className="editor-window w-full max-w-5xl border border-white/10 rounded-xl overflow-hidden bg-[#050508] shadow-[0_0_80px_rgba(255,255,255,0.03)] backdrop-blur-xl">
        
        {/* Window Header */}
        <div className="h-12 border-b border-white/5 flex items-center justify-between px-5 bg-gradient-to-r from-white/[0.03] to-transparent">
          <div className="flex gap-2.5">
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/30 tracking-[0.2em]">REPOLENS_V2_INTELLIGENCE</span>
          </div>
          <div className="w-16"></div> {/* Spacer */}
        </div>

        {/* Dashboard Body */}
        <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/[0.02] via-transparent to-transparent flex flex-col">
          
          {/* Dashboard Header Bar */}
          <div className="mockup-element" style={{ padding: '24px 32px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>
                  Scan Report // <span style={{ color: '#fff' }}>repo-lens/core</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h1 style={{ margin: 0, fontFamily: 'monospace', fontSize: '24px', fontWeight: '800', letterSpacing: '0.02em', color: '#fff' }}>
                    Scan #142
                  </h1>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '4px 8px', borderRadius: '2px', border: '1px solid rgba(34,197,94,0.2)' }}>
                    COMPLETED
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ fontFamily: 'monospace', fontSize: '10px', color: '#000', background: '#fff', border: '1px solid #fff', padding: '8px 16px', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Export Report
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '20px', overflowX: 'auto' }} className="custom-scrollbar">
              {TABS.map(t => (
                <button key={t.id}
                  style={{
                    fontFamily: 'monospace', fontSize: '11px', padding: '0 0 12px 0', cursor: 'pointer', background: 'none', border: 'none',
                    color: t.id === 'overview' ? '#8b5cf6' : 'rgba(255,255,255,0.5)',
                    borderBottom: t.id === 'overview' ? '2px solid #8b5cf6' : '2px solid transparent',
                    whiteSpace: 'nowrap'
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Grid for Score & Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '24px' }}>
              
              {/* Health Score Breakdown */}
              <div className="mockup-element" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: '0 0 14px', fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '20px', height: '1px', background: '#8b5cf6' }} />
                  Health Scores
                </h3>
                
                <div style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', display: 'flex', flexWrap: 'wrap', gap: '32px', justifyContent: 'center' }}>
                  <ScoreRing value={fakeHealth.overall} label="Overall" color="#22c55e" size={100} />
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)' }} />
                  <ScoreRing value={fakeHealth.maintainability} label="Maint." color="#60a5fa" />
                  <ScoreRing value={fakeHealth.security} label="Security" color="#10b981" />
                  <ScoreRing value={fakeHealth.architecture} label="Arch." color="#f59e0b" />
                </div>

                <HealthScoreBreakdown health={fakeHealth} metrics={fakeMetrics} findings={fakeFindings} />
              </div>

              {/* Security & Complexity */}
              <div className="mockup-element" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                <div>
                  <h3 style={{ margin: '0 0 14px', fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '20px', height: '1px', background: '#f59e0b' }} />
                    Security Overview
                  </h3>
                  <div style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div style={{ flex: '0 0 auto' }}>
                      <SeverityDonut data={secCounts} size={100} />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <SeverityBars data={secCounts} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 14px', fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '20px', height: '1px', background: '#60a5fa' }} />
                    Complexity Metrics
                  </h3>
                  <div className="grid grid-cols-2" style={{ gap: '8px' }}>
                    <MetricCard title="Files Analyzed" value="420" accent="#8b5cf6" />
                    <MetricCard title="Lines of Code" value="12,450" />
                    <MetricCard title="React Components" value="45" />
                    <MetricCard title="Largest Function" value="124" subtitle="lines" accent="#ef4444" />
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
