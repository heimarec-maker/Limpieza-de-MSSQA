import { useTranslation } from 'react-i18next'
import {
  X, CheckCircle, XCircle, AlertTriangle, Info,
  Activity, Hash, Wifi, Cpu, Tag, Box
} from 'lucide-react'
import './LogDetailModal.css'

/* ── Icono por clave de detalle ── */
const FIELD_ICONS = {
  serial:  Hash,
  mac:     Wifi,
  tipo:    Cpu,
  estado:  Tag,
  lote:    Box,
}

function getFieldIcon(key) {
  const lower = key.toLowerCase()
  for (const [k, Icon] of Object.entries(FIELD_ICONS)) {
    if (lower.includes(k)) return Icon
  }
  return Info
}

const RESULT_CFG = {
  'Éxito':       { Icon: CheckCircle,   className: 'badge-success' },
  'Error':       { Icon: XCircle,       className: 'badge-error' },
  'Advertencia': { Icon: AlertTriangle, className: 'badge-warning' },
  'Info':        { Icon: Info,          className: 'badge-info' },
}

/**
 * Modal reutilizable para mostrar el detalle de un log de actividad.
 * @param {object} log     - Entrada del log { usuario, accion, modulo, detalles, resultado, timestamp }
 * @param {function} onClose - Callback para cerrar el modal
 */
export default function LogDetailModal({ log, onClose }) {
  const { t, i18n } = useTranslation()

  if (!log) return null

  const resultCfg = RESULT_CFG[log.resultado] || { Icon: Info, className: 'badge-info' }

  // Parsear "Serial: ZTE | MAC: AA | Tipo: ONT" → [{ key, value }, ...]
  const fields = (log.detalles || '').split('|').map(seg => {
    const idx = seg.indexOf(':')
    if (idx === -1) return { key: seg.trim(), value: '' }
    return {
      key:   seg.slice(0, idx).trim(),
      value: seg.slice(idx + 1).trim(),
    }
  }).filter(f => f.key)

  const fullDate = new Date(log.timestamp).toLocaleString(i18n.language, {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="log-detail-dialog glass-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="log-detail-header">
          <div className="log-detail-title">
            <div className="mini-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>
              {log.usuario?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="log-detail-user">{log.usuario}</p>
              <p className="log-detail-module">{log.modulo}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Badges de acción + resultado */}
        <div className="log-detail-badges">
          <span className={`result-badge ${resultCfg.className}`}>
            <resultCfg.Icon size={14} />
            {log.resultado}
          </span>
          <span className="result-badge badge-info">
            <Activity size={14} />
            {log.accion}
          </span>
          <span className="timeline-time" style={{ marginLeft: 'auto' }}>{fullDate}</span>
        </div>

        <hr className="log-detail-divider" />

        {/* Campos del equipo */}
        {fields.length > 0 && (
          <>
            <p className="log-detail-section-title">{t('Detalles del Equipo')}</p>
            <div className="log-detail-fields">
              {fields.map(({ key, value }) => {
                const FieldIcon = getFieldIcon(key)
                return (
                  <div key={key} className="log-detail-field">
                    <span className="log-detail-field-key">
                      <FieldIcon size={13} style={{ opacity: 0.6 }} />
                      {key}
                    </span>
                    <span className="log-detail-field-value">{value || '—'}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Botón cerrar */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>{t('Cerrar')}</button>
        </div>
      </div>
    </div>
  )
}
