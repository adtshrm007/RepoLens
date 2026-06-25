import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../Components/common/DashboardLayout.jsx';
import api from '../services/api.js';
import { ReactFlow, MiniMap, Controls, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import ReactMarkdown from 'react-markdown';

// ── Helpers ──
function MetricCard({ title, value, subtitle }) {
  return (
    <div style={{
      padding: '16px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>{title}</div>
      <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>{value}</div>
      {subtitle && <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{subtitle}</div>}
    </div>
  );
}

function ScoreRing({ value, label, color }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = (value / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <circle 
          cx="36" cy="36" r={r} fill="none" 
          stroke={color} strokeWidth="5" 
          strokeDasharray={`${fill} ${circ - fill}`} 
          strokeLinecap="round" 
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="36" y="40" textAnchor="middle" fill="#fff" fontSize="14" fontFamily="monospace" fontWeight="700">
          {value}
        </text>
      </svg>
      <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );
}

function SectionHeader({ color, label }) {
  return (
    <h3 style={{
      margin: '0 0 12px',
      fontFamily: 'monospace',
      fontSize: '9px',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }}>
      <span style={{ display: 'inline-block', width: '16px', height: '1px', background: color }} />
      {label}
    </h3>
  );
}

export default function V15Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, complexity, security, architecture, onboarding

  useEffect(() => {
    let intervalId;
    const fetchData = async () => {
      try {
        const res = await api.get(`/scan/${id}`);
        setData(res.data);
        setLoading(false);
        
        // If status is not COMPLETED or FAILED, keep polling
        if (res.data.status === 'SCANNING' || res.data.status === 'ANALYZING') {
          intervalId = setTimeout(fetchData, 3000);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchData();

    return () => clearTimeout(intervalId);
  }, [id]);

  if (loading) return (
    <DashboardLayout>
      <div style={{ marginTop: '80px', textAlign: 'center', fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', animation: 'pulse 1.5s infinite' }}>DECRYPTING RESULTS_</div>
    </DashboardLayout>
  );

  if (!data) return (
    <DashboardLayout>
      <div style={{ marginTop: '80px', textAlign: 'center', fontFamily: 'monospace', fontSize: '10px', color: '#ef4444', letterSpacing: '0.2em' }}>ANALYSIS NOT FOUND.</div>
    </DashboardLayout>
  );

  if (data.status === 'SCANNING' || data.status === 'ANALYZING') {
    return (
      <DashboardLayout>
        <div style={{ marginTop: '80px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8b5cf6', letterSpacing: '0.2em', animation: 'pulse 1.5s infinite' }}>
            {data.status === 'SCANNING' ? 'SCANNING REPOSITORY TREE...' : 'ANALYZING TOP ARCHITECTURAL FILES...'}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
            Files Processed: {data.analyzedFiles} / {data.totalFiles > 0 ? data.totalFiles : '?'}
          </div>
          <div style={{ width: '300px', height: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              background: '#8b5cf6', 
              width: data.totalFiles > 0 ? `${Math.min(100, Math.round((data.analyzedFiles / data.totalFiles) * 100))}%` : '5%',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Extract V1.5 specific data
  const metrics = data.metrics || {};
  const health = data.healthScore || {};
  const security = data.securityFindings || [];
  const graph = data.dependencyGraph || { nodes: [], edges: [] };
  const onboarding = data.onboardingGuide || {};
  const architecture = data.architecture || {};

  const getLayoutedElements = (nodes, edges) => {
    // Grid Layout to prevent horizontal sprawl
    const columns = Math.ceil(Math.sqrt(nodes.length));
    const xSpacing = 300; // horizontal spacing between nodes
    const ySpacing = 120; // vertical spacing between nodes

    nodes.forEach((node, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      node.position = {
        x: col * xSpacing,
        y: row * ySpacing,
      };
      
      node.targetPosition = 'top';
      node.sourcePosition = 'bottom';
    });

    return { nodes, edges };
  };

  let filteredNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const filteredEdges = Array.isArray(graph.edges) ? graph.edges : [];

  const initialNodes = filteredNodes.map((n) => ({
    id: n.id,
    data: { label: n.label },
    position: { x: 0, y: 0 },
    style: { background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '10px', padding: '10px' }
  }));

  const initialEdges = filteredEdges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: 'rgba(139,92,246,0.5)' }
  }));

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

  const tabs = [
    { id: 'overview', label: 'OVERVIEW & HEALTH' },
    { id: 'complexity', label: 'COMPLEXITY METRICS' },
    { id: 'security', label: 'SECURITY FINDINGS' },
    { id: 'architecture', label: 'ARCHITECTURE GRAPH' },
    { id: 'onboarding', label: 'ONBOARDING GUIDE' }
  ];

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeUp 0.3s ease' }}>
        
        {/* ── Header ── */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <button
                onClick={() => navigate('/analysis')}
                style={{ background: 'none', border: 'none', fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase' }}
              >
                ← LOG
              </button>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
              <h1 style={{ margin: 0, fontFamily: 'monospace', fontWeight: '700', fontSize: '13px', color: '#fff', letterSpacing: '0.05em' }}>
                Job ID: {data.id.substring(0, 8)}
              </h1>
            </div>
            <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              Target: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{data.repository?.fullName || 'Unknown Repo'}</span>
            </p>
          </div>
          <div
            style={{
              fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.2em',
              textTransform: 'uppercase', padding: '3px 8px',
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.7)'
            }}
          >
            {data.status || 'COMPLETED'}
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: `1px solid ${activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
                fontFamily: 'monospace',
                fontSize: '10px',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeUp 0.4s' }}>
            {/* AI Summary - What this repo does */}
            <div style={{ padding: '20px', border: '1px solid rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.05)', borderLeft: '4px solid #8b5cf6', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8b5cf6', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 'bold' }}>
                ◆ WHAT EXACTLY THIS REPOSITORY DOES
              </div>
              <div className="markdown-body" style={{ margin: 0, fontFamily: 'sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.8', whiteSpace: 'normal' }}>
                <ReactMarkdown>{data.summary || 'No documentation available.'}</ReactMarkdown>
              </div>
            </div>

            {/* Health Scores */}
            <div style={{ padding: '16px 24px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
              <ScoreRing value={health.overall || 0} label="Overall" color={(health.overall || 0) >= 80 ? '#22c55e' : (health.overall || 0) >= 60 ? '#eab308' : '#ef4444'} />
              <ScoreRing value={health.maintainability || 0} label="Maintain" color="#60a5fa" />
              <ScoreRing value={health.security || 0} label="Security" color="#10b981" />
              <ScoreRing value={health.architecture || 0} label="Arch" color="#f59e0b" />
            </div>
          </div>
        )}

        {activeTab === 'complexity' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', animation: 'fadeUp 0.4s' }}>
            <MetricCard title="Total Lines" value={metrics.totalLines || 0} />
            <MetricCard title="Total Files" value={metrics.fileCount || 0} />
            <MetricCard title="Total Functions" value={metrics.functionCount || 0} />
            <MetricCard title="Avg Fn Length" value={Math.round(metrics.avgFunctionLength || 0)} subtitle="lines" />
            <MetricCard title="Max Depth" value={metrics.maxNestingDepth || 0} subtitle="levels deep" />
            <MetricCard title="Large Files" value={metrics.largeFilesCount || 0} subtitle=">300 lines" />
            <MetricCard title="Dead Code" value={metrics.deadCodeIndicators || 0} subtitle="indicators" />
            <MetricCard title="React Comps" value={metrics.componentCount || 0} />
          </div>
        )}

        {activeTab === 'architecture' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeUp 0.4s' }}>
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <SectionHeader color="#8b5cf6" label="Architecture Summary" />
              <div style={{ fontFamily: 'sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', whiteSpace: 'pre-wrap', marginTop: '12px' }}>
                {architecture.summary || "Architecture summary not available."}
              </div>
            </div>

            <div style={{ height: '500px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)', overflow: 'hidden', marginTop: '8px' }}>
              <SectionHeader color="#8b5cf6" label="Dependency Graph" style={{ padding: '16px 16px 0' }} />
              {layoutedNodes.length > 0 ? (
                <ReactFlow nodes={layoutedNodes} edges={layoutedEdges} fitView>
                  <Background color="rgba(255,255,255,0.05)" gap={16} />
                  <Controls style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <MiniMap nodeStrokeColor="#8b5cf6" nodeColor="rgba(255,255,255,0.05)" maskColor="rgba(0,0,0,0.2)" />
                </ReactFlow>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em' }}>
                  NO DEPENDENCY GRAPH AVAILABLE.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeUp 0.4s' }}>
            {security.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)', fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.1em' }}>
                NO CRITICAL SECURITY VULNERABILITIES FOUND.
              </div>
            ) : (
              security.map((sec, i) => (
                <div key={i} style={{ padding: '16px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.02)', borderLeft: '3px solid #ef4444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ fontFamily: 'monospace', fontSize: '12px', color: '#ef4444', letterSpacing: '0.1em' }}>{sec.type}</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{sec.file}:{sec.lineNumber}</span>
                  </div>
                  <p style={{ margin: '0 0 12px 0', fontFamily: 'sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{sec.description}</p>
                  <pre style={{ margin: sec.recommendation ? '0 0 12px 0' : 0, padding: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', color: '#fca5a5', overflowX: 'auto', fontFamily: 'monospace' }}>
                    {sec.snippet}
                  </pre>
                  {sec.recommendation && (
                    <div style={{ padding: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid #10b981' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#10b981', letterSpacing: '0.1em', marginBottom: '4px', textTransform: 'uppercase' }}>Recommendation</div>
                      <div className="markdown-body" style={{ fontFamily: 'sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.8)', whiteSpace: 'normal' }}>
                        <ReactMarkdown>{sec.recommendation}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'onboarding' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeUp 0.4s' }}>
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <SectionHeader color="#3b82f6" label="Developer Onboarding Guide" />
              <div style={{ fontFamily: 'sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', whiteSpace: 'pre-wrap', marginTop: '12px' }}>
                {onboarding.content || "ONBOARDING GUIDE NOT GENERATED."}
              </div>
            </div>
            
            {(onboarding.entryPoints?.length > 0 || onboarding.moduleFlow?.length > 0) && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px', padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <SectionHeader color="#10b981" label="Entry Points" />
                  <ul style={{ margin: '12px 0 0 0', paddingLeft: '20px', fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.8' }}>
                    {onboarding.entryPoints?.map((ep, i) => <li key={i} style={{ marginBottom: '6px' }}>{ep}</li>)}
                  </ul>
                </div>
                <div style={{ flex: '1 1 300px', padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <SectionHeader color="#f59e0b" label="Module Flow" />
                  <ul style={{ margin: '12px 0 0 0', paddingLeft: '20px', fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.8' }}>
                    {onboarding.moduleFlow?.map((mf, i) => <li key={i} style={{ marginBottom: '6px' }}>{mf}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

