import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Search, PlusCircle, CheckCircle2, Info, Loader2, X, Upload, Play, StopCircle, FileText, ChevronDown, ChevronUp, Layers, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUser } from '../context/UserContext'
import SubPage from '../components/SubPage'
import SmwCleaningModal from '../components/SmwCleaningModal'
import AlertModal from '../components/AlertModal'
import SmwImportPreviewModal from '../components/SmwImportPreviewModal'
import { consultarDireccionSmw, limpiarDireccionSmw } from '../services/smwService'
import './LimpiezaEquipos.css' // Usamos las mismas clases CSS de masiva

const RESULT_ICON = {
  'ÉXITO':        { Icon: CheckCircle,    cls: 'success' },
  'INFO':         { Icon: AlertTriangle,  cls: 'info'    },
  'NO_ENCONTRADO':{ Icon: AlertTriangle,  cls: 'warning' },
  'ERROR':        { Icon: XCircle,        cls: 'error'   },
}

const mapResultType = (type) => {
  switch (type) {
    case 'success': return 'Éxito'
    case 'error':   return 'Error'
    case 'warning': return 'Advertencia'
    default:        return 'Info'
  }
}

function parsearDirecciones(text) {
  return text
    .split(/\r?\n/)
    .filter(l => l.trim())
    .filter(l => !l.trim().toUpperCase().startsWith('REM '))
    .filter(l => !l.trim().toUpperCase().startsWith('SET '))
    .map(linea => {
      let limpia = linea.trim()
      if (limpia.toUpperCase().includes('VALUES')) {
        limpia = limpia.replace(/^.*?VALUES\s*\(/i, '')
      }
      limpia = limpia.replace(/\);?$/g, '') 
                     .replace(/['"]/g, '') 
                     .trim()
      const partes = limpia.split(/[,\t;]+/).map(p => p.trim()).filter(Boolean)
      return { address: partes[0] || null, raw: linea.trim() }
    })
}

export default function LimpiezaSmw() {
  const { t } = useTranslation()
  const { currentUser } = useUser()
  const username = currentUser?.username || 'Sistema'

  const [tab, setTab] = useState('individual')

  // ── Individual ──
  const [address, setAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [selectedData, setSelectedData] = useState(null)
  const [showModal, setShowModal] = useState(false)
  
  // ── Masiva ──
  const [masivaText, setMasivaText]           = useState('')
  const [parsedItems, setParsedItems]         = useState([])   
  const [showPreview, setShowPreview]         = useState(false)
  const [batchResults, setBatchResults]       = useState([])   
  const [batchProgress, setBatchProgress]     = useState(0)
  
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewAddresses, setPreviewAddresses] = useState([])    
  const [batchCurrent, setBatchCurrent]       = useState(0)    
  const [batchTotal, setBatchTotal]           = useState(0)
  const [batchRunning, setBatchRunning]       = useState(false)
  const cancelRef = useRef(false)

  // ── Modales Sistema ──
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Actualizar vista previa masiva al escribir
  useEffect(() => {
    const parsed = parsearDirecciones(masivaText)
    setParsedItems(parsed)
    if (batchResults.length > 0) setBatchResults([])
  }, [masivaText])

  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const txt = ev.target.result
      const parsed = parsearDirecciones(txt)
      const validAddrs = parsed.map(p => p.address).filter(Boolean)
      
      if (validAddrs.length > 0) {
        setPreviewAddresses(validAddrs)
        setPreviewModalOpen(true)
      } else {
        setError(t('No se encontraron direcciones válidas en el archivo.'))
      }
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handleConfirmImport = (confirmedAddrs) => {
    setPreviewModalOpen(false)
    setMasivaText(confirmedAddrs.join('\n'))
  }

  // ── Limpieza Masiva Logic ──
  const handleLimpiarMasiva = async () => {
    const validos = parsedItems.filter(eq => eq.address)
    if (validos.length === 0) {
      setError(t('No hay direcciones válidas para limpiar.'))
      return
    }

    setBatchRunning(true)
    cancelRef.current = false
    setBatchResults([])
    setBatchProgress(0)
    setBatchTotal(validos.length)
    setBatchCurrent(0)

    let exitosos = 0
    let errores = 0
    let advertencias = 0

    // Evitamos re-render en cada paso copiando todo localmente 
    const resultados = []

    for (let i = 0; i < validos.length; i++) {
      if (cancelRef.current) break
      const item = validos[i]
      setBatchCurrent(i + 1)

      const rowProcesando = { address: item.address, status: 'processing', message: 'Consultando recursos...' }
      setBatchResults(prev => [...prev, rowProcesando])

      try {
        const resConsult = await consultarDireccionSmw(item.address, username, true)
        
        if (resConsult.cantidadRfs > 0) {
          // Necesita limpieza
          setBatchResults(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { address: item.address, status: 'processing', message: 'Limpiando recursos RFS...' }
            return updated
          })

          await limpiarDireccionSmw(resConsult.codigoDireccion, resConsult.rfsList, username, item.address, true)
          exitosos++
          
          const finalRow = { address: item.address, status: 'success', message: 'Limpieza de RFS exitosa.' }
          setBatchResults(prev => { const updated = [...prev]; updated[updated.length-1] = finalRow; return updated })

        } else {
          // No tiene recursos
          advertencias++
          const finalRow = { address: item.address, status: 'warning', message: 'No hay recursos amarrados (Libre).' }
          setBatchResults(prev => { const updated = [...prev]; updated[updated.length-1] = finalRow; return updated })
        }
      } catch (err) {
        errores++
        const finalRow = { address: item.address, status: 'error', message: err.message || 'Error de red / SMW' }
        setBatchResults(prev => { const updated = [...prev]; updated[updated.length-1] = finalRow; return updated })
      }

      setBatchProgress(Math.round(((i + 1) / validos.length) * 100))
    }

    if (!cancelRef.current) {
      const tipo = errores === 0 && advertencias === 0 ? 'success' : errores === validos.length ? 'error' : 'warning'
      setSuccessMsg(`Lote completado: ✅ ${exitosos} exitoso(s)  ⚠️ ${advertencias} advertencia(s)  ❌ ${errores} error(es) — de ${validos.length} dirección(es).`)
    }

    setBatchRunning(false)
  }

  const handleCancelarMasiva = () => {
    cancelRef.current = true
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!address.trim()) { setError(t('Por favor ingrese una dirección válida.')); return }

    setIsSearching(true)
    try {
      const data = await consultarDireccionSmw(address, username, false)
      setSelectedData(data)
      setShowModal(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  const handleClean = async (data) => {
    setShowModal(false)
    setIsSearching(true)
    
    try {
      await limpiarDireccionSmw(data.codigoDireccion, data.rfsList, username, address, false)
      setSuccessMsg(t('Liberación de RFS exitosa en SMW'))
      setAddress('')
      setSelectedData(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <SubPage
      icon={<MapPin size={18} />}
      badge={t('Módulo de Red')}
      title={t('Limpieza de Direcciones SMW')}
      description={t('Herramienta técnica para la normalización y depuración de registros de direcciones en el inventario SMW.')}
    >
      <div className="limpieza-container">
        
        {/* ══ PANEL PRINCIPAL SMW ══ */}
        <div className="limpieza-card glass-card">
          
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #fff 0%, var(--clr-accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <Search size={22} style={{ color: 'var(--clr-accent)' }} />
            {t('Ejecutar Limpieza SMW')}
          </h2>

          <div className="tabs">
            <button className={`tab-btn ${tab === 'individual' ? 'active' : ''}`} onClick={() => setTab('individual')}>
              {t('Individual')}
            </button>
            <button className={`tab-btn ${tab === 'masiva' ? 'active' : ''}`} onClick={() => setTab('masiva')}>
              <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
              {t('Masiva')}
            </button>
          </div>

          {tab === 'individual' && (
            <div className="fade-in">
              <form onSubmit={handleSearch}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="address">{t('Dirección Normalizada')}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="address"
                        type="text"
                        placeholder={t('Ej: CL 43F SUR')}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isSearching}
                        style={{ width: '100%', paddingRight: address ? '2.5rem' : undefined }}
                      />
                      {address && !isSearching && (
                        <button type="button" onClick={() => setAddress('')}
                          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-muted)',
                            display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                          title="Limpiar">
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={isSearching}
                  style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                  {isSearching
                    ? <><RefreshCw size={16} className="spin-animation" /> {t('Consultando...')}</>
                    : <><Search size={16} /> {t('Consultar')}</>
                  }
                </button>
              </form>

              {/* Help Section Individual */}
              <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: '1.5rem' }}>
                <div style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem', color: 'var(--clr-accent)' }}>
                    <PlusCircle size={18} />
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>{t('Propósito')}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--clr-muted)', lineHeight: '1.5' }}>
                    Libera recursos lógicos bloqueados en direcciones que requieren re-aprovisionamiento.
                  </p>
                </div>
                
                <div style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem', color: '#10b981' }}>
                    <CheckCircle2 size={18} />
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>{t('Garantía')}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--clr-muted)', lineHeight: '1.5' }}>
                    Asegura que la BD refleje la realidad física evitando errores de Cross-Reference.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'masiva' && (
            <div className="masiva-wrapper fade-in">
              
              <div className="masiva-toolbar">
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Upload size={14} /> Importar SQL / CSV
                  <input type="file" accept=".csv,.txt,.xlsx,.sql" style={{ display: 'none' }} onChange={handleImportFile} disabled={batchRunning} />
                </label>
                <span className="masiva-hint">
                  Formato: <code>Dirección</code> (una por línea)
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label>{t('Listado de Direcciones (una por línea)')}</label>
                <textarea
                  rows="7"
                  className="masiva-textarea"
                  value={masivaText}
                  onChange={e => setMasivaText(e.target.value)}
                  disabled={batchRunning}
                  placeholder={"Ej: CL 43F SUR\nKR 15 120 40\nAC 26 50 10"}
                />
              </div>

              {/* Estadísticas */}
              {parsedItems.filter(e => e.address).length > 0 && (
                <div className="masiva-stats">
                  <span className="stat-pill success">
                    <CheckCircle size={12} /> {parsedItems.filter(e => e.address).length} válida(s)
                  </span>
                  <span className="stat-pill info">
                    <FileText size={12} /> {parsedItems.length} línea(s) analizadas
                  </span>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setShowPreview(p => !p)}
                  >
                    {showPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {showPreview ? 'Ocultar' : 'Ver'} vista previa
                  </button>
                </div>
              )}

              {/* Vista Previa */}
              {showPreview && parsedItems.filter(e => e.address).length > 0 && (
                <div className="preview-table-wrap">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Dirección</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedItems.filter(e => e.address).slice(0, 20).map((eq, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td><code>{eq.address || '—'}</code></td>
                          <td>
                            {eq.address
                              ? <span className="badge-ok"><CheckCircle size={11} /> OK</span>
                              : <span className="badge-err"><AlertTriangle size={11} /> Vacío</span>
                            }
                          </td>
                        </tr>
                      ))}
                      {parsedItems.filter(e => e.address).length > 20 && (
                        <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--clr-muted)', fontSize: '0.8rem', padding: '0.5rem' }}>
                          … y {parsedItems.filter(e => e.address).length - 20} línea(s) más.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Controles Principales */}
              <div className="masiva-actions">
                {!batchRunning ? (
                  <button 
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleLimpiarMasiva}
                    disabled={parsedItems.filter(e => e.address).length === 0}
                  >
                    <Play size={15} /> Iniciar Limpieza SMW ({parsedItems.filter(e => e.address).length} direcciones)
                  </button>
                ) : (
                  <button 
                    type="button"
                    className="btn btn-danger" 
                    style={{ flex: 1 }}
                    onClick={handleCancelarMasiva}
                  >
                    <StopCircle size={15} /> Detener Proceso
                  </button>
                )}
              </div>

              {/* ── Barra de progreso ── */}
              {(batchRunning || batchResults.length > 0) && batchTotal > 0 && (
                <div className="batch-progress-wrap">
                  <div className="batch-progress-header">
                    <span className="batch-progress-label">
                      {batchRunning
                        ? <>Analizando dirección <strong>{batchCurrent}</strong> de <strong>{batchTotal}</strong>…</>
                        : <>Operación concluída: <strong>{batchCurrent}</strong> de <strong>{batchTotal}</strong></>
                      }
                    </span>
                    <span className="batch-progress-pct">{batchProgress}%</span>
                  </div>
                  <div className="batch-progress-bar">
                    <div
                      className={`batch-progress-fill ${batchRunning ? 'animated' : ''}`}
                      style={{ width: `${batchProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* ── Tabla de resultados Lote ── */}
              {batchResults.length > 0 && (
                <div className="batch-results-wrap">
                  <div className="batch-results-header">
                    <span><Layers size={13} /> Resultados y Logs ({batchResults.length})</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span className="stat-pill success" style={{ fontSize: '0.7rem' }}>
                        <CheckCircle size={11} /> {batchResults.filter(r => r.status === 'success').length}
                      </span>
                      <span className="stat-pill warning" style={{ fontSize: '0.7rem' }}>
                        <AlertTriangle size={11} /> {batchResults.filter(r => r.status === 'warning').length}
                      </span>
                      <span className="stat-pill error" style={{ fontSize: '0.7rem' }}>
                        <XCircle size={11} /> {batchResults.filter(r => r.status === 'error').length}
                      </span>
                    </div>
                  </div>
                  <div className="batch-results-list">
                    {batchResults.map((r, i) => (
                      <div key={i} className={`batch-result-row status-${r.status}`}>
                        <span className={`batch-result-icon ${r.status}`}>
                          {r.status === 'success'    && <CheckCircle size={14} />}
                          {r.status === 'warning'    && <AlertTriangle size={14} />}
                          {r.status === 'error'      && <XCircle size={14} />}
                          {r.status === 'processing' && <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
                        </span>
                        <span className="batch-result-serial"><code>{r.address}</code></span>
                        <span className="batch-result-msg">{r.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <SmwCleaningModal 
        isOpen={showModal}
        data={selectedData} 
        onClose={() => setShowModal(false)}
        onClean={handleClean}
      />
      
      <SmwImportPreviewModal 
        isOpen={previewModalOpen}
        fileAddresses={previewAddresses}
        onClose={() => setPreviewModalOpen(false)}
        onConfirm={handleConfirmImport}
      />

      <AlertModal open={!!error} type="error" message={error} onClose={() => setError(null)} />
      <AlertModal open={!!successMsg} type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />
      
    </SubPage>
  )
}
