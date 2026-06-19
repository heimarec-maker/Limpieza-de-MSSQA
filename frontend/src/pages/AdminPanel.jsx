import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ShieldCheck, Activity, Sparkles, PlusCircle,
  Search, AlertTriangle, CheckCircle, XCircle,
  Info, Trash2, Download, Filter, Users,
  Clock, TrendingUp, BarChart3, RefreshCw,
  ChevronRight, Database
} from 'lucide-react'
import { getActivityLogs, clearActivityLogs } from '../services/activityLog'
import { getDBActivityLogs } from '../services/limpiezaDbService'
import { exportActivityLogs } from '../services/exportService'
import SubPage from '../components/SubPage'
import LogDetailModal from '../components/LogDetailModal'
import './AdminPanel.css'

const RESULT_CONFIG = {
  'Éxito':       { Icon: CheckCircle,   className: 'badge-success' },
  'Error':       { Icon: XCircle,       className: 'badge-error' },
  'Advertencia': { Icon: AlertTriangle, className: 'badge-warning' },
  'Info':        { Icon: Info,          className: 'badge-info' },
}

const ACTION_CONFIG = {
  'Limpieza': { Icon: Sparkles,   className: 'action-limpieza' },
  'Creación': { Icon: PlusCircle, className: 'action-creacion' },
  'Consulta': { Icon: Search,     className: 'action-consulta' },
}

// ── Calcular estadísticas desde un array de logs ────────────────────────────
function calcStats(allLogs) {
  const usuarios = new Set(allLogs.map(l => l.usuario))
  return {
    total:        allLogs.length,
    limpiezas:    allLogs.filter(l => l.accion === 'Limpieza').length,
    creaciones:   allLogs.filter(l => l.accion === 'Creación').length,
    consultas:    allLogs.filter(l => l.accion === 'Consulta').length,
    errores:      allLogs.filter(l => l.resultado === 'Error').length,
    exitosos:     allLogs.filter(l => l.resultado === 'Éxito').length,
    usuarios:     usuarios.size,
    listaUsuarios: [...usuarios],
  }
}

export default function AdminPanel() {
  const { t, i18n } = useTranslation()
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({})
  const [filterAction, setFilterAction] = useState('Todas')
  const [filterResult, setFilterResult] = useState('Todos')
  const [filterUser, setFilterUser] = useState('Todos')
  const [searchText, setSearchText] = useState('')
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [selectedLog, setSelectedLog] = useState(null)
  const [loadingDB, setLoadingDB] = useState(false)

  // Cargar y fusionar logs de Oracle + localStorage
  const refreshData = useCallback(async () => {
    setLoadingDB(true)
    try {
      const [dbLogs, localLogs] = await Promise.all([
        getDBActivityLogs(),
        Promise.resolve(getActivityLogs()),
      ])
      // Fusionar: Oracle primero (más reciente), luego los locales
      const merged = [...dbLogs, ...localLogs]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      setLogs(merged)
      setStats(calcStats(merged))
    } catch {
      const local = getActivityLogs()
      setLogs(local)
      setStats(calcStats(local))
    } finally {
      setLoadingDB(false)
    }
  }, [])

  useEffect(() => {
    refreshData()

    // Refrescar cuando otro módulo registre actividad local
    window.addEventListener('activityLogUpdated', refreshData)
    const handleStorage = (e) => { if (e.key === 'etb_activity_log') refreshData() }
    window.addEventListener('storage', handleStorage)

    // Polling cada 15 s para capturar nuevas limpiezas en Oracle
    const interval = setInterval(refreshData, 15000)

    return () => {
      window.removeEventListener('activityLogUpdated', refreshData)
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [refreshData])

  useEffect(() => {
    const cd = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 10 : prev - 1))
    }, 1000)
    return () => clearInterval(cd)
  }, [])

  // Filtrado
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterAction !== 'Todas' && log.accion !== filterAction) return false
      if (filterResult !== 'Todos' && log.resultado !== filterResult) return false
      if (filterUser !== 'Todos' && log.usuario !== filterUser) return false
      if (searchText) {
        const q = searchText.toLowerCase()
        return (
          log.detalles?.toLowerCase().includes(q) ||
          log.usuario?.toLowerCase().includes(q) ||
          log.modulo?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [logs, filterAction, filterResult, filterUser, searchText])

  // Agrupar registros por fecha para el timeline
  const groupedLogs = useMemo(() => {
    const groups = {}
    filteredLogs.forEach(log => {
      const d = new Date(log.timestamp)
      const dateKey = d.toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(log)
    })
    return groups
  }, [filteredLogs])

  // Limpiar solo registros locales (los de Oracle persisten)
  const handleClear = () => {
    clearActivityLogs()
    refreshData()
    setShowConfirmClear(false)
  }

  // Exportar CSV
  const handleExport = () => {
    if (filteredLogs.length === 0) return
    exportActivityLogs(filteredLogs, t)
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString(i18n.language, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  return (
    <SubPage
      icon={<ShieldCheck size={18} />}
      badge={t('Administración')}
      title={t('Panel de Administrador')}
      description={t('Registro y seguimiento de todas las operaciones realizadas por los usuarios del sistema.')}
      action={
        loadingDB
          ? <span style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sincronizando BD...
            </span>
          : <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Database size={13} /> {logs.filter(l => l._source === 'oracle').length} operaciones desde Oracle
            </span>
      }
    >
      <div className="admin-container">

        {/* ── Tarjetas de estadísticas ── */}
        <div className="admin-stats-grid">
          <StatCard Icon={Activity} label={t('Total operaciones')} value={stats.total || 0} color="accent" />
          <StatCard Icon={Sparkles} label={t('Limpiezas')} value={stats.limpiezas || 0} color="blue" />
          <StatCard Icon={PlusCircle} label={t('Creaciones')} value={stats.creaciones || 0} color="green" />
          <StatCard Icon={Users} label={t('Usuarios activos')} value={stats.usuarios || 0} color="purple" />
          <StatCard Icon={CheckCircle} label={t('Exitosos')} value={stats.exitosos || 0} color="emerald" />
          <StatCard Icon={XCircle} label={t('Errores')} value={stats.errores || 0} color="red" />
        </div>

        {/* ── Gráfico de distribución de actividad ── */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={16} color="var(--clr-accent)" />
            {t('Distribución de Actividad')}
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: countdown <= 3 ? '#4ade80' : 'var(--clr-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <RefreshCw size={11} style={{ animation: countdown <= 3 ? 'spin 0.6s linear infinite' : 'none' }} />
              {t('Actualiza en')} {countdown}s
            </span>
          </h3>
          <div className="activity-chart">
            {[
              { label: t('Limpiezas'),  value: stats.limpiezas  || 0, color: 'var(--clr-accent)' },
              { label: t('Creaciones'), value: stats.creaciones || 0, color: '#10b981' },
              { label: t('Consultas'),  value: stats.consultas  || 0, color: '#a855f7' },
              { label: t('Exitosos'),   value: stats.exitosos   || 0, color: '#22c55e' },
              { label: t('Errores'),    value: stats.errores    || 0, color: '#ef4444' },
            ].map(item => {
              const pct = stats.total > 0 ? Math.min(100, Math.round((item.value / stats.total) * 100)) : 0
              return (
                <div key={item.label} className="chart-row">
                  <span className="chart-label">{item.label}</span>
                  <div className="chart-bar-bg">
                    <div className="chart-bar-fill" style={{ width: `${pct}%`, background: item.color }} />
                  </div>
                  <span className="chart-value">{item.value}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Filtros y acciones ── */}
        <div className="admin-toolbar glass-card">
          <div className="toolbar-filters">
            <div className="filter-group">
              <Filter size={16} />
              <select className="premium-select" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                <option value="Todas">{t('Todas las acciones')}</option>
                <option value="Limpieza">{t('Limpieza')}</option>
                <option value="Creación">{t('Creación')}</option>
                <option value="Consulta">{t('Consulta')}</option>
              </select>
            </div>

            <div className="filter-group">
              <TrendingUp size={16} />
              <select className="premium-select" value={filterResult} onChange={e => setFilterResult(e.target.value)}>
                <option value="Todos">{t('Todos los resultados')}</option>
                <option value="Éxito">{t('Éxito')}</option>
                <option value="Error">Error</option>
                <option value="Advertencia">{t('Advertencia')}</option>
                <option value="Info">Info</option>
              </select>
            </div>

            <div className="filter-group">
              <Users size={16} />
              <select className="premium-select" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                <option value="Todos">{t('Todos los usuarios')}</option>
                {(stats.listaUsuarios || []).map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="filter-search">
              <Search size={16} />
              <input
                type="text"
                placeholder={t('Buscar en detalles...')}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className="toolbar-actions">
            <button className="btn-toolbar" onClick={handleExport} title={t('Exportar PDF')}>
              <Download size={16} /> {t('Exportar PDF')}
            </button>
            <button
              className="btn-toolbar btn-toolbar-danger"
              onClick={() => setShowConfirmClear(true)}
              title={t('Limpiar')}
            >
              <Trash2 size={16} /> {t('Limpiar')}
            </button>
          </div>
        </div>

        {/* ── Confirmación de limpieza ── */}
        {showConfirmClear && (
          <div className="confirm-overlay" onClick={() => setShowConfirmClear(false)}>
            <div className="confirm-dialog glass-card" onClick={e => e.stopPropagation()}>
              <AlertTriangle size={40} className="confirm-icon" />
              <h3>{t('¿Estás seguro?')}</h3>
              <p>{t('Se eliminarán los registros locales de sesión. Las operaciones guardadas en la base de datos Oracle seguirán disponibles.')}</p>
              <div className="confirm-actions">
                <button className="btn btn-primary" style={{ background: '#ef4444' }} onClick={handleClear}>
                  {t('Sí, limpiar sesión')}
                </button>
                <button className="btn btn-accent" onClick={() => setShowConfirmClear(false)}>
                  {t('Cancelar')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Contador de resultados ── */}
        <div className="admin-results-count">
          <BarChart3 size={16} />
          {t('Mostrando')} <strong>{filteredLogs.length}</strong> {t('de')} <strong>{logs.length}</strong> {t('registros')}
        </div>

        {/* ── Timeline de registros ── */}
        <div className="admin-timeline-wrap glass-card">
          {filteredLogs.length === 0 ? (
            <div className="admin-empty">
              <Clock size={48} />
              <h3>{t('Sin registros')}</h3>
              <p>{t('Aún no hay operaciones registradas o no coinciden con los filtros aplicados.')}</p>
            </div>
          ) : (
            <div className="timeline-container">
              {Object.entries(groupedLogs).map(([dateLabel, dayLogs]) => (
                <div key={dateLabel} className="timeline-day-group">
                  <div className="timeline-date-header">
                    <span className="timeline-date-badge">{dateLabel}</span>
                  </div>
                  <div className="timeline-items">
                    {dayLogs.map((log, index) => {
                      const actionCfg = ACTION_CONFIG[log.accion] || { Icon: Activity, className: '' }
                      const resultCfg = RESULT_CONFIG[log.resultado] || { Icon: Info, className: 'badge-info' }
                      const isLast = index === dayLogs.length - 1

                      return (
                        <div key={log.id} className="timeline-item">
                          <div className="timeline-connector">
                            <div className={`timeline-icon-wrap ${resultCfg.className}`}>
                              <actionCfg.Icon size={16} />
                            </div>
                            {!isLast && <div className="timeline-line"></div>}
                          </div>
                          
                          <div
                            className="timeline-content glass-card timeline-content-clickable"
                            onClick={() => setSelectedLog(log)}
                            title={t('Ver detalle')}
                          >
                            <div className="timeline-header">
                              <div className="timeline-user">
                                <div className="mini-avatar">
                                  {log.usuario?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="user-name">
                                    {log.usuario}
                                    {log._source === 'oracle' && (
                                      <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '1px 6px', borderRadius: '999px', fontWeight: 600 }}>Oracle</span>
                                    )}
                                  </span>
                                  <span className="action-text">
                                    {' '}{t('realizó una')} <strong>{log.accion.toLowerCase()}</strong> {t('en')} <strong>{log.modulo}</strong>
                                  </span>
                                </div>
                              </div>
                              <div className="timeline-meta">
                                <span className={`result-badge ${resultCfg.className}`}>
                                  <resultCfg.Icon size={14} />
                                  {log.resultado}
                                </span>
                                <span className="timeline-time">
                                  {new Date(log.timestamp).toLocaleTimeString(i18n.language, {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <ChevronRight size={14} style={{ color: 'var(--clr-muted)', flexShrink: 0 }} />
                              </div>
                            </div>
                            <div className="timeline-body">
                              <p className="timeline-details">{log.detalles}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Modal de Detalle ── */}
      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </SubPage>
  )
}

/* ── Sub-componente: Tarjeta de estadística ── */
function StatCard({ Icon, label, value, color }) {
  return (
    <div className={`admin-stat-card glass-card stat-${color}`}>
      <div className="stat-icon-wrap">
        <Icon size={22} />
      </div>
      <div className="stat-info">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  )
}

