import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  X, CheckCircle, XCircle, AlertTriangle, Info,
  Activity, Hash, Wifi, Cpu, Tag, Box, ChevronRight
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
  const [showStepsModal, setShowStepsModal] = useState(false)

  if (!log) return null

  const resultCfg = RESULT_CFG[log.resultado] || { Icon: Info, className: 'badge-info' }

  // Parsear "Serial: ZTE | MAC: AA | Tipo: ONT" → [{ key, value }, ...]
  // O si es texto simple (consultas SMW), devolver null
  const fields = (log.detalles || '').split('|').map(seg => {
    const idx = seg.indexOf(':')
    if (idx === -1) return { key: seg.trim(), value: '' }
    return {
      key:   seg.slice(0, idx).trim(),
      value: seg.slice(idx + 1).trim(),
    }
  }).filter(f => f.key)

  // Detectar si es un detalle SMW (texto descriptivo sin estructura)
  const esSMW = log.etapa?.startsWith('SMW_')
  
  // Detectar si es un lote masivo (contiene "Lote masivo")
  const esLoteMasivo = log.detalles?.includes('Lote masivo')
  
  const detailFields = esSMW || esLoteMasivo
    ? [] 
    : fields.filter(field => !/^Paso\s+\d+\.\d+/i.test(field.key))
  const hasSteps = Array.isArray(log.pasos) && log.pasos.length > 0

  const fullDate = new Date(log.timestamp).toLocaleString(i18n.language, {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  return createPortal(
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

        {/* Campos del equipo o detalle descriptivo SMW */}
        {esSMW || esLoteMasivo ? (
          <>
            <p className="log-detail-section-title">{t('Detalles')}</p>
            <div className="log-detail-descriptive-box" style={{
              padding: '0.8rem',
              background: log.resultado === 'Error' ? 'rgba(255,0,0,0.05)' : 'rgba(16,185,129,0.05)',
              border: `1px solid ${log.resultado === 'Error' ? 'rgba(255,0,0,0.2)' : 'rgba(16,185,129,0.2)'}`,
              borderRadius: '8px',
              color: log.resultado === 'Error' ? '#f87171' : '#6ee7b7',
              fontSize: '0.85rem',
              lineHeight: '1.5'
            }}>
              {log.detalles}
            </div>
          </>
        ) : detailFields.length > 0 ? (
          <>
            <p className="log-detail-section-title">{t('Detalles del Equipo')}</p>
            <div className="log-detail-fields">
              {detailFields.map(({ key, value }) => {
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
        ) : null}

        {/* Botón de detalles de pasos */}
        {hasSteps && (
          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={() => setShowStepsModal(true)}
          >
            Ver detalles de pasos
            <ChevronRight size={14} />
          </button>
        )}

        {/* Botón cerrar */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>{t('Cerrar')}</button>
        </div>
      </div>

      {/* ── Modal de detalles de pasos ── */}
      {showStepsModal && (
        <div className="confirm-overlay" onClick={() => setShowStepsModal(false)}>
          <div
            className="log-detail-dialog glass-card"
            onClick={e => e.stopPropagation()}
          >
            <div className="log-detail-header">
              <div className="log-detail-title">
                <div className="mini-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>
                  {log.usuario?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="log-detail-user">{log.usuario}</p>
                  <p className="log-detail-module">{t('Detalles de pasos')}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowStepsModal(false)}>
                <X size={20} />
              </button>
            </div>

            <hr className="log-detail-divider" />

            <div style={{ display: 'grid', gap: '0.8rem' }}>
              {log.pasos.map((paso) => {
                const stepResultCfg = RESULT_CFG[paso.resultado === 'ÉXITO' ? 'Éxito' : paso.resultado === 'INFO' ? 'Info' : 'Error'] || { Icon: Info, className: 'badge-info' }
                return (
                  <div
                    key={paso.paso}
                    style={{
                      padding: '0.8rem',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                        Paso {paso.paso}
                      </span>
                      <span className={`result-badge ${stepResultCfg.className}`} style={{ fontSize: '0.75rem' }}>
                        <stepResultCfg.Icon size={12} />
                        {paso.resultado === 'ÉXITO' ? 'Éxito' : paso.resultado}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--clr-text)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                      {paso.detalle}
                    </p>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowStepsModal(false)}>{t('Cerrar')}</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
