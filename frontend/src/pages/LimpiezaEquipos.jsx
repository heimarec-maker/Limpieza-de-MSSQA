import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Monitor, Sparkles, Search, Download, History,
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  CalendarDays, Upload, Play, StopCircle, FileText,
  ChevronDown, ChevronUp, Layers
} from 'lucide-react'
import SubPage from '../components/SubPage'
import AlertModal from '../components/AlertModal'
import ImportPreviewModal from '../components/ImportPreviewModal'
import { addActivityLog } from '../services/activityLog'
import { exportOperationResults } from '../services/exportService'
import { ejecutarLimpieza, consultarEquipo, getLogs } from '../services/limpiezaDbService'
import './LimpiezaEquipos.css'

const getUsername = () => {
  try {
    const u = JSON.parse(localStorage.getItem('currentUser'))
    return u?.username || 'Sistema'
  } catch { return 'Sistema' }
}

const mapResultType = (type) => {
  switch (type) {
    case 'success': return 'Éxito'
    case 'error':   return 'Error'
    case 'warning': return 'Advertencia'
    default:        return 'Info'
  }
}

const RESULT_ICON = {
  'ÉXITO':        { Icon: CheckCircle,    cls: 'success' },
  'INFO':         { Icon: AlertTriangle,  cls: 'info'    },
  'NO_ENCONTRADO':{ Icon: AlertTriangle,  cls: 'warning' },
  'ERROR':        { Icon: XCircle,        cls: 'error'   },
}

/** Parsea el texto del textarea en lista de { serial, mac } */
function parsearEquipos(text) {
  return text
    .split(/\r?\n/)
    .filter(l => l.trim())
    .filter(l => !l.trim().toUpperCase().startsWith('REM '))
    .filter(l => !l.trim().toUpperCase().startsWith('SET '))
    .map(linea => {
      // Limpiar sintaxis típica de SQL: borrar todo hasta el "VALUES (" si existe
      let limpia = linea.trim()
      if (limpia.toUpperCase().includes('VALUES')) {
        limpia = limpia.replace(/^.*?VALUES\s*\(/i, '')
      }
      limpia = limpia.replace(/\);?$/g, '') // borrar ); final
                     .replace(/['"]/g, '') // borrar comillas
                     .trim()

      const partes = limpia.split(/[,\t;]+/).map(p => p.trim()).filter(Boolean)
      return { serial: partes[0] || null, raw: linea.trim() }
    })
}

export default function LimpiezaEquipos() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('individual')

  // ── Individual ──
  const [serial, setSerial]   = useState('')

  // ── Masiva ──
  const [masivaText, setMasivaText]           = useState('')
  const [parsedEquipos, setParsedEquipos]     = useState([])   // Vista previa
  const [showPreview, setShowPreview]         = useState(false)
  const [batchResults, setBatchResults]       = useState([])   // Resultados del lote
  const [batchProgress, setBatchProgress]     = useState(0)
  
  // ── Import / Preview Modal ──
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewSerials, setPreviewSerials]     = useState([])    // 0-100
  const [batchCurrent, setBatchCurrent]       = useState(0)    // equipo actual
  const [batchTotal, setBatchTotal]           = useState(0)
  const [batchRunning, setBatchRunning]       = useState(false)
  const cancelRef = useRef(false)

  // ── Generales ──
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState(null)
  const [querySerial, setQuerySerial] = useState('')
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryResult, setQueryResult] = useState(null)
  const [history, setHistory]       = useState([])

  // ── Historial BD ──
  const [dbLogs, setDbLogs]         = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError]   = useState(null)

  const cargarMisLogs = useCallback(async () => {
    const username = getUsername()
    setLogsLoading(true)
    setLogsError(null)
    try {
      const todos = await getLogs()
      setDbLogs(todos.filter(l => l.usuario === username))
    } catch {
      setLogsError('No se pudo cargar el historial. ¿Está corriendo npm run server?')
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => { cargarMisLogs() }, [])

  // ── Actualizar vista previa al escribir ──
  useEffect(() => {
    const parsed = parsearEquipos(masivaText)
    setParsedEquipos(parsed)
    // Resetear resultados si el texto cambia
    if (batchResults.length > 0) setBatchResults([])
    setResult(null)
  }, [masivaText])

  // ── Importar CSV / TXT / SQL ──
  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const txt = ev.target.result
      const parsed = parsearEquipos(txt)
      const validSerials = parsed.map(p => p.serial).filter(Boolean)
      
      if (validSerials.length > 0) {
        setPreviewSerials(validSerials)
        setPreviewModalOpen(true)
      } else {
        setResult({ type: 'error', message: t('No se encontraron seriales válidos en el archivo importado.') })
      }
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handleConfirmImport = (confirmedSerials) => {
    setPreviewModalOpen(false)
    setMasivaText(confirmedSerials.join('\n'))
  }

  // ── Limpieza individual ──
  const handleLimpiarIndividual = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setQueryResult(null)

    if (!serial) {
      setResult({ type: 'error', message: t('El Serial es obligatorio para la limpieza.') })
      setLoading(false)
      return
    }

    try {
      const res = await ejecutarLimpieza(serial, '', getUsername(), false)
      setResult(res)
      setHistory(prev => [{
        input: serial,
        status: mapResultType(res.type),
        message: res.message,
        timestamp: new Date().toISOString()
      }, ...prev])
      addActivityLog({
        usuario: getUsername(),
        accion: 'Limpieza',
        modulo: 'Limpieza Equipos (Individual)',
        detalles: `Serial: ${serial}`,
        resultado: mapResultType(res.type),
      })
      cargarMisLogs()
    } catch {
      setResult({ type: 'error', message: t('Error al conectar con el servidor. ¿Está corriendo npm run server?') })
    }
    setLoading(false)
  }

  // ── Limpieza masiva con progreso ──
  const handleLimpiarMasiva = async () => {
    const validos = parsedEquipos.filter(eq => eq.serial)

    if (validos.length === 0) {
      setResult({ type: 'error', message: t('No se detectaron seriales válidos. Ingrese un serial por línea.') })
      return
    }

    cancelRef.current = false
    setBatchRunning(true)
    setBatchResults([])
    setBatchProgress(0)
    setBatchCurrent(0)
    setBatchTotal(validos.length)
    setResult(null)

    let exitosos = 0, errores = 0, advertencias = 0
    const resultados = []

    for (let i = 0; i < validos.length; i++) {
      if (cancelRef.current) {
        setResult({ type: 'warning', message: `Proceso cancelado en equipo ${i + 1} de ${validos.length}.` })
        break
      }

      const eq = validos[i]
      setBatchCurrent(i + 1)

      // Marcar el equipo como "procesando"
      const rowProcesando = {
        serial: eq.serial, status: 'processing', message: 'Procesando...'
      }
      setBatchResults(prev => [...prev, rowProcesando])

      try {
        const res = await ejecutarLimpieza(eq.serial, '', getUsername(), true)

        const row = {
          serial: eq.serial,
          status: res.type,      // 'success' | 'warning' | 'error'
          message: res.message,
        }

        if (res.type === 'success')      exitosos++
        else if (res.type === 'warning') advertencias++
        else                             errores++

        resultados.push(row)
        setBatchResults(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = row
          return updated
        })

        setHistory(prev => [{
          input: eq.serial,
          status: mapResultType(res.type),
          message: res.message,
          timestamp: new Date().toISOString()
        }, ...prev])

      } catch {
        errores++
        const row = {
          serial: eq.serial,
          status: 'error', message: 'Error de red o servidor'
        }
        resultados.push(row)
        setBatchResults(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = row
          return updated
        })
        setHistory(prev => [{
          input: eq.serial,
          status: 'Error', message: 'Error de red o servidor',
          timestamp: new Date().toISOString()
        }, ...prev])
      }

      setBatchProgress(Math.round(((i + 1) / validos.length) * 100))
    }

    if (!cancelRef.current) {
      const tipo = errores === 0 && advertencias === 0
        ? 'success'
        : errores === validos.length
          ? 'error'
          : 'warning'

      setResult({
        type: tipo,
        message: `Lote completado: ✅ ${exitosos} exitoso(s)  ⚠️ ${advertencias} advertencia(s)  ❌ ${errores} error(es) — de ${validos.length} equipo(s).`
      })

      addActivityLog({
        usuario: getUsername(),
        accion: 'Limpieza',
        modulo: 'Limpieza Equipos (Masiva)',
        detalles: `Lote de ${validos.length} equipo(s) — ${exitosos} OK, ${advertencias} adv, ${errores} errores`,
        resultado: mapResultType(tipo),
      })

      cargarMisLogs()
    }

    setBatchRunning(false)
  }

  const handleCancelar = () => {
    cancelRef.current = true
  }

  // ── Exportar resultados del lote ──
  const handleExportarLote = () => {
    const rows = batchResults.map(r => ({
      input: r.serial,
      status: r.status,
      message: r.message,
      timestamp: new Date().toISOString()
    }))
    exportOperationResults({ module: 'Limpieza_Masiva', results: rows, t })
  }


  const handleConsultar = async (e) => {
    e.preventDefault()
    if (!querySerial) {
      setQueryResult({ type: 'error', message: t('El Serial es obligatorio para la consulta.') })
      return
    }
    setQueryLoading(true)
    setQueryResult(null)
    setResult(null)

    try {
      const res = await consultarEquipo(querySerial)
      setQueryResult(res)
      addActivityLog({
        usuario: getUsername(),
        accion: 'Consulta',
        modulo: 'Limpieza Equipos',
        detalles: `Consulta serial: ${querySerial}`,
        resultado: mapResultType(res.type),
      })
    } catch {
      setQueryResult({ type: 'error', message: t('Error al conectar con el servidor o al consultar el equipo.') })
    }
    setQueryLoading(false)
  }

  // ── Stats del textarea masiva ──
  const validCount   = parsedEquipos.filter(e => e.serial).length
  const invalidCount = 0 // MAC ya no es requerida

  return (
    <SubPage
      icon={<Monitor size={18} />}
      badge={t('Módulo')}
      title={t('Limpieza de equipos')}
      description={t('Gestión, revisión y limpieza del inventario de equipos registrados en el sistema.')}
    >
      <div className="limpieza-container">

        {/* ══ PANEL DE LIMPIEZA ══ */}
        <div className="limpieza-card glass-card">
          <h2><Sparkles size={20} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />{t('Ejecutar Limpieza')}</h2>

          <div className="tabs">
            <button className={`tab-btn ${tab === 'individual' ? 'active' : ''}`} onClick={() => setTab('individual')}>
              {t('Individual')}
            </button>
            <button className={`tab-btn ${tab === 'masiva' ? 'active' : ''}`} onClick={() => setTab('masiva')}>
              <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
              {t('Masiva')}
            </button>
          </div>

          {/* ── Individual ── */}
          {tab === 'individual' && (
            <form onSubmit={handleLimpiarIndividual}>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('Serial del Equipo')}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Ej. ZTE123456"
                      value={serial}
                      onChange={e => setSerial(e.target.value)}
                      style={{ width: '100%', paddingRight: serial ? '2.5rem' : undefined }}
                    />
                    {serial && (
                      <button type="button" onClick={() => setSerial('')}
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
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? t('Procesando...') : t('Limpiar')}
              </button>
            </form>
          )}

          {/* ── Masiva ── */}
          {tab === 'masiva' && (
            <div className="masiva-wrapper">

              {/* Barra de herramientas masiva */}
              <div className="masiva-toolbar">
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Upload size={14} /> Importar SQL / CSV
                  <input type="file" accept=".csv,.txt,.xlsx,.sql" style={{ display: 'none' }} onChange={handleImportFile} />
                </label>
                <span className="masiva-hint">
                  Formato: <code>Serial</code> (uno por línea)
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label>{t('Listado de equipos (un Serial por línea)')}</label>
                <textarea
                  rows="7"
                  placeholder={"ZTE123456\nTVBOXSN0000001\nZTEG87654328"}
                  value={masivaText}
                  onChange={e => setMasivaText(e.target.value)}
                  disabled={batchRunning}
                  className="masiva-textarea"
                />
              </div>

              {/* Estadísticas de parsing */}
              {parsedEquipos.length > 0 && (
                <div className="masiva-stats">
                  <span className="stat-pill success">
                    <CheckCircle size={12} /> {validCount} válido(s)
                  </span>
                  <span className="stat-pill info">
                    <FileText size={12} /> {parsedEquipos.length} línea(s) total
                  </span>

                  {/* Vista previa toggle */}
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

              {/* Vista previa de equipos */}
              {showPreview && parsedEquipos.length > 0 && (
                <div className="preview-table-wrap">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Serial</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedEquipos.slice(0, 20).map((eq, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td><code>{eq.serial || '—'}</code></td>
                          <td>
                            {eq.serial
                              ? <span className="badge-ok"><CheckCircle size={11} /> OK</span>
                              : <span className="badge-err"><AlertTriangle size={11} /> Sin serial</span>
                            }
                          </td>
                        </tr>
                      ))}
                      {parsedEquipos.length > 20 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--clr-muted)', fontSize: '0.8rem', padding: '0.5rem' }}>
                          … y {parsedEquipos.length - 20} línea(s) más
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Botones de acción */}
              <div className="masiva-actions">
                {!batchRunning ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleLimpiarMasiva}
                    disabled={validCount === 0}
                  >
                    <Play size={15} /> Iniciar Limpieza Masiva ({validCount} equipo{validCount !== 1 ? 's' : ''})
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={handleCancelar}
                  >
                    <StopCircle size={15} /> Cancelar proceso
                  </button>
                )}

                {batchResults.length > 0 && !batchRunning && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportarLote}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <Download size={14} /> Exportar resultados
                  </button>
                )}
              </div>

              {/* ── Barra de progreso ── */}
              {(batchRunning || batchProgress > 0) && batchTotal > 0 && (
                <div className="batch-progress-wrap">
                  <div className="batch-progress-header">
                    <span className="batch-progress-label">
                      {batchRunning
                        ? <>Procesando equipo <strong>{batchCurrent}</strong> de <strong>{batchTotal}</strong>…</>
                        : <>Procesado: <strong>{batchCurrent}</strong> de <strong>{batchTotal}</strong></>
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

              {/* ── Tabla de resultados del lote ── */}
              {batchResults.length > 0 && (
                <div className="batch-results-wrap">
                  <div className="batch-results-header">
                    <span><Layers size={13} /> Resultados del lote ({batchResults.length})</span>
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
                        <span className="batch-result-serial"><code>{r.serial}</code></span>
                        <span className="batch-result-msg">{r.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mensaje resultado general */}
          <AlertModal
            open={!!result}
            type={result?.type}
            message={result?.message}
            onClose={() => setResult(null)}
          />
        </div>

        {/* ══ PANEL DE CONSULTA ══ */}
        <div className="limpieza-card glass-card">
          <h2><Search size={20} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />{t('Consultar Equipos')}</h2>
          <form onSubmit={handleConsultar}>
            <div className="form-row">
              <div className="form-group">
                <label>{t('Serial del Equipo')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder={t('Ej: ZTE12345')}
                    value={querySerial}
                    onChange={e => setQuerySerial(e.target.value)}
                    style={{ width: '100%', paddingRight: querySerial ? '2.5rem' : undefined }}
                  />
                  {querySerial && (
                    <button type="button" onClick={() => setQuerySerial('')}
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
            <button type="submit" className="btn btn-primary" disabled={queryLoading} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              {queryLoading ? <><RefreshCw size={16} className="spin-animation" /> {t('Consultando...')}</> : <><Search size={16} /> {t('Consultar')}</>}
            </button>
          </form>

          <AlertModal
            open={!!queryResult}
            type={queryResult?.type}
            message={queryResult?.message}
            onClose={() => setQueryResult(null)}
          />
        </div>

        {/* ══ EXPORTAR SESIÓN ══ */}
        {history.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              style={{ gap: '0.5rem' }}
              onClick={() => exportOperationResults({ module: 'Limpieza_Equipos', results: history, t })}
            >
              <Download size={16} /> {t('Exportar')} ({history.length})
            </button>
          </div>
        )}

        {/* ══ MI HISTORIAL DE LIMPIEZAS (BD) ══ */}
        <div className="limpieza-card glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>
              <History size={20} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
              {t('Mi Historial de Limpiezas')}
            </h2>
            <button
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', gap: '0.4rem' }}
              onClick={cargarMisLogs}
              disabled={logsLoading}
            >
              <RefreshCw size={14} style={{ animation: logsLoading ? 'spin 0.8s linear infinite' : 'none' }} />
              {t('Actualizar')}
            </button>
          </div>

          <AlertModal
            open={!!logsError}
            type="error"
            message={logsError}
            onClose={() => setLogsError(null)}
          />

          {!logsError && dbLogs.length === 0 && !logsLoading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--clr-muted)' }}>
              <History size={40} style={{ opacity: 0.3 }} />
              <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>{t('Aún no tienes limpiezas registradas.')}</p>
            </div>
          )}

          {logsLoading && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--clr-muted)' }}>
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--clr-accent)' }} />
            </div>
          )}

          {dbLogs.length > 0 && (
            <div className="op-history-panel">
              <div className="op-history-header">
                <p className="op-history-title">
                  <CalendarDays size={14} />
                  {t('Últimas operaciones')} — <strong style={{ color: '#fff' }}>{dbLogs.length}</strong> {t('registro(s)')}
                </p>
              </div>
              <div className="op-history-list">
                {(() => {
                  const grouped = []
                  dbLogs.forEach(log => {
                    const rc = RESULT_ICON[log.resultado] || { Icon: AlertTriangle, cls: 'warning' }
                    const dateStr = log.ejecutado_at.includes('T') ? log.ejecutado_at : log.ejecutado_at.replace(' ', 'T')
                    const fecha = new Date(dateStr)
                    const last = grouped.find(g => g.serial_nbr === log.serial_nbr && Math.abs(g.fecha - fecha) < 60000)
                    if (last) {
                      last.detalles.push(log.detalle || log.etapa)
                      if (log.resultado === 'ÉXITO' || log.resultado === 'INFO') last.exitos++
                      last.total++
                    } else {
                      grouped.push({
                        id: log.log_id, serial_nbr: log.serial_nbr, fecha, resultado: log.resultado,
                        rc, detalles: [log.detalle || log.etapa],
                        exitos: (log.resultado === 'ÉXITO' || log.resultado === 'INFO') ? 1 : 0, total: 1
                      })
                    }
                  })
                  return grouped.slice(0, 50).map(group => (
                    <div key={group.id} className="op-history-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem', padding: '0.8rem' }}>
                      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="op-history-details">
                          <strong style={{ color: 'var(--clr-accent)', fontSize: '1.05rem' }}>{group.serial_nbr}</strong>
                        </span>
                        <span className={`op-history-badge result-box ${group.exitos === group.total ? 'success' : group.rc.cls}`} style={{ margin: 0, padding: '0.18rem 0.55rem', animation: 'none' }}>
                          {group.exitos === group.total ? <CheckCircle size={12} /> : <group.rc.Icon size={12} />}
                          {group.exitos === group.total ? 'LIMPIEZA EXITOSA' : group.resultado}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)', paddingLeft: '0.5rem', borderLeft: '2px solid var(--clr-border)' }}>
                        {group.detalles.map((d, i) => <div key={i}>• {d}</div>)}
                      </div>
                      <div className="op-history-time" style={{ alignSelf: 'flex-end', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                        {group.fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} {group.fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}
        </div>

      </div>

      <ImportPreviewModal 
        isOpen={previewModalOpen}
        fileSerials={previewSerials}
        onClose={() => setPreviewModalOpen(false)}
        onConfirm={handleConfirmImport}
      />
    </SubPage>
  )
}
