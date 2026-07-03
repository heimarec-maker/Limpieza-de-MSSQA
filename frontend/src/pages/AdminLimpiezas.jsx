import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  Sparkles, Search, Filter, Download, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Info, X,
  User, Clock, Monitor, ChevronRight, Database,
  CalendarDays, Activity
} from 'lucide-react'
import SubPage from '../components/SubPage'
import { getLogs, getUsuarios } from '../services/limpiezaDbService'
import { exportExcel } from '../services/exportService'
import './AdminPanel.css'

const ETAPA_CONFIG = {
  'BORRADO':      { label: 'Borrado',       color: '#a855f7' },
  'SERV_ITEM':    { label: 'Serv. Item',    color: '#3b82f6' },
  'SERV_REQ':     { label: 'Serv. Req',     color: '#f59e0b' },
  'VALIDACION':   { label: 'Validación',    color: '#6366f1' },
  'SMW_LIMPIEZA': { label: 'Liberación SMW', color: '#10b981' },
  'SMW_CONSULTA': { label: 'Consulta SMW',  color: '#6366f1' },
}

/** Elimina sufijos _MASIVO / _MASIVA / _INDIVIDUAL para buscar en ETAPA_CONFIG */
function normalizeEtapa(etapa = '') {
  return String(etapa).replace(/_(MASIVO|MASIVA|INDIVIDUAL)$/i, '')
}

/** Devuelve la etiqueta de modalidad a mostrar */
function getTipoOperacion(etapa = '') {
  const upper = String(etapa).toUpperCase()
  if (upper.includes('MASIV'))      return 'Masiva'
  if (upper.includes('INDIVIDUAL')) return 'Individual'
  return null
}

const RESULT_CONFIG = {
  'ÉXITO':        { Icon: CheckCircle,   className: 'badge-success', color: '#10b981' },
  'INFO':          { Icon: Info,          className: 'badge-info',    color: '#6366f1' },
  'ERROR':        { Icon: XCircle,       className: 'badge-error',   color: '#ef4444' },
}

function getResultCfg(r) {
  return RESULT_CONFIG[r] || { Icon: Info, className: 'badge-info', color: 'var(--clr-accent)' }
}

const formatDate = (iso) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { date: '—', time: '—' }
  return {
    date: d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
}

export default function AdminLimpiezas() {
  const { t } = useTranslation()

  const [logs,          setLogs]          = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [filterUsuario, setFilterUsuario] = useState('Todos')
  const [filterEtapa,   setFilterEtapa]   = useState('Todas')
  const [filterResult,  setFilterResult]  = useState('Todos')
  const [searchSerial,  setSearchSerial]  = useState('')
  const [refreshing,    setRefreshing]    = useState(false)
  const [selectedLog,   setSelectedLog]   = useState(null)
  const [dbUsers,       setDbUsers]       = useState([])

  const cargarLogs = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const data = await getLogs()
      setLogs(data)
    } catch {
      setError('No se pudo conectar con el servidor. ¿Está corriendo npm run server?')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const cargarDataInicial = async () => {
    cargarLogs()
    try {
      const dbUsuarios = await getUsuarios()
      setDbUsers(dbUsuarios || [])
    } catch (e) {}
  }

  useEffect(() => {
    cargarDataInicial()
    const interval = setInterval(() => cargarLogs(true), 30000)
    return () => clearInterval(interval)
  }, [])

  // Listas únicas para filtros
  const usuarios = useMemo(() => {
    return [...new Set(dbUsers.map(u => u.usuario).filter(Boolean))].sort()
  }, [dbUsers])
  const etapas   = useMemo(() => [...new Set(logs.map(l => l.etapa))].sort(), [logs])

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const exito       = logs.filter(l => l.resultado === 'ÉXITO').length
    const info        = logs.filter(l => l.resultado === 'INFO').length
    const error       = logs.filter(l => l.resultado === 'ERROR').length
    const serialesUnicos = new Set(logs.map(l => l.serial_nbr)).size
    return { total: logs.length, exito, info, error, serialesUnicos }
  }, [logs])

  // Filtrado
  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterUsuario !== 'Todos' && l.usuario !== filterUsuario) return false
      // Comparar etapa normalizando ambos lados para ignorar sufijos _MASIVO/_INDIVIDUAL
      if (filterEtapa !== 'Todas' && normalizeEtapa(l.etapa) !== normalizeEtapa(filterEtapa)) return false
      if (filterResult !== 'Todos' && l.resultado !== filterResult) return false
      if (searchSerial) {
        const q = searchSerial.toUpperCase()
        return l.serial_nbr?.toUpperCase().includes(q) || l.detalle?.toLowerCase().includes(q.toLowerCase())
      }
      return true
    })
  }, [logs, filterUsuario, filterEtapa, filterResult, searchSerial])

  // Filtrado para mostrar solo exitosos en la tabla principal
  const exitosos = useMemo(() => {
    return filtered.filter(l => l.resultado === 'ÉXITO')
  }, [filtered])

  // Agrupar lotes masivos: N BORRADO_MASIVO del mismo usuario en ventana 15 min → 1 fila
  const agrupados = useMemo(() => {
    const WINDOW_MS = 15 * 60 * 1000
    const consumed = new Set()
    const result   = []

    const isMasivoMain = (l) =>
      normalizeEtapa(l.etapa) === 'BORRADO' && l.etapa?.toUpperCase().includes('MASIV') && l.resultado === 'ÉXITO'
    const isSecundario = (l) =>
      ['SERV_ITEM', 'SERV_REQ'].includes(normalizeEtapa(l.etapa)) && l.etapa?.toUpperCase().includes('MASIV')

    const masivos    = exitosos.filter(isMasivoMain)
    const secundarios = exitosos.filter(isSecundario)
    const restantes  = exitosos.filter(l => !isMasivoMain(l) && !isSecundario(l))

    for (const base of masivos) {
      const baseId = base.log_id ?? `${base.serial_nbr}-${base.etapa}-${base.ejecutado_at}`
      if (consumed.has(baseId)) continue
      consumed.add(baseId)

      const tsBase = new Date(base.ejecutado_at).getTime()
      const batch  = [base]

      for (const cand of masivos) {
        const candId = cand.log_id ?? `${cand.serial_nbr}-${cand.etapa}-${cand.ejecutado_at}`
        if (consumed.has(candId)) continue
        if (cand.usuario !== base.usuario) continue
        const tsCand = new Date(cand.ejecutado_at).getTime()
        if (Math.abs(tsBase - tsCand) <= WINDOW_MS) {
          batch.push(cand)
          consumed.add(candId)
        }
      }

      result.push({
        log_id: `batch-${baseId}`,
        serial_nbr: null,
        usuario: base.usuario,
        etapa: base.etapa,
        resultado: 'ÉXITO',
        ejecutado_at: base.ejecutado_at,
        isBatch: true,
        batchCount: batch.length,
        batchItems: batch,
      })
    }

    // Agregar todos los no-masivos (individuales, SMW, etc.)
    return [...result, ...restantes]
      .sort((a, b) => new Date(b.ejecutado_at) - new Date(a.ejecutado_at))
  }, [exitosos])



  const handleExportExcel = () => {
    if (filtered.length === 0) return
    exportExcel({
      filename: `Historial_Limpiezas_${new Date().toISOString().slice(0, 10)}`,
      headers: [t('ID'), t('Serial'), t('Usuario'), t('Tipo'), t('Modalidad'), t('Etapa'), t('Resultado'), t('Fecha')],
      rows: filtered.map(l => [
        l.log_id, l.serial_nbr, l.usuario,
        normalizeEtapa(l.etapa)?.startsWith('SMW') ? 'SMW' : 'Equipo',
        getTipoOperacion(l.etapa) || '—',
        l.etapa, l.resultado,
        new Date(l.ejecutado_at).toLocaleString()
      ])
    })
  }



  return (
    <SubPage
      icon={<Sparkles size={18} />}
      badge={t('Administración')}
      title={t('Historial de Limpiezas')}
      description={t('Registro completo de todas las operaciones de limpieza ejecutadas en el sistema.')}
    >
      <div className="admin-container">

        {/* ── Estadísticas ── */}
        <div className="admin-stats-grid">
          <StatCard Icon={Database}     label={t('Total Registros')}     value={stats.total}          color="accent"  />
          <StatCard Icon={Monitor}      label={t('Seriales Únicos')}     value={stats.serialesUnicos} color="blue"    />
          <StatCard Icon={CheckCircle}  label={t('Éxitos')}              value={stats.exito}          color="emerald" />
          <StatCard Icon={Info}          label={t('Informativos')}         value={stats.info}           color="purple"  />
          <StatCard Icon={XCircle}      label={t('Errores')}             value={stats.error}          color="red"     />
          <StatCard Icon={User}         label={t('Técnicos Activos')}    value={usuarios.length}      color="green"   />
        </div>

        {/* ── Barra de herramientas ── */}
        <div className="admin-toolbar glass-card">
          <div className="toolbar-filters" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>

            {/* Búsqueda por serial */}
            <div className="filter-search" style={{ flex: '1 1 180px' }}>
              <Monitor size={16} />
              <input
                type="text"
                placeholder={t('Buscar serial...')}
                value={searchSerial}
                onChange={e => setSearchSerial(e.target.value)}
              />
            </div>

            {/* Filtro usuario */}
            <div className="filter-group">
              <User size={16} />
              <select className="premium-select" value={filterUsuario} onChange={e => setFilterUsuario(e.target.value)}>
                <option value="Todos">{t('Todos los técnicos')}</option>
                {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Filtro Tipo */}
            <div className="filter-group">
              <Database size={16} />
              <select className="premium-select" value={filterEtapa === 'SMW_LIMPIEZA' ? 'SMW' : filterEtapa === 'Todas' ? 'Todas' : 'Equipos'} onChange={e => {
                if (e.target.value === 'SMW') setFilterEtapa('SMW_LIMPIEZA')
                else if (e.target.value === 'Equipos') setFilterEtapa('BORRADO')
                else setFilterEtapa('Todas')
              }}>
                <option value="Todas">{t('Todos los tipos')}</option>
                <option value="Equipos">{t('Limpieza Equipos')}</option>
                <option value="SMW">{t('Limpieza SMW')}</option>
              </select>
            </div>

            {/* Filtro etapa */}
            <div className="filter-group">
              <Activity size={16} />
              <select className="premium-select" value={filterEtapa} onChange={e => setFilterEtapa(e.target.value)}>
                <option value="Todas">{t('Todas las etapas')}</option>
                {etapas.map(e => <option key={e} value={e}>{ETAPA_CONFIG[e]?.label || e}</option>)}
              </select>
            </div>

            {/* Filtro resultado */}
            <div className="filter-group">
              <Filter size={16} />
              <select className="premium-select" value={filterResult} onChange={e => setFilterResult(e.target.value)}>
                <option value="Todos">{t('Todos los resultados')}</option>
                <option value="ÉXITO">✅ Éxito</option>
                <option value="INFO">ℹ️ Informativo</option>
                <option value="ERROR">❌ Error</option>
              </select>
            </div>
          </div>

          <div className="toolbar-actions">
            <button
              className="btn-toolbar"
              onClick={() => cargarLogs(true)}
              title={t('Actualizar')}
              disabled={refreshing}
            >
              <RefreshCw size={16} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
              {t('Actualizar')}
            </button>
            <button className="btn-toolbar" onClick={handleExportExcel} title={t('Exportar Excel')}>
              <Database size={16} /> {t('Excel')}
            </button>
          </div>
        </div>

        {/* ── Contador ── */}
        <div className="admin-results-count">
          <Search size={16} />
          {t('Mostrando')} <strong>{agrupados.length}</strong> {t('filas (')} <strong>{exitosos.length}</strong> {t('exitosos de')} <strong>{filtered.length}</strong> {t('registros)')}
        </div>

        {/* ── Tabla de registros ── */}
        <div className="admin-table-wrap glass-card">
          {loading ? (
            <div className="admin-empty">
              <RefreshCw size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--clr-accent)' }} />
              <p style={{ marginTop: '1rem', color: 'var(--clr-muted)' }}>{t('Cargando historial...')}</p>
            </div>
          ) : error ? (
            <div className="admin-empty">
              <XCircle size={48} style={{ color: '#ef4444' }} />
              <h3 style={{ color: '#f87171', marginTop: '1rem' }}>{t('Error de conexión')}</h3>
              <p style={{ color: 'var(--clr-muted)', fontSize: '0.88rem' }}>{error}</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => cargarLogs()}>
                <RefreshCw size={15} /> {t('Reintentar')}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty">
              <Clock size={48} />
              <h3>{t('Sin registros')}</h3>
              <p>{t('No hay operaciones que coincidan con los filtros aplicados.')}</p>
            </div>
          ) : exitosos.length === 0 ? (
            <div className="admin-empty">
              <AlertTriangle size={48} />
              <h3>{t('Sin registros exitosos')}</h3>
              <p>{t('No hay operaciones exitosas en los filtros aplicados. Haz clic en una operación para ver más detalles.')}</p>
            </div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                    <tr>
                      <th>#</th>
                      <th><Monitor size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />{t('Serial / Dirección')}</th>
                      <th><User size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />{t('Técnico')}</th>
                      <th>{t('Tipo')}</th>
                      <th>{t('Modalidad')}</th>
                      <th>{t('Etapa')}</th>
                      <th>{t('Resultado')}</th>
                      <th><CalendarDays size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />{t('Fecha')}</th>
                      <th></th>
                    </tr>
                </thead>
                <tbody>
                   {agrupados.map(log => {
                    // ── FILA DE LOTE MASIVO ──
                    if (log.isBatch) {
                      const { date, time } = formatDate(log.ejecutado_at)
                      return (
                        <tr
                          key={log.log_id}
                          className="log-row"
                          onClick={() => setSelectedLog(log)}
                          style={{ cursor: 'pointer', background: 'rgba(168,85,247,0.04)', borderLeft: '3px solid rgba(168,85,247,0.4)' }}
                        >
                          <td style={{ color: 'var(--clr-muted)', fontSize: '0.75rem' }}>
                            <span style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid #a855f744', padding: '2px 6px', borderRadius: '6px', fontSize: '0.68rem' }}>
                              Lote
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                fontWeight: 700, color: '#a855f7', fontSize: '0.88rem'
                              }}>
                                ⚡ Limpieza Masiva
                              </span>
                              <span style={{
                                background: 'rgba(168,85,247,0.15)', color: '#a855f7',
                                border: '1px solid #a855f744', padding: '1px 8px',
                                borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700
                              }}>
                                {log.batchCount} equipo(s)
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="mini-avatar" style={{ width: '26px', height: '26px', fontSize: '0.72rem', flexShrink: 0 }}>
                                {log.usuario?.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: '0.85rem', color: 'var(--clr-text)' }}>{log.usuario}</span>
                            </div>
                          </td>
                          <td><span className="action-badge action-limpieza">Equipos</span></td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.18rem 0.6rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid #a855f744' }}>
                              ⚡ Masiva
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.18rem 0.55rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid #a855f744' }}>
                              Borrado
                            </span>
                          </td>
                          <td>
                            <span className="result-badge badge-success">
                              <CheckCircle size={12} /> ÉXITO
                            </span>
                          </td>
                          <td className="col-date">
                            <span className="date-main">{date}</span>
                            <span className="date-ago">{time}</span>
                          </td>
                          <td><ChevronRight size={14} style={{ color: '#a855f7' }} /></td>
                        </tr>
                      )
                    }

                    // ── FILA INDIVIDUAL (original) ──
                    const rc       = getResultCfg(log.resultado)
                    const etapaKey = normalizeEtapa(log.etapa)
                    const ec       = ETAPA_CONFIG[etapaKey]
                    const modalidad = getTipoOperacion(log.etapa)
                    const esSMW    = etapaKey.startsWith('SMW')
                    const { date, time } = formatDate(log.ejecutado_at)
                    return (
                      <tr
                        key={log.log_id}
                        className="log-row"
                        onClick={() => setSelectedLog(log)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ color: 'var(--clr-muted)', fontSize: '0.78rem' }}>{log.log_id}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>
                            {log.serial_nbr}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="mini-avatar" style={{ width: '26px', height: '26px', fontSize: '0.72rem', flexShrink: 0 }}>
                              {log.usuario?.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--clr-text)' }}>{log.usuario}</span>
                          </div>
                        </td>
                        <td><span className={`action-badge ${esSMW ? 'action-consulta' : 'action-limpieza'}`}>{esSMW ? 'SMW' : 'Equipos'}</span></td>
                        <td>
                          {modalidad ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.18rem 0.6rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: modalidad === 'Masiva' ? 'rgba(168,85,247,0.15)' : 'rgba(16,185,129,0.15)', color: modalidad === 'Masiva' ? '#a855f7' : '#10b981', border: `1px solid ${modalidad === 'Masiva' ? '#a855f744' : '#10b98144'}` }}>
                              {modalidad === 'Masiva' ? '⚡' : '👤'} {modalidad}
                            </span>
                          ) : <span style={{ color: 'var(--clr-muted)', fontSize: '0.75rem' }}>—</span>}
                        </td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '0.18rem 0.55rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 600, background: `${ec?.color || '#6366f1'}22`, color: ec?.color || '#6366f1', border: `1px solid ${ec?.color || '#6366f1'}44` }}>
                            {ec?.label || etapaKey}
                          </span>
                        </td>
                        <td><span className={`result-badge ${rc.className}`}><rc.Icon size={12} />{log.resultado}</span></td>
                        <td className="col-date">
                          <span className="date-main">{date}</span>
                          <span className="date-ago">{time}</span>
                        </td>
                        <td><ChevronRight size={14} style={{ color: 'var(--clr-muted)' }} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Modal de detalle ── */}
      {selectedLog && (
        <LogDetailModal log={selectedLog} allLogs={filtered} onClose={() => setSelectedLog(null)} />
      )}
    </SubPage>
  )
}

/* ── Tarjeta de estadística ── */
function StatCard({ Icon, label, value, color }) {
  return (
    <div className={`admin-stat-card glass-card stat-${color}`}>
      <div className="stat-icon-wrap"><Icon size={22} /></div>
      <div className="stat-info">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  )
}

/* ── Modal de detalle inline ── */
function LogDetailModal({ log, allLogs, onClose }) {
  const { t } = useTranslation()
  const [showHistorial, setShowHistorial] = useState(false)
  const [showBatchEquipos, setShowBatchEquipos] = useState(false)
  const [selectedHistorialLog, setSelectedHistorialLog] = useState(null)
  const rc = getResultCfg(log.resultado)
  const ec = ETAPA_CONFIG[normalizeEtapa(log.etapa)]
  const d  = new Date(log.ejecutado_at)

  // Obtener solo los registros del mismo serial y mismo usuario
  const relatedLogs = useMemo(() => {
    if (!allLogs || log.isBatch) return []
    return allLogs.filter(l => l.serial_nbr === log.serial_nbr && l.usuario === log.usuario).sort((a, b) =>
      new Date(b.ejecutado_at) - new Date(a.ejecutado_at)
    )
  }, [allLogs, log.serial_nbr, log.usuario, log.isBatch])

  // ── MODO LOTE MASIVO ────────────────────────────────────────────────────────
  if (log.isBatch && Array.isArray(log.batchItems)) {
    const exitosos = log.batchItems.filter(i => i.resultado === 'ÉXITO').length
    const errores  = log.batchItems.length - exitosos
    const pct      = log.batchItems.length > 0 ? Math.round((exitosos / log.batchItems.length) * 100) : 0
    const { date, time } = formatDate(log.ejecutado_at)

    return createPortal(
      <>
      <div className="confirm-overlay" onClick={onClose}>
        <div
          className="confirm-dialog premium-modal-card"
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '520px', width: '92%', padding: '0', borderRadius: '24px' }}
        >
          {/* ── Cabecera Aurora ── */}
          <div className="premium-header-aurora">
            {/* Moving dynamic aurora blobs */}
            <div className="aurora-blob blob-1" />
            <div className="aurora-blob blob-2" />
            <div className="aurora-blob blob-3" />

            {/* Header Content */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="premium-icon-badge">
                  <Sparkles size={24} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>⚡</span> Limpieza Masiva
                  </h3>
                  <p style={{ margin: '0.3rem 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {log.usuario}
                    <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'inline-block' }} />
                    {date}
                    <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'inline-block' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>{time}</span>
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="premium-close-btn">
                <X size={16} />
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', marginTop: '1.5rem', position: 'relative', zIndex: 3 }}>
              <div className="header-stat-box">
                <span className="stat-number" style={{ color: '#fff' }}>{log.batchCount}</span>
                <span className="stat-subtitle">{t('Total')}</span>
              </div>
              <div className="header-stat-box success">
                <span className="stat-number" style={{ color: '#10b981' }}>{exitosos}</span>
                <span className="stat-subtitle">{t('Exitosos')}</span>
              </div>
              <div className="header-stat-box error">
                <span className="stat-number" style={{ color: errores > 0 ? '#ef4444' : 'rgba(255,255,255,0.2)' }}>{errores}</span>
                <span className="stat-subtitle">{t('Errores')}</span>
              </div>
            </div>

            {/* Premium progress bar */}
            <div className="premium-progress-wrap">
              <div className="premium-progress-label">
                <span>Tasa de éxito</span>
                <span className="premium-progress-pct" style={{ color: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>{pct}%</span>
              </div>
              <div className="premium-progress-track">
                <div
                  className="premium-progress-fill"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 80
                      ? 'linear-gradient(90deg, #059669, #10b981, #34d399)'
                      : pct >= 50
                        ? 'linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)'
                        : 'linear-gradient(90deg, #dc2626, #ef4444, #f87171)',
                    boxShadow: pct >= 80
                      ? '0 0 16px rgba(16,185,129,0.45)'
                      : pct >= 50
                        ? '0 0 16px rgba(245,158,11,0.45)'
                        : '0 0 16px rgba(239,68,68,0.45)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Cuerpo ── */}
          <div className="premium-body">
            <button 
              className="premium-action-btn"
              onClick={() => setShowBatchEquipos(true)}
            >
              <div className="btn-icon-wrap">
                <Monitor size={18} color="#c4b5fd" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.94rem', color: '#fff' }}>{t('Ver Equipos')}</span>
                <span style={{ display: 'block', fontSize: '0.74rem', color: 'rgba(196,181,253,0.5)', marginTop: '0.05rem', fontWeight: 500 }}>
                  {log.batchItems.length} {t('dispositivos en total')}
                </span>
              </div>
              <ChevronRight size={16} className="btn-chevron" />
            </button>

            <button className="premium-btn-close-large" onClick={onClose}>
              {t('Cerrar')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Sub-modal de Equipos del Lote ── */}
      {showBatchEquipos && createPortal(
        <div className="confirm-overlay" onClick={() => setShowBatchEquipos(false)}>
          <div
            className="confirm-dialog premium-modal-card"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '92%', padding: '0', borderRadius: '24px' }}
          >
            {/* Cabecera sub-modal */}
            <div style={{ padding: '1.8rem 2rem', borderBottom: '1px solid rgba(168,85,247,0.1)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div className="premium-icon-badge" style={{ width: '44px', height: '44px', borderRadius: '12px', minWidth: '44px' }}>
                  <Monitor size={20} color="#fff" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>📦 {t('Equipos del lote')}</h3>
                  <p style={{ margin: '0.15rem 0 0', color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', fontWeight: 500 }}>
                    {log.usuario} · {log.batchCount} {t('dispositivos')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowBatchEquipos(false)} 
                className="premium-close-btn"
                style={{ flexShrink: 0, marginLeft: '1rem' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Listado de equipos */}
            <div style={{ padding: '1.25rem 1.8rem' }}>
              <div className="premium-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {log.batchItems.map((item, idx) => {
                  const irc = getResultCfg(item.resultado)
                  const ok  = item.resultado === 'ÉXITO'
                  return (
                    <div 
                       key={item.log_id || idx} 
                       className={`premium-eq-row ${ok ? 'ok' : 'err'}`}
                       style={{ animation: `fadeSlideUp 0.3s ease both`, animationDelay: `${idx * 25}ms` }}
                    >
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.22)', minWidth: '20px', textAlign: 'right', fontWeight: 700 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div style={{ 
                        width: '26px', height: '26px', borderRadius: '50%', 
                        background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <irc.Icon size={12} style={{ color: ok ? '#10b981' : '#ef4444' }} />
                      </div>
                      <code style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', flex: 1, letterSpacing: '0.3px' }}>
                        {item.serial_nbr || '—'}
                      </code>
                      <span className={`result-badge ${irc.className}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.55rem', borderRadius: '6px' }}>
                        {item.resultado}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '0 1.8rem 1.8rem' }}>
              <button
                className="premium-btn-close-large"
                onClick={() => setShowBatchEquipos(false)}
              >
                {t('Volver')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </>,
      document.body
    )
  }

  // ── MODO INDIVIDUAL ─────────────────────────────────────────────────────────
  return createPortal(
    <>
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-dialog glass-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '90%', padding: '2rem', borderRadius: '20px' }}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,194,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={22} color="var(--clr-accent)" />
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{t('Detalle de Limpieza')}</h3>
            <p style={{ margin: 0, color: 'var(--clr-muted)', fontSize: '0.78rem' }}>#{log.log_id}</p>
          </div>
        </div>

        {/* Datos */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          <DetailRow label={t('Serial')}    value={<code style={{ color: 'var(--clr-accent)', fontFamily: 'monospace', fontSize: '1rem' }}>{log.serial_nbr}</code>} />
          <DetailRow label={t('Técnico')}   value={log.usuario} />
          <DetailRow label={t('Modalidad')} value={(() => {
            const m = getTipoOperacion(log.etapa)
            if (!m) return <span style={{ color: 'var(--clr-muted)' }}>—</span>
            return (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.7rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700,
                background: m === 'Masiva' ? 'rgba(168,85,247,0.15)' : 'rgba(16,185,129,0.15)',
                color:      m === 'Masiva' ? '#a855f7' : '#10b981',
                border:     `1px solid ${m === 'Masiva' ? '#a855f744' : '#10b98144'}`,
              }}>
                {m === 'Masiva' ? '⚡ Masiva' : '👤 Individual'}
              </span>
            )
          })()} />
          <DetailRow label={t('Etapa')}     value={
            <span style={{ padding: '0.18rem 0.65rem', borderRadius: '99px', fontSize: '0.8rem', background: `${ec?.color || '#6366f1'}22`, color: ec?.color || '#6366f1', border: `1px solid ${ec?.color || '#6366f1'}44` }}>
              {ec?.label || normalizeEtapa(log.etapa)}
            </span>
          } />
          <DetailRow label={t('Resultado')} value={
            <span className={`result-badge ${rc.className}`}>
              <rc.Icon size={13} />{log.resultado}
            </span>
          } />
          <DetailRow label={t('Fecha')}     value={d.toLocaleString('es-CO')} />
        </div>

        {/* Botón historial */}
        {relatedLogs.length > 1 && (
          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={() => setShowHistorial(true)}
          >
            <Clock size={15} />
            {t('Ver historial del equipo')} ({relatedLogs.length})
            <ChevronRight size={14} />
          </button>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
          onClick={onClose}
        >
          {t('Cerrar')}
        </button>
      </div>
    </div>

    {/* ── Sub-modal historial ── */}
    {showHistorial && createPortal(
      <div className="confirm-overlay" onClick={() => setShowHistorial(false)}>
        <div
          className="confirm-dialog glass-card"
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '520px', width: '90%', padding: '2rem', borderRadius: '20px' }}
        >
          {/* Cabecera sub-modal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,194,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} color="var(--clr-accent)" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{t('Historial del equipo')}</h3>
                <p style={{ margin: '0.15rem 0 0', color: 'var(--clr-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{log.serial_nbr}</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistorial(false)}
              className="premium-close-btn"
              style={{ width: '32px', height: '32px', flexShrink: 0, marginLeft: '1rem' }}
            >
              <X size={16} />
            </button>
          </div>


          {/* Lista de registros */}
          <div style={{ display: 'grid', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
            {relatedLogs.map((relLog) => {
              const relRc = getResultCfg(relLog.resultado)
              const relEc = ETAPA_CONFIG[normalizeEtapa(relLog.etapa)]
              const relD  = new Date(relLog.ejecutado_at)
              const isCurrentLog = relLog.log_id === log.log_id
              return (
                <div
                  key={relLog.log_id}
                  onClick={() => setSelectedHistorialLog(relLog)}
                  style={{
                    padding: '0.65rem 0.9rem',
                    background: isCurrentLog ? 'rgba(0,194,255,0.08)' : 'rgba(255,255,255,0.04)',
                    border: isCurrentLog ? '1px solid rgba(0,194,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px', fontSize: '0.8rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => !isCurrentLog && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={(e) => !isCurrentLog && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <span style={{ color: relRc.color, display: 'flex', flexShrink: 0 }}>
                      <relRc.Icon size={13} />
                    </span>
                    <span style={{
                      padding: '0.12rem 0.5rem', borderRadius: '99px', fontSize: '0.74rem', fontWeight: 600,
                      background: `${relEc?.color || '#6366f1'}18`,
                      color: relEc?.color || '#6366f1',
                      border: `1px solid ${relEc?.color || '#6366f1'}33`
                    }}>
                      {relEc?.label || normalizeEtapa(relLog.etapa)}
                    </span>
                    {isCurrentLog && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--clr-accent)', fontWeight: 600 }}>{t('(actual)')}</span>
                    )}
                  </div>
                  <span style={{ color: 'var(--clr-muted)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                    {relD.toLocaleString('es-CO', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
            onClick={() => setShowHistorial(false)}
          >
            {t('Cerrar')}
          </button>
        </div>
      </div>,
      document.body
    )}

    {/* ── Sub-modal detalle de registro del historial ── */}
    {selectedHistorialLog && createPortal(
      <div className="confirm-overlay" onClick={() => setSelectedHistorialLog(null)}>
        <div
          className="confirm-dialog glass-card"
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '520px', width: '90%', padding: '2rem', borderRadius: '20px' }}
        >
          {/* Cabecera */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,194,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={22} color="var(--clr-accent)" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{t('Detalle de Limpieza')}</h3>
                <p style={{ margin: '0.15rem 0 0', color: 'var(--clr-muted)', fontSize: '0.8rem' }}>#{selectedHistorialLog.log_id}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedHistorialLog(null)}
              className="premium-close-btn"
              style={{ width: '32px', height: '32px', flexShrink: 0, marginLeft: '1rem' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Datos */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            <DetailRow label={t('Serial')}    value={<code style={{ color: 'var(--clr-accent)', fontFamily: 'monospace', fontSize: '1rem' }}>{selectedHistorialLog.serial_nbr}</code>} />
            <DetailRow label={t('Técnico')}   value={selectedHistorialLog.usuario} />
            <DetailRow label={t('Etapa')}     value={
              <span style={{ padding: '0.18rem 0.65rem', borderRadius: '99px', fontSize: '0.8rem', background: `${ETAPA_CONFIG[normalizeEtapa(selectedHistorialLog.etapa)]?.color || '#6366f1'}22`, color: ETAPA_CONFIG[normalizeEtapa(selectedHistorialLog.etapa)]?.color || '#6366f1', border: `1px solid ${ETAPA_CONFIG[normalizeEtapa(selectedHistorialLog.etapa)]?.color || '#6366f1'}44` }}>
                {ETAPA_CONFIG[normalizeEtapa(selectedHistorialLog.etapa)]?.label || normalizeEtapa(selectedHistorialLog.etapa)}
              </span>
            } />
            <DetailRow label={t('Resultado')} value={
              (() => {
                const historialRc = getResultCfg(selectedHistorialLog.resultado)
                return (
                  <span className={`result-badge ${historialRc.className}`}>
                    <historialRc.Icon size={13} />{selectedHistorialLog.resultado}
                  </span>
                )
              })()
            } />
            <div style={{ padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'var(--clr-muted)', fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>{t('Detalle')}</span>
              <div style={{
                padding: '0.8rem',
                background: selectedHistorialLog.resultado === 'ERROR' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                border: `1px solid ${selectedHistorialLog.resultado === 'ERROR' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                borderRadius: '8px',
                color: selectedHistorialLog.resultado === 'ERROR' ? '#f87171' : '#6ee7b7',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                wordWrap: 'break-word',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                maxWidth: '100%'
              }}>
                {selectedHistorialLog.detalle || '—'}
              </div>
            </div>
            <DetailRow label={t('Fecha')}     value={new Date(selectedHistorialLog.ejecutado_at).toLocaleString('es-CO')} />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
            onClick={() => setSelectedHistorialLog(null)}
          >
            {t('Cerrar')}
          </button>
        </div>
      </div>,
      document.body
    )}
    </>,
    document.body
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: 'var(--clr-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{label}</span>
      <span style={{ color: 'var(--clr-text)', fontSize: '0.9rem', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}
