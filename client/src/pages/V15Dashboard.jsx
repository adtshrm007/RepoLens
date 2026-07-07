import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../Components/common/DashboardLayout.jsx';
import api from '../services/api.js';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ReactMarkdown from 'react-markdown';
import HealthScoreBreakdown from '../Components/ui/HealthScoreBreakdown.jsx';
import ExportModal from '../Components/ui/ExportModal.jsx';
import { SeverityBars, SeverityDonut } from '../Components/ui/SeverityChart.jsx';
import { SkeletonCard, SkeletonTable } from '../Components/ui/Skeleton.jsx';

// ── Small Helpers ─────────────────────────────────────────────────────────

function MetricCard({ title, value, subtitle, accent }) {
  return (
    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: '800', color: accent || '#fff', lineHeight: 1, marginBottom: '4px' }}>{value}</div>
      {subtitle && <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{subtitle}</div>}
    </div>
  );
}

function SectionLabel({ color = '#8b5cf6', label }) {
  return (
    <h3 style={{ margin: '0 0 14px', fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color, display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'inline-block', width: '20px', height: '1px', background: color }} />
      {label}
    </h3>
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

// ── Progress Screen ──────────────────────────────────────────────────────

function ScanProgress({ data }) {
  const pct = data.totalFiles > 0 ? Math.min(100, Math.round((data.analyzedFiles / data.totalFiles) * 100)) : 5;
  const msgs = ['SCANNING REPOSITORY TREE...', 'MAPPING DEPENDENCIES...', 'ANALYZING ARCHITECTURE...', 'RUNNING SECURITY SCAN...', 'GENERATING AI INSIGHTS...'];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % msgs.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '24px' }}>
      {/* Animated ring */}
      <div style={{ position: 'relative', width: '120px', height: '120px' }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth="4" />
          <circle cx="60" cy="60" r="50" fill="none" stroke="#8b5cf6" strokeWidth="4"
            strokeDasharray={`${pct * 3.14} 314`} strokeLinecap="round" transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray 0.6s ease' }} />
          <text x="60" y="66" textAnchor="middle" fill="#fff" fontSize="20" fontFamily="monospace" fontWeight="800">{pct}%</text>
        </svg>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#8b5cf6', letterSpacing: '0.2em', animation: 'pulse 1.5s infinite' }}>{msgs[msgIdx]}</div>
      <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
        {data.analyzedFiles} / {data.totalFiles > 0 ? data.totalFiles : '?'} files
      </div>
    </div>
  );
}

// ── Folder Tree ──────────────────────────────────────────────────────────

function buildFolderTree(files) {
  const tree = {};
  files.forEach(f => {
    const parts = f.path.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
    if (!tree[folder]) tree[folder] = { files: 0, loc: 0, functions: 0, size: 0 };
    tree[folder].files++;
    tree[folder].loc += f.metrics?.linesOfCode || 0;
    tree[folder].functions += f.metrics?.functionCount || 0;
    tree[folder].size += f.size || 0;
  });
  return Object.entries(tree).sort((a, b) => b[1].loc - a[1].loc);
}

function FolderTree({ files }) {
  const [expanded, setExpanded] = useState({});
  if (!files || files.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em' }}>
      NO FILE DATA AVAILABLE
    </div>
  );

  const folders = buildFolderTree(files);
  const maxLOC = Math.max(...folders.map(([, d]) => d.loc), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 70px', gap: '8px', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['Folder', 'Files', 'LOC', 'Fns'].map(h => (
          <span key={h} style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: h !== 'Folder' ? 'right' : 'left' }}>{h}</span>
        ))}
      </div>
      {folders.map(([folder, data]) => (
        <div key={folder} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 70px', gap: '8px', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: '#8b5cf6', marginRight: '6px' }}>📁</span>{folder}
              </div>
              {/* LOC bar */}
              <div style={{ marginTop: '4px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px' }}>
                <div style={{ width: `${(data.loc / maxLOC) * 100}%`, height: '100%', background: 'rgba(139,92,246,0.5)', borderRadius: '1px' }} />
              </div>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>{data.files}</span>
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>{data.loc.toLocaleString()}</span>
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>{data.functions}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Repository Insights ──────────────────────────────────────────────────

function InsightCard({ label, value, sub, color = 'rgba(255,255,255,0.7)' }) {
  return (
    <div style={{ padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold', color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{value || '—'}</div>
      {sub && <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>{sub}</div>}
    </div>
  );
}

function computeInsights(files, graph) {
  if (!files || files.length === 0) return {};
  const sorted = [...files].filter(f => f.metrics);

  const largestFile = sorted.sort((a, b) => (b.metrics?.linesOfCode || 0) - (a.metrics?.linesOfCode || 0))[0];
  const largestFn = sorted.sort((a, b) => (b.metrics?.largestFunction || 0) - (a.metrics?.largestFunction || 0))[0];

  // Most connected = most times appears as edge target in dep graph
  const edgeTargets = {};
  (graph?.edges || []).forEach(e => {
    edgeTargets[e.target] = (edgeTargets[e.target] || 0) + 1;
  });
  const mostConnectedId = Object.entries(edgeTargets).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mostConnectedNode = (graph?.nodes || []).find(n => n.id === mostConnectedId);

  const totalComponents = files.reduce((s, f) => s + (f.metrics?.componentCount || 0), 0);
  const totalHooks = files.reduce((s, f) => s + (f.metrics?.hookUsage || 0), 0);
  const avgSize = files.length ? Math.round(files.reduce((s, f) => s + (f.size || 0), 0) / files.length) : 0;

  const folders = buildFolderTree(files);
  const largestFolder = folders[0];

  return { largestFile, largestFn, mostConnectedNode, totalComponents, totalHooks, avgSize, largestFolder };
}

// ── AI Assistant ─────────────────────────────────────────────────────────

function AIAssistant({ scanId }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ask me anything about this repository — architecture, security, refactoring suggestions, or how specific parts work.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const SUGGESTED = ['What does this repository do?', 'What are the main security risks?', 'How is the architecture structured?', 'What should I refactor first?'];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (q = input.trim()) => {
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const { data } = await api.post('/analysis/ask', { scanId, question: q });
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠ Failed to get a response. Please check your OpenRouter API key.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '560px', border: '1px solid rgba(139,92,246,0.2)', background: 'rgba(139,92,246,0.03)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#8b5cf6', fontSize: '14px' }}>◆</span>
        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#a78bfa', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 'bold' }}>AI Repository Assistant</span>
        <span style={{ fontFamily: 'monospace', fontSize: '8px', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>Powered by OpenRouter · No code re-analysis</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }} className="custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {m.role === 'user' ? 'YOU' : '◆ ASSISTANT'}
            </span>
            <div style={{
              maxWidth: '85%',
              padding: '10px 14px',
              background: m.role === 'user' ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${m.role === 'user' ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.07)'}`,
              fontFamily: 'sans-serif',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: '1.65',
              whiteSpace: 'pre-wrap'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '8px', color: '#8b5cf6', letterSpacing: '0.1em' }}>◆ THINKING</span>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length < 3 && (
        <div style={{ padding: '8px 16px', display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {SUGGESTED.map(s => (
            <button key={s} onClick={() => send(s)}
              style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(139,92,246,0.8)', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.06)'}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Ask about this repository..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'monospace', fontSize: '11px', padding: '9px 12px', outline: 'none' }}
          disabled={loading}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          style={{ padding: '9px 16px', background: input.trim() ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)', border: `1px solid ${input.trim() ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`, color: input.trim() ? '#a78bfa' : 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '10px', cursor: input.trim() ? 'pointer' : 'default', letterSpacing: '0.1em', transition: 'all 0.15s' }}>
          SEND
        </button>
      </div>
    </div>
  );
}

// ── Enhanced Graph ───────────────────────────────────────────────────────

function EnhancedDependencyGraph({ graph }) {
  const [searchQ, setSearchQ] = useState('');
  const [hideExternal, setHideExternal] = useState(false);
  const [focusId, setFocusId] = useState(null);

  const rawNodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const rawEdges = Array.isArray(graph?.edges) ? graph.edges : [];

  const isExternal = (label) => !label?.startsWith('./') && !label?.startsWith('../') && !label?.startsWith('src') && !label?.startsWith('app') && !label?.startsWith('pages') && !label?.startsWith('components');

  const filteredRaw = rawNodes.filter(n => {
    if (hideExternal && isExternal(n.label)) return false;
    if (searchQ && !n.label?.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });
  const filteredIds = new Set(filteredRaw.map(n => n.id));

  // Focus mode: highlight connected edges
  const focusedEdgeIds = focusId
    ? new Set(rawEdges.filter(e => e.source === focusId || e.target === focusId).map(e => e.id))
    : null;
  const connectedIds = focusId
    ? new Set([focusId, ...rawEdges.filter(e => e.source === focusId || e.target === focusId).flatMap(e => [e.source, e.target])])
    : null;

  const columns = Math.max(1, Math.ceil(Math.sqrt(filteredRaw.length)));
  const initialNodes = filteredRaw.map((n, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const isFocused = n.id === focusId;
    const isConnected = connectedIds?.has(n.id);
    const dimmed = focusId && !isConnected;

    return {
      id: n.id,
      data: { label: n.label?.split('/').pop() || n.label },
      position: { x: col * 220, y: row * 100 },
      style: {
        background: isFocused ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)',
        color: dimmed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
        border: `1px solid ${isFocused ? 'rgba(139,92,246,0.6)' : isConnected ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
        fontFamily: 'monospace', fontSize: '10px', padding: '8px 12px',
        borderRadius: '2px', cursor: 'pointer',
        opacity: dimmed ? 0.3 : 1,
        transition: 'all 0.2s'
      }
    };
  });

  const initialEdges = rawEdges
    .filter(e => filteredIds.has(e.source) && filteredIds.has(e.target))
    .map(e => {
      const active = focusedEdgeIds?.has(e.id);
      const dimmed = focusId && !active;
      return {
        id: e.id, source: e.source, target: e.target,
        animated: active,
        style: { stroke: active ? '#8b5cf6' : 'rgba(139,92,246,0.25)', strokeWidth: active ? 2 : 1, opacity: dimmed ? 0.15 : 1 }
      };
    });

  const exportSVG = () => {
    const svgEl = document.querySelector('.react-flow__viewport svg') || document.querySelector('.react-flow svg');
    if (!svgEl) { alert('Graph not available for export'); return; }
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dependency-graph.svg'; a.click(); URL.revokeObjectURL(a.href);
  };

  const exportPNG = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgEl = document.querySelector('.react-flow svg');
    if (!svgEl) { alert('Graph not renderable'); return; }
    const img = new Image();
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
    img.src = URL.createObjectURL(blob);
    img.onload = () => {
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 800;
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'dependency-graph.png';
      a.click();
    };
  };

  if (rawNodes.length === 0) return (
    <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em' }}>NO DEPENDENCY GRAPH AVAILABLE</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Controls Bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search nodes..."
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'monospace', fontSize: '10px', padding: '6px 10px', outline: 'none', flex: '1 1 180px', minWidth: '120px' }} />
        <button className={`graph-control-btn ${hideExternal ? 'active' : ''}`} onClick={() => setHideExternal(v => !v)}>
          {hideExternal ? '✓ ' : ''}Hide External
        </button>
        <button className={`graph-control-btn ${focusId ? 'active' : ''}`} onClick={() => setFocusId(null)} disabled={!focusId}>
          {focusId ? 'Clear Focus' : 'Click Node to Focus'}
        </button>
        <button className="graph-control-btn" onClick={exportSVG}>Export SVG</button>
        <button className="graph-control-btn" onClick={exportPNG}>Export PNG</button>
        <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
          {filteredRaw.length} nodes · {initialEdges.length} edges
        </span>
      </div>

      {/* Graph */}
      <div style={{ height: '520px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(5,5,8,1)', overflow: 'hidden' }}>
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          fitView
          onNodeClick={(_, node) => setFocusId(prev => prev === node.id ? null : node.id)}
        >
          <Background color="rgba(255,255,255,0.03)" gap={20} size={1} />
          <Controls style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <MiniMap
            nodeStrokeColor="rgba(139,92,246,0.5)"
            nodeColor={n => n.id === focusId ? '#8b5cf6' : 'rgba(255,255,255,0.08)'}
            maskColor="rgba(0,0,0,0.3)"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </ReactFlow>
      </div>
      {focusId && (
        <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(139,92,246,0.7)', letterSpacing: '0.1em' }}>
          ◆ Focus: <span style={{ color: '#a78bfa' }}>{rawNodes.find(n => n.id === focusId)?.label || focusId}</span> · Click the node again or "Clear Focus" to reset
        </div>
      )}
    </div>
  );
}

// ── Security Panel ───────────────────────────────────────────────────────

function SecurityPanel({ findings }) {
  const [filter, setFilter] = useState('ALL');
  const SEVS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const COLORS = { CRITICAL: '#ff4d4f', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };

  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  findings.forEach(f => { const s = f.severity?.toUpperCase(); if (counts[s] !== undefined) counts[s]++; });

  const filtered = filter === 'ALL' ? findings : findings.filter(f => f.severity?.toUpperCase() === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 auto' }}>
          <SeverityDonut data={counts} size={100} />
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <SeverityBars data={counts} />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
        {SEVS.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{
              fontFamily: 'monospace', fontSize: '9px', padding: '5px 10px', cursor: 'pointer', letterSpacing: '0.1em',
              border: '1px solid transparent', transition: 'all 0.15s',
              background: filter === s ? (COLORS[s] ? `${COLORS[s]}15` : 'rgba(255,255,255,0.07)') : 'transparent',
              color: filter === s ? (COLORS[s] || '#fff') : 'rgba(255,255,255,0.4)',
              borderColor: filter === s ? (COLORS[s] ? `${COLORS[s]}40` : 'rgba(255,255,255,0.2)') : 'transparent'
            }}>
            {s} {s !== 'ALL' ? `(${counts[s]})` : `(${findings.length})`}
          </button>
        ))}
      </div>

      {/* Findings List */}
      {filtered.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', border: '1px solid rgba(34,197,94,0.15)', background: 'rgba(34,197,94,0.04)', fontFamily: 'monospace', fontSize: '11px', color: '#22c55e', letterSpacing: '0.12em' }}>
          ✓ NO {filter === 'ALL' ? '' : filter} SECURITY FINDINGS
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((f, i) => {
            const sev = f.severity?.toUpperCase();
            const col = COLORS[sev] || '#fff';
            return (
              <div key={i} style={{ padding: '14px 16px', border: `1px solid ${col}25`, background: `${col}05`, borderLeft: `3px solid ${col}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`severity-${sev?.toLowerCase()}`} style={{ fontFamily: 'monospace', fontSize: '8px', padding: '2px 7px', border: '1px solid', textTransform: 'uppercase', letterSpacing: '0.12em', flexShrink: 0 }}>{sev}</span>
                    <strong style={{ fontFamily: 'monospace', fontSize: '12px', color: col }}>{f.type}</strong>
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.35)', flexShrink: 0, textAlign: 'right' }}>
                    {f.file?.split('/').pop()}:{f.lineNumber}
                  </span>
                </div>
                <p style={{ margin: '0 0 10px', fontFamily: 'sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>{f.description}</p>
                {f.snippet && (
                  <pre style={{ margin: '0 0 10px', padding: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', color: '#fca5a5', overflowX: 'auto', fontFamily: 'monospace' }}>
                    {f.snippet}
                  </pre>
                )}
                {f.recommendation && (
                  <div style={{ padding: '10px 12px', border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)', borderLeft: '2px solid #22c55e' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#22c55e', letterSpacing: '0.1em', marginBottom: '4px', textTransform: 'uppercase' }}>Recommendation</div>
                    <div style={{ fontFamily: 'sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.5' }}>
                      <ReactMarkdown>{f.recommendation}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main V15Dashboard ─────────────────────────────────────────────────────

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

export default function V15Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    let intervalId;
    const fetchData = async () => {
      try {
        const res = await api.get(`/scan/${id}`);
        setData(res.data);
        setLoading(false);
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

  // Fetch files when needed
  useEffect(() => {
    if ((activeTab === 'structure' || activeTab === 'insights') && files.length === 0 && data?.status === 'COMPLETED') {
      setFilesLoading(true);
      api.get(`/scan/${id}/files`).then(r => setFiles(r.data || [])).catch(() => {}).finally(() => setFilesLoading(false));
    }
  }, [activeTab, id, data]);

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px', animation: 'fadeUp 0.3s' }}>
        <SkeletonCard lines={2} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
          {[1,2,3,4].map(i => <SkeletonCard key={i} lines={2} />)}
        </div>
      </div>
    </DashboardLayout>
  );

  if (!data) return (
    <DashboardLayout>
      <div style={{ textAlign: 'center', marginTop: '80px', fontFamily: 'monospace', fontSize: '11px', color: '#ef4444', letterSpacing: '0.2em' }}>SCAN NOT FOUND.</div>
    </DashboardLayout>
  );

  if (data.status === 'SCANNING' || data.status === 'ANALYZING') return (
    <DashboardLayout><ScanProgress data={data} /></DashboardLayout>
  );

  const metrics = data.metrics || {};
  const health = data.healthScore || {};
  const security = data.securityFindings || [];
  const graph = data.dependencyGraph || { nodes: [], edges: [] };
  const onboarding = data.onboardingGuide || {};
  const architecture = data.architecture || {};
  const insights = computeInsights(files, graph);

  const secCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  security.forEach(f => { const s = f.severity?.toUpperCase(); if (secCounts[s] !== undefined) secCounts[s]++; });

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="page-enter">

        {/* ── Header ── */}
        <div style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <button onClick={() => navigate('/analysis')}
                style={{ background: 'none', border: 'none', fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                ← HISTORY
              </button>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
              <h1 style={{ margin: 0, fontFamily: 'monospace', fontWeight: '800', fontSize: '13px', color: '#fff', letterSpacing: '0.04em' }}>
                {data.repository?.fullName || 'Unknown Repo'}
              </h1>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
                Job: <span style={{ color: 'rgba(255,255,255,0.55)' }}>{data.id?.substring(0, 8)}</span>
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
                Files: <span style={{ color: 'rgba(255,255,255,0.55)' }}>{data.analyzedFiles} / {data.totalFiles}</span>
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
                Scanned: <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setExportOpen(true)}
              style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '7px 12px', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
              ↓ Export
            </button>
            <span style={{ fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.2em', padding: '3px 8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)' }}>
              {data.status}
            </span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '2px', overflowX: 'auto', paddingBottom: '2px' }} className="custom-scrollbar">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 14px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '10px',
                letterSpacing: '0.08em', whiteSpace: 'nowrap', transition: 'all 0.15s', border: '1px solid',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
                borderColor: activeTab === tab.id ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
              }}>
              {tab.label}
              {tab.id === 'security' && security.length > 0 && (
                <span style={{ marginLeft: '6px', fontFamily: 'monospace', fontSize: '8px', background: secCounts.CRITICAL > 0 ? '#ef444420' : '#eab30820', color: secCounts.CRITICAL > 0 ? '#ef4444' : '#eab308', padding: '1px 5px', borderRadius: '2px' }}>
                  {security.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div style={{ animation: 'fadeUp 0.25s ease' }} key={activeTab}>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* AI Summary */}
              <div style={{ padding: '20px', border: '1px solid rgba(139,92,246,0.35)', background: 'rgba(139,92,246,0.04)', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#8b5cf6', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>◆</span> Repository Intelligence Summary
                </div>
                <div style={{ fontFamily: 'sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.75' }}>
                  <ReactMarkdown>{data.summary || 'No summary available. Run a full scan to generate AI insights.'}</ReactMarkdown>
                </div>
              </div>

              {/* Score Rings */}
              <div style={{ padding: '20px 24px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
                <ScoreRing value={health.overall || 0} label="Overall" color={health.overall >= 80 ? '#22c55e' : health.overall >= 60 ? '#eab308' : '#ef4444'} size={90} />
                <ScoreRing value={health.maintainability || 0} label="Maintainability" color="#60a5fa" size={80} />
                <ScoreRing value={health.security || 0} label="Security" color="#10b981" size={80} />
                <ScoreRing value={health.architecture || 0} label="Architecture" color="#f59e0b" size={80} />
                <ScoreRing value={health.documentation || 0} label="Documentation" color="#a78bfa" size={80} />
              </div>

              {/* Explainable Health */}
              <HealthScoreBreakdown health={health} metrics={metrics} findings={security} />
            </div>
          )}

          {/* ── COMPLEXITY ── */}
          {activeTab === 'complexity' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              <MetricCard title="Total LOC" value={(metrics.totalLines || 0).toLocaleString()} />
              <MetricCard title="Files Analyzed" value={metrics.fileCount || 0} />
              <MetricCard title="Total Functions" value={(metrics.functionCount || 0).toLocaleString()} />
              <MetricCard title="Avg Fn Length" value={Math.round(metrics.avgFunctionLength || 0)} subtitle="lines" />
              <MetricCard title="Largest Function" value={metrics.largestFunction || 0} subtitle="lines" accent={metrics.largestFunction > 100 ? '#ef4444' : metrics.largestFunction > 50 ? '#eab308' : '#22c55e'} />
              <MetricCard title="Max Nesting" value={metrics.maxNestingDepth || 0} subtitle="levels deep" accent={metrics.maxNestingDepth > 4 ? '#ef4444' : metrics.maxNestingDepth > 2 ? '#eab308' : '#22c55e'} />
              <MetricCard title="Large Files" value={metrics.largeFilesCount || 0} subtitle=">300 LOC" accent={metrics.largeFilesCount > 5 ? '#ef4444' : metrics.largeFilesCount > 0 ? '#eab308' : '#22c55e'} />
              <MetricCard title="Dead Code" value={metrics.deadCodeIndicators || 0} subtitle="indicators" accent={metrics.deadCodeIndicators > 5 ? '#ef4444' : '#eab308'} />
              <MetricCard title="React Components" value={metrics.componentCount || 0} accent="#60a5fa" />
              <MetricCard title="Hook Usage" value={metrics.hookUsageCount || 0} subtitle="hook calls" accent="#a78bfa" />
              <MetricCard title="Dependencies" value={metrics.dependencyCount || 0} subtitle="import refs" />
            </div>
          )}

          {/* ── STRUCTURE ── */}
          {activeTab === 'structure' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
                <SectionLabel color="#60a5fa" label="Folder Structure & Metrics" />
                {filesLoading ? <SkeletonTable rows={6} /> : <FolderTree files={files} />}
              </div>
              {files.length > 0 && (
                <div style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
                  <SectionLabel color="#60a5fa" label="Largest Files" />
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={{ textAlign: 'left' }}>File</th><th style={{ textAlign: 'right' }}>LOC</th><th style={{ textAlign: 'right' }}>Functions</th><th style={{ textAlign: 'right' }}>Type</th></tr></thead>
                    <tbody>
                      {[...files].filter(f => f.metrics).sort((a, b) => (b.metrics?.linesOfCode || 0) - (a.metrics?.linesOfCode || 0)).slice(0, 10).map(f => (
                        <tr key={f.id}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ maxWidth: '300px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '10px' }}>
                              <span style={{ color: '#8b5cf6', marginRight: '6px' }}>📄</span>{f.path}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', color: f.metrics.linesOfCode > 300 ? '#ef4444' : 'rgba(255,255,255,0.6)' }}>{f.metrics.linesOfCode}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{f.metrics.functionCount}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '8px', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)', padding: '1px 6px' }}>{f.classification?.type || f.extension}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── INSIGHTS ── */}
          {activeTab === 'insights' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filesLoading ? <SkeletonCard lines={4} /> : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                    <InsightCard label="Largest File" value={insights.largestFile?.path?.split('/').pop()} sub={`${insights.largestFile?.metrics?.linesOfCode || 0} LOC`} color="#ef4444" />
                    <InsightCard label="Largest Function" value={insights.largestFn?.path?.split('/').pop()} sub={`${insights.largestFn?.metrics?.largestFunction || 0} lines`} color="#f97316" />
                    <InsightCard label="Most Connected" value={insights.mostConnectedNode?.label?.split('/').pop() || 'N/A'} sub="most import targets" color="#8b5cf6" />
                    <InsightCard label="Largest Folder" value={insights.largestFolder?.[0]} sub={`${insights.largestFolder?.[1]?.loc || 0} LOC, ${insights.largestFolder?.[1]?.files || 0} files`} color="#60a5fa" />
                    <InsightCard label="Avg File Size" value={`${insights.avgSize ? (insights.avgSize / 1024).toFixed(1) : 0} KB`} sub="bytes per file" />
                    <InsightCard label="React Components" value={insights.totalComponents || 0} sub="component functions" color="#60a5fa" />
                    <InsightCard label="React Hooks Used" value={insights.totalHooks || 0} sub="hook invocations" color="#a78bfa" />
                    <InsightCard label="Total Files" value={files.length} sub={`${files.filter(f => f.isAnalyzed).length} deep-analyzed`} />
                  </div>
                  {files.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      Loading file data... if this persists, try refreshing.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && <SecurityPanel findings={security} />}

          {/* ── DEPENDENCY GRAPH ── */}
          {activeTab === 'architecture' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {architecture.summary && (
                <div style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
                  <SectionLabel color="#8b5cf6" label="Architecture Summary" />
                  <div style={{ fontFamily: 'sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.7' }}>
                    {architecture.summary}
                  </div>
                </div>
              )}
              <EnhancedDependencyGraph graph={graph} />
            </div>
          )}

          {/* ── ONBOARDING ── */}
          {activeTab === 'onboarding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
                <SectionLabel color="#3b82f6" label="Developer Onboarding Guide" />
                <div style={{ fontFamily: 'sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.75' }}>
                  <ReactMarkdown>{onboarding.content || 'No onboarding guide generated.'}</ReactMarkdown>
                </div>
              </div>
              {(onboarding.entryPoints?.length > 0 || onboarding.moduleFlow?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
                    <SectionLabel color="#10b981" label="Entry Points" />
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {onboarding.entryPoints?.map((ep, i) => (
                        <li key={i} style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>{ep}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
                    <SectionLabel color="#f59e0b" label="Module Learning Flow" />
                    <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {onboarding.moduleFlow?.map((mf, i) => (
                        <li key={i} style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>{mf}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── AI ASSISTANT ── */}
          {activeTab === 'ai' && <AIAssistant scanId={data.id} />}

        </div>
      </div>

      <ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} scanData={{ ...data, metrics, securityFindings: security }} />
    </DashboardLayout>
  );
}
