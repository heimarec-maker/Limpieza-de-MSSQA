import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Monitor, Cpu, Sparkles, AlertTriangle, CheckCircle, Info, RefreshCw, Activity, Database } from 'lucide-react'
import { ejecutarLimpieza, consultarEquipo } from '../services/limpiezaDbService'
import './EquipmentCleaningModal.css'

export default function EquipmentCleaningModal({ isOpen, equipment, initialMode = 'info', onClose, onCleanSuccess }) {
  const { t } = useTranslation()
  const [localEquip, setLocalEquip] = useState(equipment)
  const [mode, setMode] = useState(initialMode) // 'info' or 'process'
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successResult, setSuccessResult] = useState(null)

  // Track equipment prop changes
  useEffect(() => {
    if (equipment) {
      setLocalEquip(equipment)
    }
  }, [equipment])

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setCurrentStep(0)
      setErrorMsg(null)
      setSuccessResult(null)
      setLoading(false)
      
      // Auto-trigger cleaning if initialMode is 'process'
      if (initialMode === 'process') {
        runCleaningProcess()
      }
    }
  }, [isOpen, initialMode, equipment])

  if (!isOpen || !equipment) return null

  const getUsername = () => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser'))
      return u?.username || 'Sistema'
    } catch { return 'Sistema' }
  }

  const runCleaningProcess = async () => {
    setMode('process')
    setLoading(true)
    setErrorMsg(null)
    setCurrentStep(0)

    // Helper to sleep/delay transitions for premium visual feedback
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    try {
      // Step 0: Initial verification
      await delay(600)
      setCurrentStep(1) // ASAP removal

      // Trigger the real backend cleaning
      const apiPromise = ejecutarLimpieza(equipment.serial_nbr || equipment.serial, '', getUsername(), false)
      
      await delay(900)
      setCurrentStep(2) // Service Item clean

      await delay(900)
      setCurrentStep(3) // Service Request clean

      const res = await apiPromise

      await delay(600)

      if (res.type === 'error') {
        setErrorMsg(res.message)
        setLoading(false)
      } else {
        setCurrentStep(4) // Completed
        setSuccessResult(res)
        setLoading(false)
        if (onCleanSuccess) onCleanSuccess(res, equipment.serial_nbr || equipment.serial)
      }
    } catch (err) {
      setErrorMsg(t('Error de red o servidor. Intente más tarde.'))
      setLoading(false)
    }
  }

  const estado = (equipment.estado_cpe || equipment.estado || 'DESCONOCIDO').toUpperCase()
  const isAlreadyClean = ['LIBRE', 'DISPONIBLE', 'RETIRADO'].includes(estado)
  const infoEquipo = equipment.model || equipment.tipo || equipment.equipment_name || t('Equipo Standard')

  return (
    <div className="equipment-modal-overlay" onClick={onClose}>
      <div 
        className="equipment-modal-dialog glass-card animate-zoom"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="equipment-modal-header">
          <div className="equipment-modal-title">
            <div className={`icon-wrapper ${isAlreadyClean ? 'success' : 'warning'}`}>
              <Monitor size={22} />
            </div>
            <div>
              <p className="equipment-modal-subtitle">{t('Consulta Técnica de Inventarios')}</p>
              <h3 className="equipment-modal-serial">{equipment.serial_nbr || equipment.serial}</h3>
            </div>
          </div>
          <button className="equipment-modal-close-btn" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <hr className="equipment-modal-divider" />

        {/* Content */}
        <div className="equipment-modal-body">
          {mode === 'info' && (
            <div className="info-mode-layout">
              {/* Data Grid */}
              <div className="equipment-meta-grid">
                <div className="meta-card">
                  <span className="meta-label">
                    <Database size={13} /> {t('Serial')}
                  </span>
                  <span className="meta-value monospace">{equipment.serial_nbr || equipment.serial}</span>
                </div>
                <div className="meta-card">
                  <span className="meta-label">
                    <Cpu size={13} /> {t('Modelo / Nombre')}
                  </span>
                  <span className="meta-value">{infoEquipo}</span>
                </div>
                <div className="meta-card style-status-badge">
                  <span className="meta-label">
                    <Activity size={13} strokeWidth={2.2} /> {t('Estado')}
                  </span>
                  <span className={`status-badge-val ${isAlreadyClean ? 'free' : 'assigned'}`}>
                    {estado}
                  </span>
                </div>
              </div>

              {/* Status Note */}
              {isAlreadyClean ? (
                <div className="already-free-banner">
                  <div className="already-free-banner-icon">
                    <CheckCircle size={32} />
                  </div>
                  <div>
                    <h4>{t('✓ Equipo Ya Liberado')}</h4>
                    <p>{t('Este equipo ya fue limpiado anteriormente. Su estado actual es')} <strong style={{ color: '#10b981' }}>{estado}</strong>. {t('No es necesario realizar una nueva limpieza.')}</p>
                  </div>
                </div>
              ) : (
                <div className="status-description-box dirty-box">
                  <div className="status-box-icon">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h4>{t('Requiere Limpieza')}</h4>
                    <p>{t('Este equipo está asignado a un cliente. Al proceder con la limpieza, se borrarán registros lógicos y dependencias de servicio para liberar el puerto.')}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="equipment-modal-actions">
                <button className="btn btn-accent" onClick={onClose}>
                  {t('Cerrar')}
                </button>
                {!isAlreadyClean && (
                  <button className="btn btn-primary premium-submit-btn" onClick={runCleaningProcess}>
                    <Sparkles size={16} className="sparkle-icon" />
                    <span>{t('Iniciar Limpieza')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'process' && (
            <div className="process-mode-layout">
              <div className="progress-stages-container">
                {/* Step 1 */}
                <div className={`stage-row ${currentStep >= 1 ? 'active' : ''} ${currentStep === 1 && loading ? 'running' : ''}`}>
                  <div className="stage-indicator">
                    {currentStep > 1 ? <CheckCircle size={18} className="stage-success-icon" /> : <div className="stage-dot" />}
                  </div>
                  <div className="stage-info">
                    <h5>{t('Paso 1.2: Borrado CPE Físico')}</h5>
                    <p className="monospace">{t('Liberando asociación física en base de datos...')}</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className={`stage-row ${currentStep >= 2 ? 'active' : ''} ${currentStep === 2 && loading ? 'running' : ''}`}>
                  <div className="stage-indicator">
                    {currentStep > 2 ? <CheckCircle size={18} className="stage-success-icon" /> : <div className="stage-dot" />}
                  </div>
                  <div className="stage-info">
                    <h5>{t('Paso 1.3: Limpieza Serv Item')}</h5>
                    <p className="monospace">{t('Depurando parámetros lógicos e ítems del puerto...')}</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className={`stage-row ${currentStep >= 3 ? 'active' : ''} ${currentStep === 3 && loading ? 'running' : ''}`}>
                  <div className="stage-indicator">
                    {currentStep > 3 ? <CheckCircle size={18} className="stage-success-icon" /> : <div className="stage-dot" />}
                  </div>
                  <div className="stage-info">
                    <h5>{t('Paso 1.4: Finalización de Solicitudes')}</h5>
                    <p className="monospace">{t('Borrando solicitudes pendientes de aprovisionamiento...')}</p>
                  </div>
                </div>

                {/* Step 4 (Completed) */}
                {currentStep === 4 && (
                  <div className="stage-row active final-stage animate-fade">
                    <div className="stage-indicator success-glow">
                      <CheckCircle size={22} className="stage-success-icon" />
                    </div>
                    <div className="stage-info">
                      <h5 className="final-title">{t('¡Limpieza Finalizada con Éxito!')}</h5>
                      <p>{successResult?.message || t('El CPE ya está limpio y listo para ser reasignado.')}</p>
                      
                      {successResult?.detalle && (
                        <div className="success-stats-box monospace">
                          <div>• {t('Líneas SERV_ITEM depuradas:')} <strong>{successResult.detalle.filasServItem ?? 0}</strong></div>
                          <div>• {t('Líneas SERV_REQ depuradas:')} <strong>{successResult.detalle.filasServReq ?? 0}</strong></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Stage */}
                {errorMsg && (
                  <div className="stage-row active error-stage animate-fade">
                    <div className="stage-indicator error-glow">
                      <AlertTriangle size={22} style={{ color: '#ef4444' }} />
                    </div>
                    <div className="stage-info">
                      <h5 style={{ color: '#f87171' }}>{t('La operación falló')}</h5>
                      <p>{errorMsg}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar during active loading */}
              {loading && (
                <div className="premium-modal-progress-bar-wrap">
                  <div 
                    className="premium-modal-progress-fill" 
                    style={{ width: `${(currentStep / 3) * 100}%` }}
                  />
                </div>
              )}

              {/* Actions when finished or error */}
              {!loading && (
                <div className="equipment-modal-actions animate-fade" style={{ marginTop: '2rem' }}>
                  {errorMsg ? (
                    <>
                      <button className="btn btn-accent" onClick={onClose}>
                        {t('Cerrar')}
                      </button>
                      <button className="btn btn-primary" onClick={runCleaningProcess}>
                        <RefreshCw size={14} /> {t('Reintentar')}
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
                      {t('Aceptar')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
