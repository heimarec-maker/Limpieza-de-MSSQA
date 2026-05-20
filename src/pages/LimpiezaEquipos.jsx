import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Monitor, Sparkles, Search, Download, History, CheckCircle, XCircle, AlertTriangle, RefreshCw, CalendarDays } from 'lucide-react'
import SubPage from '../components/SubPage'
import { addActivityLog } from '../services/activityLog'
import { exportOperationResults } from '../services/exportService'
import { ejecutarLimpieza, consultarEquipo, getLogs } from '../services/limpiezaDbService'
import './LimpiezaEquipos.css'

const getUsername = () => {
  try {
    const u = JSON.parse(localStorage.getItem('currentUser'))
    return u?.username || 'Desconocido'
  } catch { return 'Desconocido' }
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
  'NO_ENCONTRADO':{ Icon: AlertTriangle,  cls: 'warning' },
  'ERROR':        { Icon: XCircle,        cls: 'error'   },
}

export default function LimpiezaEquipos() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('individual')
  const [serial, setSerial] = useState('')
  const [mac, setMac] = useState('')
  const [masivaText, setMasivaText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [querySerial, setQuerySerial] = useState('')

  const [queryLoading, setQueryLoading] = useState(false)
  const [queryResult, setQueryResult] = useState(null)
  const [history, setHistory] = useState([])

  // ── Historial personal desde BD ──
  const [dbLogs,      setDbLogs]      = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError,   setLogsError]   = useState(null)

  const cargarMisLogs = useCallback(async () => {
    const username = getUsername()
    setLogsLoading(true)
    setLogsError(null)
    try {
      const todos = await getLogs()
      // Filtrar solo los del usuario actual
      setDbLogs(todos.filter(l => l.usuario === username))
    } catch {
      setLogsError('No se pudo cargar el historial. ¿Está corriendo npm run server?')
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => { cargarMisLogs() }, [])

  const handleLimpiar = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setQueryResult(null)

    if (tab === 'individual') {
      if (!serial) {
        setResult({ type: 'error', message: t('Tanto el Serial como la MAC son obligatorios para la limpieza.') })
        setLoading(false)
        return
      }

      try {
        const res = await ejecutarLimpieza(serial, mac, getUsername())
        setResult(res)

        setHistory(prev => [{
          input: mac ? `${serial} | ${mac}` : serial,
          status: mapResultType(res.type),
          message: res.message,
          timestamp: new Date().toISOString()
        }, ...prev])
        addActivityLog({
          usuario: getUsername(),
          accion: 'Limpieza',
          modulo: 'Limpieza Equipos (Individual)',
          detalles: `Serial: ${serial}${mac ? ` | MAC: ${mac}` : ''}`,
          resultado: mapResultType(res.type),
        })

        // Actualizar el historial desde la base de datos para ver los últimos cambios
        cargarMisLogs()
      } catch {
        setResult({ type: 'error', message: t('Error al conectar con el servidor. ¿Está corriendo npm run server?') })
      }

    } else {
      // Limpieza masiva: procesar línea por línea
      if (!masivaText) {
        setResult({ type: 'error', message: t('Debes ingresar la lista de equipos.') })
        setLoading(false)
        return
      }

      // Procesamos saltos de línea (Windows/Unix)
      const rawLineas = masivaText.split(/\r?\n/).filter(l => l.trim())
      
      // Extraer seriales soportando comas, tabulaciones o punto y comas (ej: desde Excel)
      const equiposParaLimpiar = rawLineas.map(linea => {
        const partes = linea.split(/[,\t;]+/).map(p => p.trim()).filter(Boolean)
        return {
          serial: partes[0] || null,
          mac: partes[1] || null // Asumimos que la MAC es la segunda parte
        }
      }).filter(eq => eq.serial && eq.mac) // Filtramos líneas que no tengan ambos

      if (equiposParaLimpiar.length === 0) {
        setResult({ type: 'error', message: t('No se detectaron seriales válidos.') })
        setLoading(false)
        return
      }

      let exitosos = 0, errores = 0
      const batchHistory = []

      for (const equipoData of equiposParaLimpiar) {
        try {
          const res = await ejecutarLimpieza(equipoData.serial, equipoData.mac, getUsername()) // Pasar MAC
          if (res.type === 'success') exitosos++
          else errores++
          
          batchHistory.push({
            input: `${equipoData.serial} | ${equipoData.mac}`,
            status: mapResultType(res.type),
            message: res.message,
            timestamp: new Date().toISOString()
          })
        } catch {
          errores++
          batchHistory.push({
            input: `${equipoData.serial} | ${equipoData.mac}`,
            status: 'Error',
            message: 'Error de red o de servidor',
            timestamp: new Date().toISOString()
          })
        }
      }

      const msg = `Lote procesado: ${exitosos} exitoso(s), ${errores} error(es) de ${equiposParaLimpiar.length} equipo(s). Revisa el historial para ver el detalle de cada uno.`
      const tipo = errores === 0 ? 'success' : exitosos > 0 ? 'warning' : 'error'
      setResult({ type: tipo, message: msg })
      
      // Mostrar en la tabla de sesión actual cada equipo individualmente
      setHistory(prev => [...batchHistory, ...prev])

      addActivityLog({
        usuario: getUsername(),
        accion: 'Limpieza',
        modulo: 'Limpieza Equipos (Masiva)',
        detalles: `Lote de ${equiposParaLimpiar.length} equipo(s) — ${exitosos} OK, ${errores} errores`,
        resultado: mapResultType(tipo),
      })

      // Actualizar automáticamente el historial que viene de la BD
      cargarMisLogs()
    }

    setLoading(false)
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
      setQueryResult(res) // Para mantener type y message en la UI
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


  return (
    <SubPage
      icon={<Monitor size={18} />}
      badge={t('Módulo')}
      title={t('Limpieza de equipos')}
      description={t('Gestión, revisión y limpieza del inventario de equipos registrados en el sistema.')}
    >
      <div className="limpieza-container">
        
        {/* PANEL DE LIMPIEZA */}
        <div className="limpieza-card glass-card">
          <h2><Sparkles size={20} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />{t('Ejecutar Limpieza')}</h2>
          
          <div className="tabs">
            <button 
              className={`tab-btn ${tab === 'individual' ? 'active' : ''}`}
              onClick={() => setTab('individual')}
            >
              {t('Individual')}
            </button>
            <button 
              className={`tab-btn ${tab === 'masiva' ? 'active' : ''}`}
              onClick={() => setTab('masiva')}
            >
              {t('Masiva')}
            </button>
          </div>

          <form onSubmit={handleLimpiar}>
            {tab === 'individual' ? (
              <div className="form-row">
                <div className="form-group">
                  <label>{t('Serial del Equipo')}</label>
                  <input 
                    type="text" 
                    placeholder="Ej. ZTE123456" 
                    value={serial} 
                    onChange={e => setSerial(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>{t('Dirección MAC')}</label>
                  <input 
                    type="text" 
                    placeholder="Ej: AAAAAAAAA115" 
                    value={mac} 
                    onChange={e => setMac(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>{t('Listado de equipos (Serial, MAC por línea)')}</label>
                <textarea 
                  rows="5" 
                  placeholder="ZTE123456, AAAAAAAAA115 &#10; TVBOXSN0000001, TVBOXSN0000001"
                  value={masivaText}
                  onChange={e => setMasivaText(e.target.value)}
                ></textarea>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? t('Procesando...') : t('Iniciar Limpieza')}
            </button>
          </form>

          {result && (
            <div className={`result-box ${result.type}`}>
              {result.message}
            </div>
          )}
        
        </div>

        {/* PANEL DE CONSULTA */}
        <div className="limpieza-card glass-card">
          <h2><Search size={20} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />{t('Consulta de Estado')}</h2>
          <form onSubmit={handleConsultar}>
            <div className="form-row">
              <div className="form-group" style={{ width: '100%' }}>
                <label>{t('Serial del Equipo')}</label>
                <input 
                  type="text" 
                  placeholder={t('Serial del Equipo')} 
                  value={querySerial}
                  onChange={e => setQuerySerial(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={queryLoading} style={{ width: '100%' }}>
              {queryLoading ? t('Consultando...') : t('Consultar Estado')}
            </button>
          </form>

          {queryResult && (
            <div className={`result-box ${queryResult.type}`}>
              {queryResult.message}
            </div>
          )}
        </div>

        {/* BOTÓN EXPORTAR */}
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

        {/* ══ PANEL: MI HISTORIAL DE LIMPIEZAS (desde BD) ══ */}
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

          {logsError && (
            <div className="result-box error">{logsError}</div>
          )}

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
                {dbLogs.slice(0, 50).map(log => {
                  const rc = RESULT_ICON[log.resultado] || { Icon: AlertTriangle, cls: 'warning' }
                  // Asegurar que se puede parsear si el formato es YYYY-MM-DD HH:mm:ss o ISO
                  const dateStr = log.ejecutado_at.includes('T') ? log.ejecutado_at : log.ejecutado_at.replace(' ', 'T')
                  const fecha = new Date(dateStr)
                  return (
                    <div key={log.log_id} className="op-history-row">
                      <span className={`op-history-badge result-box ${rc.cls}`} style={{ margin: 0, padding: '0.18rem 0.55rem', animation: 'none' }}>
                        <rc.Icon size={12} />
                        {log.resultado}
                      </span>
                      <span className="op-history-details">
                        <strong style={{ color: 'var(--clr-accent)' }}>{log.serial_nbr}</strong>
                        {' — '}{log.detalle || log.etapa}
                      </span>
                      <span className="op-history-time">
                        {fecha.toLocaleDateString('es-CO', { day:'2-digit', month:'short' })} {fecha.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </SubPage>
  )
}
