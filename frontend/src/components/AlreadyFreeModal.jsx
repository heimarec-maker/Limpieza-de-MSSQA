import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, X, CheckCircle2, Info } from 'lucide-react'
import './AlreadyFreeModal.css'

export default function AlreadyFreeModal({ isOpen, serial, estado, onClose }) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return createPortal(
    <div className="afm-overlay" onClick={onClose}>
      <div className="afm-dialog" onClick={e => e.stopPropagation()}>

        {/* Glow ring behind icon */}
        <div className="afm-glow-ring" />

        {/* Close */}
        <button className="afm-close-btn" onClick={onClose} aria-label={t('Cerrar')}>
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="afm-icon-wrap">
          <ShieldCheck size={46} />
        </div>

        {/* Title */}
        <h2 className="afm-title">{t('Equipo Ya Liberado')}</h2>

        {/* Serial pill */}
        <div className="afm-serial-pill">
          <CheckCircle2 size={14} />
          <span className="afm-serial-text">{serial}</span>
        </div>

        {/* Description */}
        <div className="afm-body">
          <div className="afm-info-row">
            <Info size={15} className="afm-info-icon" />
            <p>
              {t('Este equipo ya fue procesado anteriormente y su estado actual en el sistema es')}
              {' '}
              <strong className="afm-estado-tag">{estado || 'LIBRE'}</strong>.
            </p>
          </div>
          <p className="afm-subtext">
            {t('No es necesario ejecutar una nueva limpieza. Si crees que esto es un error, contacta al administrador del sistema.')}
          </p>
        </div>

        {/* Action */}
        <button className="afm-btn-ok" onClick={onClose}>
          {t('Entendido')}
        </button>

      </div>
    </div>,
    document.body
  )
}
