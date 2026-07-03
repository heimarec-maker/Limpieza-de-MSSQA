import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, MapPin, Hash, BarChart3, Trash2 } from 'lucide-react'
import './SmwCleaningModal.css'

/**
 * Modal para confirmar la limpieza de una dirección SMW.
 * @param {object} data - Datos de la dirección { codigoDireccion, cantidadRfs, direccion }
 * @param {boolean} isOpen - Estado del modal
 * @param {function} onClose - Callback para cerrar el modal
 * @param {function} onClean - Callback para ejecutar la limpieza
 */
export default function SmwCleaningModal({ data, isOpen, onClose, onClean }) {
  const { t } = useTranslation()

  if (!isOpen || !data) return null

  return createPortal(
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="smw-modal-dialog glass-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="smw-modal-header">
          <div className="smw-modal-title">
            <div className="icon-wrapper primary">
              <MapPin size={22} />
            </div>
            <div>
              <p className="smw-modal-label">{t('Confirmar Limpieza Técnica')}</p>
              <h3 className="smw-modal-address">{data.direccion}</h3>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <hr className="smw-modal-divider" />

        {/* Cuerpo con la información solicitada */}
        <div className="smw-modal-content">
          <div className="smw-data-grid">
            <div className="smw-data-item">
              <span className="smw-data-label">
                <Hash size={14} /> {t('Código Dirección')}
              </span>
              <span className="smw-data-value">{data.codigoDireccion}</span>
            </div>
            <div className="smw-data-item">
              <span className="smw-data-label">
                <BarChart3 size={14} /> {t('Total RFS')}
              </span>
              <span className="smw-data-value">{data.cantidadRfs}</span>
            </div>
          </div>

          {/* Listado de RFS encontrados con detalle de puerto */}
          {data.rfsList && data.rfsList.length > 0 && (
            <div className="smw-rfs-list-container">
              <p className="smw-rfs-title">{t('Recursos y Puertos detectados:')}</p>
              <div className="smw-table-wrapper">
                <table className="smw-rfs-table">
                  <thead>
                    <tr>
                      <th><Hash size={12} style={{ marginRight: '4px' }} />{t('RFS')}</th>
                      <th>{t('Puerto')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rfsList.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <div className="rfs-dot" />
                             {typeof item === 'string' ? item : item.rfs}
                          </div>
                        </td>
                        <td className="port-cell">
                          <span className="port-badge">
                            {typeof item === 'string' ? 'N/A' : item.puerto}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="smw-info-box">
            <p>
              {data.mensaje || t('Al confirmar, se enviarán todos los RFS detectados para su liberación inmediata en SMW.')}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="smw-modal-actions">
          <button className="btn btn-accent" onClick={onClose}>
            {t('Cancelar')}
          </button>
          <button 
            className="btn btn-primary btn-clean" 
            onClick={() => onClean(data)}
            disabled={data.cantidadRfs === 0}
          >
            <Trash2 size={18} />
            {t('Limpiar')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
