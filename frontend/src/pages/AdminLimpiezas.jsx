import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles, Search, Filter, Download, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Info,
  User, Clock, Monitor, ChevronRight, Database,
  CalendarDays, Activity
} from 'lucide-react'
import SubPage from '../components/SubPage'
import { getLogs } from '../services/limpiezaDbService'
import { exportExcel } from '../services/exportService'
import './AdminPanel.css'

const ETAPA_CONFIG = {
  'BORRADO':     { label: 'Borrado',    color: '#a855f7' },
  'SERV_ITEM':   { label: 'Serv. Item', color: '#3b82f6' },
  'SERV_REQ':    { label: 'Serv. Req',  color: '#f59e0b' },
  'VALIDACION':  { label: 'Validación', color: '#6366f1' },
  'SMW_LIMPIEZA':{ label: 'Liberación SMW', color: '#10b981' },
  'SMW_CONSULTA':{ label: 'Consulta SMW', color: '#6366f1' },
}

const RESULT_CONFIG = {
  'ÉXITO':        { Icon: CheckCircle,   className: 'badge-success', color: '#10b981' },
  'INFO':          { Icon: Info,          className: 'badge-info',    color: '#6366f1' },
  'ERROR':        { Icon: XCircle,       className: 'badge-error',   color: '#ef4444' },
}

function getResultCfg(r) {
  return RESULT_CONFIG[r] || { Icon: Info, className: 'badge-info', color: 'var(--clr-accent)' }
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

  useEffect(() => {
    cargarLogs()
    const interval = setInterval(() => cargarLogs(true), 30000)
    return () => clearInterval(interval)
  }, [])

  // Listas únicas para filtros
  const usuarios = useMemo(() => [...new Set(logs.map(l => l.usuario))].sort(), [logs])
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
      if (filterUsuario !== 'Todos'  && l.usuario  !== filterUsuario)  return false
      if (filterEtapa   !== 'Todas'  && l.etapa    !== filterEtapa)    return false
      if (filterResult  !== 'Todos'  && l.resultado !== filterResult)  return false
      if (searchSerial) {
        const q = searchSerial.toUpperCase()
        return l.serial_nbr?.toUpperCase().includes(q) || l.detalle?.toLowerCase().includes(q.toLowerCase())
      }
      return true
    })
  }, [logs, filterUsuario, filterEtapa, filterResult, searchSerial])



  const handleExportExcel = () => {
    if (filtered.length === 0) return
    exportExcel({
      filename: `Historial_Limpiezas_${new Date().toISOString().slice(0, 10)}`,
      headers: [t('ID'), t('Serial'), t('Usuario'), t('Tipo'), t('Etapa'), t('Resultado'), t('Fecha')],
      rows: filtered.map(l => [
        l.log_id, l.serial_nbr, l.usuario,
        l.etapa?.startsWith('SMW') ? 'SMW' : 'Equipo',
        l.etapa, l.resultado,
        new Date(l.ejecutado_at).toLocaleString()
      ])
    })
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return {
      date: d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
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
          {t('Mostrando')} <strong>{filtered.length}</strong> {t('de')} <strong>{logs.length}</strong> {t('registros')}
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
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                    <tr>
                      <th>#</th>
                      <th><Monitor size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />{t('Serial / Dirección')}</th>
                      <th><User size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />{t('Técnico')}</th>
                      <th>{t('Tipo')}</th>
                      <th>{t('Etapa')}</th>
                      <th>{t('Resultado')}</th>
                      <th><CalendarDays size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />{t('Fecha')}</th>
                      <th></th>
                    </tr>
                </thead>
                <tbody>
                  {filtered.map(log => {
                    const rc   = getResultCfg(log.resultado)
                    const ec   = ETAPA_CONFIG[log.etapa]
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
                        <td>
                          <span className={`action-badge ${log.etapa?.startsWith('SMW') ? 'action-consulta' : 'action-limpieza'}`}>
                            {log.etapa?.startsWith('SMW') ? 'SMW' : 'Equipos'}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.18rem 0.55rem',
                            borderRadius: '99px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: `${ec?.color || '#6366f1'}22`,
                            color: ec?.color || '#6366f1',
                            border: `1px solid ${ec?.color || '#6366f1'}44`,
                          }}>
                            {ec?.label || log.etapa}
                          </span>
                        </td>
                        <td>
                          <span className={`result-badge ${rc.className}`}>
                            <rc.Icon size={12} />
                            {log.resultado}
                          </span>
                        </td>
                        <td className="col-date">
                          <span className="date-main">{date}</span>
                          <span className="date-ago">{time}</span>
                        </td>
                        <td>
                          <ChevronRight size={14} style={{ color: 'var(--clr-muted)' }} />
                        </td>
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
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
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
function LogDetailModal({ log, onClose }) {
  const { t } = useTranslation()
  const rc = getResultCfg(log.resultado)
  const ec = ETAPA_CONFIG[log.etapa]
  const d  = new Date(log.ejecutado_at)

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-dialog glass-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '90%', padding: '2rem', borderRadius: '20px' }}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,194,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={22} color="var(--clr-accent)" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{t('Detalle de Limpieza')}</h3>
              <p style={{ margin: 0, color: 'var(--clr-muted)', fontSize: '0.78rem' }}>#{log.log_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--clr-muted)', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}
          >×</button>
        </div>

        {/* Datos */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          <DetailRow label={t('Serial')}    value={<code style={{ color: 'var(--clr-accent)', fontFamily: 'monospace', fontSize: '1rem' }}>{log.serial_nbr}</code>} />
          <DetailRow label={t('Técnico')}   value={log.usuario} />
          <DetailRow label={t('Etapa')}     value={
            <span style={{ padding: '0.18rem 0.65rem', borderRadius: '99px', fontSize: '0.8rem', background: `${ec?.color || '#6366f1'}22`, color: ec?.color || '#6366f1', border: `1px solid ${ec?.color || '#6366f1'}44` }}>
              {ec?.label || log.etapa}
            </span>
          } />
          <DetailRow label={t('Resultado')} value={
            <span className={`result-badge ${rc.className}`}>
              <rc.Icon size={13} />{log.resultado}
            </span>
          } />
          <DetailRow label={t('Detalle')}   value={log.detalle || '—'} />
          <DetailRow label={t('Fecha')}     value={d.toLocaleString('es-CO')} />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
          onClick={onClose}
        >
          {t('Cerrar')}
        </button>
      </div>
    </div>
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
