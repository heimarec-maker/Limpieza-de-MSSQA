import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import './AlertModal.css'

const CONFIG = {
  success: {
    Icon: CheckCircle,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
    glow: '0 0 40px rgba(16,185,129,0.25)',
    label: 'Operación exitosa',
  },
  error: {
    Icon: XCircle,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    glow: '0 0 40px rgba(239,68,68,0.25)',
    label: '¡Error!',
  },
  warning: {
    Icon: AlertTriangle,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
    glow: '0 0 40px rgba(245,158,11,0.25)',
    label: 'Advertencia',
  },
  info: {
    Icon: Info,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
    glow: '0 0 40px rgba(59,130,246,0.25)',
    label: 'Información',
  },
}

/**
 * AlertModal — Modal de aviso de emergencia global.
 * Props:
 *   open     {boolean}  — si el modal está visible
 *   type     {string}   — 'success' | 'error' | 'warning' | 'info'
 *   message  {string}   — texto del mensaje
 *   onClose  {function} — callback al cerrar
 *   autoClose {number}  — ms para autocerrar (0 = desactivado). Default: errores=0, resto=4000
 */
export default function AlertModal({ open, type = 'info', message, onClose, autoClose }) {
  const cfg = CONFIG[type] || CONFIG.info
  const { Icon, color, bg, border, glow, label } = cfg

  // Auto-cerrar
  const delay = autoClose !== undefined
    ? autoClose
    : type === 'error' ? 0 : 4000

  useEffect(() => {
    if (!open || delay === 0) return
    const t = setTimeout(onClose, delay)
    return () => clearTimeout(t)
  }, [open, delay, onClose])

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="alert-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="alert-modal-box"
        style={{ background: bg, border: `1.5px solid ${border}`, boxShadow: glow }}
        onClick={e => e.stopPropagation()}
      >
        {/* Barra superior de color */}
        <div className="alert-modal-topbar" style={{ background: color }} />

        {/* Botón cerrar */}
        <button className="alert-modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        {/* Icono */}
        <div className="alert-modal-icon-wrap" style={{ color, background: bg, border: `1.5px solid ${border}` }}>
          <Icon size={36} strokeWidth={1.8} />
        </div>

        {/* Título */}
        <h3 className="alert-modal-title" style={{ color }}>{label}</h3>

        {/* Mensaje */}
        <p className="alert-modal-message">{message}</p>

        {/* Botón aceptar */}
        <button
          className="alert-modal-btn"
          style={{ background: color }}
          onClick={onClose}
        >
          Aceptar
        </button>

        {/* Barra de progreso (solo si autoClose) */}
        {delay > 0 && (
          <div className="alert-modal-progress-wrap">
            <div
              className="alert-modal-progress-bar"
              style={{ background: color, animationDuration: `${delay}ms` }}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
