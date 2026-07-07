import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220);
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220);
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error:   (msg, dur) => addToast(msg, 'error',   dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info:    (msg, dur) => addToast(msg, 'info',    dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={t.exiting ? 'toast-exit' : 'toast-enter'}
            style={{ pointerEvents: 'all' }}
          >
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }) {
  const colors = {
    success: { border: 'rgba(34,197,94,0.3)', accent: '#22c55e', bg: 'rgba(34,197,94,0.06)' },
    error:   { border: 'rgba(239,68,68,0.3)',  accent: '#ef4444', bg: 'rgba(239,68,68,0.06)' },
    warning: { border: 'rgba(234,179,8,0.3)',  accent: '#eab308', bg: 'rgba(234,179,8,0.06)' },
    info:    { border: 'rgba(139,92,246,0.3)', accent: '#8b5cf6', bg: 'rgba(139,92,246,0.06)' },
  };
  const icons = {
    success: '✓', error: '✗', warning: '⚠', info: '◆'
  };
  const c = colors[toast.type] || colors.info;

  return (
    <div style={{
      minWidth: '260px', maxWidth: '360px',
      background: 'rgba(5,5,12,0.96)',
      border: `1px solid ${c.border}`,
      borderLeft: `3px solid ${c.accent}`,
      padding: '12px 14px',
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      backdropFilter: 'blur(12px)',
    }}>
      <span style={{ color: c.accent, fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', flexShrink: 0, marginTop: '1px' }}>{icons[toast.type]}</span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.8)', flex: 1, lineHeight: '1.5' }}>{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '12px', flexShrink: 0, lineHeight: 1 }}>×</button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
