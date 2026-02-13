'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function useConfirm() {
  const ctx = useContext(ToastContext)
  return ctx?.confirm
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const idRef = useRef(0)

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type, exiting: false }])
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration)
    }
    return id
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300)
  }, [])

  const toast = useCallback({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 6000),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning', 5000),
  }, [addToast])

  // Confirm dialog — returns a promise that resolves true/false
  const confirm = useCallback((message, { title = 'Confirm', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) => {
    return new Promise((resolve) => {
      setConfirmState({ message, title, confirmText, cancelText, danger, resolve })
    })
  }, [])

  function handleConfirm(result) {
    confirmState?.resolve(result)
    setConfirmState(null)
  }

  return (
    <ToastContext.Provider value={{ ...toast, confirm }}>
      {children}

      {/* Toast container */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </div>

      {/* Confirm dialog overlay */}
      {confirmState && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          animation: 'fadeIn 0.15s ease',
        }} onClick={() => handleConfirm(false)}>
          <div style={{
            background: 'white', borderRadius: 14, padding: 0, width: '100%', maxWidth: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'scaleIn 0.15s ease',
            overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 24px 12px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>{confirmState.title}</h3>
              <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.5, margin: 0 }}>{confirmState.message}</p>
            </div>
            <div style={{ padding: '12px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => handleConfirm(false)} style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151',
              }}>{confirmState.cancelText}</button>
              <button onClick={() => handleConfirm(true)} style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: confirmState.danger ? '#dc2626' : '#1a1a2e', color: 'white',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{confirmState.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(40px); } }
      `}</style>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const colors = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '✓', iconBg: '#16a34a' },
    error: { bg: '#fef2f2', border: '#fecaca', icon: '!', iconBg: '#dc2626' },
    warning: { bg: '#fffbeb', border: '#fde68a', icon: '!', iconBg: '#d97706' },
    info: { bg: '#eff6ff', border: '#bfdbfe', icon: 'i', iconBg: '#2563eb' },
  }
  const c = colors[toast.type] || colors.info

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', pointerEvents: 'auto', minWidth: 280, maxWidth: 400,
      animation: toast.exiting ? 'slideOut 0.3s ease forwards' : 'slideIn 0.3s ease',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: c.iconBg,
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>{c.icon}</div>
      <div style={{ fontSize: 13, color: '#1f2937', lineHeight: 1.4, flex: 1 }}>{toast.message}</div>
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
        fontSize: 16, padding: 2, lineHeight: 1, flexShrink: 0,
      }}>×</button>
    </div>
  )
}