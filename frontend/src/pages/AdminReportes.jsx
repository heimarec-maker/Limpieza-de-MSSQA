import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SubPage from '../components/SubPage';
import {
  FileBarChart, BarChart2, Download, Filter,
  Calendar, FileText, PieChart, Activity,
  Users, CheckCircle, Clock, RefreshCw,
  Sparkles, Bell, ToggleLeft, ToggleRight, X
} from 'lucide-react';
import './AdminPanel.css';
import { exportCSV } from '../services/exportService';
import { getActivityLogs } from '../services/activityLog';

const REPORT_TYPES = [
  { id: 1, title: 'Reporte de Accesos',    desc: 'Historial detallado de inicios de sesión y actividad de usuarios.',     icon: Users,     color: 'var(--clr-accent)', category: 'Seguridad' },
  { id: 2, title: 'Auditoría del Sistema', desc: 'Registro completo de modificaciones críticas en la base de datos.',    icon: Activity,  color: '#ef4444',           category: 'Seguridad' },
  { id: 3, title: 'Resumen de Inventario', desc: 'Estado actual de todos los equipos y cambios recientes.',               icon: PieChart,  color: '#10b981',           category: 'Operación' },
  { id: 4, title: 'Estadísticas de Uso',   desc: 'Métricas de rendimiento y uso de módulos del sistema.',                 icon: BarChart2, color: '#a855f7',           category: 'Rendimiento' },
];

const RECENT_REPORTS = [
  { id: 101, name: 'Reporte_Accesos_Abril.pdf',  date: '2026-04-30 18:00', size: '2.4 MB' },
  { id: 102, name: 'Inventario_Q1_2026.xlsx',    date: '2026-04-15 09:30', size: '5.1 MB' },
  { id: 103, name: 'Auditoria_Semanal.csv',      date: '2026-05-02 10:15', size: '1.2 MB' },
];

const SCHEDULED = [
  { id: 1, name: 'Reporte de Accesos',    freq: 'Mensual',  nextRun: '2026-05-31', active: true  },
  { id: 2, name: 'Auditoría del Sistema', freq: 'Semanal',  nextRun: '2026-05-12', active: true  },
  { id: 3, name: 'Estadísticas de Uso',   freq: 'Trimestral', nextRun: '2026-06-30', active: false },
];

export default function AdminReportes() {
  const { t } = useTranslation();
  const [filterPeriod,    setFilterPeriod]    = useState('Mes actual');
  const [filterCategory,  setFilterCategory]  = useState('Todos');
  const [generatingId,    setGeneratingId]    = useState(null);
  const [scheduled,       setScheduled]       = useState(SCHEDULED);

  const handleDownloadCSV = (reportTitle) => {
    const logs = getActivityLogs();
    const dateStamp = new Date().toISOString().slice(0, 10);
    const safeName  = reportTitle.replace(/\s+/g, '_');

    const baseRows = logs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.usuario, l.accion, l.modulo, l.detalles || '', l.resultado,
    ]);

    if (reportTitle === 'Reporte de Accesos') {
      exportCSV({ filename: `accesos_${dateStamp}`,
        headers: [t('Fecha'), t('Usuario'), t('Acción'), t('Módulo'), t('Resultado')],
        rows: logs.map(l => [new Date(l.timestamp).toLocaleString(), l.usuario, l.accion, l.modulo, l.resultado]) });
    } else if (reportTitle === 'Auditoría del Sistema') {
      exportCSV({ filename: `auditoria_${dateStamp}`,
        headers: [t('Fecha'), t('Usuario'), t('Acción'), t('Módulo'), t('Detalles'), t('Resultado')],
        rows: baseRows });
    } else if (reportTitle === 'Resumen de Inventario') {
      const creaciones = logs.filter(l => l.accion === 'Creación');
      exportCSV({ filename: `inventario_${dateStamp}`,
        headers: [t('Fecha'), t('Usuario'), t('Detalles'), t('Resultado')],
        rows: creaciones.map(l => [new Date(l.timestamp).toLocaleString(), l.usuario, l.detalles || '', l.resultado]) });
    } else if (reportTitle === 'Estadísticas de Uso') {
      const limpiezas  = logs.filter(l => l.accion === 'Limpieza').length;
      const creaciones = logs.filter(l => l.accion === 'Creación').length;
      const consultas  = logs.filter(l => l.accion === 'Consulta').length;
      const exitosos   = logs.filter(l => l.resultado === 'Éxito').length;
      const errores    = logs.filter(l => l.resultado === 'Error').length;
      exportCSV({ filename: `estadisticas_${dateStamp}`,
        headers: [t('Módulo'), t('Total operaciones'), t('Exitosos'), t('Errores')],
        rows: [
          [t('Limpieza'),  String(limpiezas),  String(Math.round(limpiezas  * 0.8)), String(Math.round(limpiezas  * 0.2))],
          [t('Creación'),  String(creaciones), String(Math.round(creaciones * 0.9)), String(Math.round(creaciones * 0.1))],
          [t('Consulta'),  String(consultas),  String(consultas), '0'],
          ['Total', String(logs.length), String(exitosos), String(errores)],
        ]});
    } else {
      exportCSV({ filename: `${safeName}_${dateStamp}`,
        headers: [t('Fecha'), t('Usuario'), t('Acción'), t('Módulo'), t('Detalles'), t('Resultado')],
        rows: baseRows });
    }
  };

  const handleGenerate = (report) => {
    setGeneratingId(report.id);
    setTimeout(() => {
      handleDownloadCSV(report.title);
      setGeneratingId(null);
    }, 1200);
  };

  const toggleScheduled = (id) => {
    setScheduled(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  // Mini chart data derived from logs
  const logs = getActivityLogs();
  const chartData = [
    { label: t('Accesos'),   value: logs.filter(l => l.accion === 'Consulta').length,  color: 'var(--clr-accent)' },
    { label: t('Limpiezas'), value: logs.filter(l => l.accion === 'Limpieza').length,  color: '#10b981' },
    { label: t('Creaciones'),value: logs.filter(l => l.accion === 'Creación').length,  color: '#a855f7' },
    { label: t('Errores'),   value: logs.filter(l => l.resultado === 'Error').length,  color: '#ef4444' },
  ];
  const chartMax = Math.max(...chartData.map(d => d.value), 1);

  const filteredReports = REPORT_TYPES.filter(r => filterCategory === 'Todos' || r.category === filterCategory);

  return (
    <SubPage icon={<FileBarChart size={18} />} badge={t('Administración')}
      title={t('Reportes y Estadísticas')}
      description={t('Visualiza y descarga reportes detallados sobre el desempeño del sistema.')}>

      <div className="admin-container">

        {/* ── Estadísticas ── */}
        <div className="admin-stats-grid">
          <StatCard Icon={FileText}  label={t('Reportes Generados')}    value="142"      color="accent"  />
          <StatCard Icon={Download}  label={t('Descargas (Mes)')}       value="86"       color="blue"    />
          <StatCard Icon={Clock}     label={t('Reportes Programados')}  value={scheduled.filter(s=>s.active).length} color="purple" />
          <StatCard Icon={CheckCircle} label={t('Tasa de Éxito')}       value="98%"      color="emerald" />
        </div>

        {/* ── Mini gráfico de actividad ── */}
        <div className="glass-card" style={{ padding:'1.5rem' }}>
          <h3 style={{ color:'#fff', margin:'0 0 1.25rem 0', fontSize:'0.95rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Sparkles size={16} color="var(--clr-accent)" /> {t('Actividad del Sistema — Resumen')}
          </h3>
          <div style={{ display:'flex', alignItems:'flex-end', gap:'1.5rem', height:'80px' }}>
            {chartData.map(item => {
              const heightPct = chartMax > 0 ? Math.max(8, Math.round((item.value / chartMax) * 100)) : 8;
              return (
                <div key={item.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem', flex:1 }}>
                  <span style={{ color:'#fff', fontWeight:700, fontSize:'0.9rem' }}>{item.value}</span>
                  <div style={{ width:'100%', height:`${heightPct}%`, minHeight:'8px', maxHeight:'56px', borderRadius:'6px 6px 0 0', background:item.color, opacity:0.85, transition:'height 0.5s ease' }} />
                  <span style={{ color:'var(--clr-muted)', fontSize:'0.72rem', textAlign:'center', whiteSpace:'nowrap' }}>{item.label}</span>
                </div>
              );
            })}
          </div>
          {logs.length === 0 && (
            <p style={{ color:'var(--clr-muted)', fontSize:'0.82rem', marginTop:'0.5rem', textAlign:'center' }}>
              {t('Sin datos de actividad aún. Interactúa con el sistema para generar registros.')}
            </p>
          )}
        </div>

        {/* ── Filtros ── */}
        <div className="admin-toolbar glass-card">
          <div className="toolbar-filters">
            <div className="filter-group">
              <Calendar size={16} />
              <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
                <option value="Hoy">{t('Hoy')}</option>
                <option value="Esta semana">{t('Esta semana')}</option>
                <option value="Mes actual">{t('Mes actual')}</option>
                <option value="Último trimestre">{t('Último trimestre')}</option>
                <option value="Año actual">{t('Año actual')}</option>
              </select>
            </div>
            <div className="filter-group">
              <Filter size={16} />
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="Todos">{t('Todas las categorías')}</option>
                <option value="Seguridad">{t('Seguridad')}</option>
                <option value="Operación">{t('Operación')}</option>
                <option value="Rendimiento">{t('Rendimiento')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Tarjetas de reportes ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'1.25rem' }}>
          {filteredReports.map(report => {
            const isGenerating = generatingId === report.id;
            return (
              <div key={report.id} className="glass-card"
                style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem', cursor:'pointer', transition:'transform 0.2s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseOut={e  => e.currentTarget.style.transform = 'none'}>
                <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                  <div style={{ width:'48px', height:'48px', borderRadius:'12px', background:'rgba(255,255,255,0.05)', color:report.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <report.icon size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin:'0 0 0.25rem 0', fontSize:'1rem', color:'#fff' }}>{t(report.title)}</h4>
                    <span style={{ fontSize:'0.72rem', color:'var(--clr-muted)', background:'rgba(255,255,255,0.08)', padding:'0.15rem 0.5rem', borderRadius:'4px' }}>
                      {t(report.category)}
                    </span>
                  </div>
                </div>
                <p style={{ color:'var(--clr-muted)', fontSize:'0.88rem', lineHeight:1.5, margin:0, flex:1 }}>{t(report.desc)}</p>
                <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}
                  onClick={() => handleGenerate(report)} disabled={isGenerating}>
                  {isGenerating
                    ? <><RefreshCw size={15} className="spin" /> {t('Generando...')}</>
                    : <><Download size={15} /> {t('Generar y Descargar')}</>}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Reportes programados ── */}
        <div className="glass-card" style={{ padding:'1.5rem' }}>
          <h3 style={{ color:'#fff', margin:'0 0 1rem 0', fontSize:'1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Bell size={16} color="var(--clr-accent)" /> {t('Reportes Programados')}
          </h3>
          <div>
            {scheduled.map(s => (
              <div key={s.id} className="scheduled-row">
                <div>
                  <span style={{ color:'#fff', fontWeight:500, fontSize:'0.9rem' }}>{t(s.name)}</span>
                  <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.25rem' }}>
                    <span style={{ fontSize:'0.75rem', color:'var(--clr-muted)', background:'rgba(255,255,255,0.06)', padding:'0.15rem 0.5rem', borderRadius:'4px' }}>{t(s.freq)}</span>
                    <span style={{ fontSize:'0.75rem', color:'var(--clr-muted)' }}>→ {s.nextRun}</span>
                  </div>
                </div>
                <button className="btn-toolbar" style={{ padding:'0.35rem 0.75rem', color: s.active ? '#4ade80' : 'var(--clr-muted)' }}
                  onClick={() => toggleScheduled(s.id)} title={s.active ? t('Desactivar') : t('Activar')}>
                  {s.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  <span style={{ fontSize:'0.8rem' }}>{s.active ? t('Activo') : t('Pausado')}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Descargas recientes ── */}
        <h3 style={{ margin:'0', color:'#fff', fontSize:'1.1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <Clock size={18} color="var(--clr-accent)" /> {t('Descargas Recientes')}
        </h3>
        <div className="admin-table-wrap glass-card">
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr>
                <th>{t('Nombre del Archivo')}</th><th>{t('Fecha')}</th><th>{t('Tamaño')}</th><th>{t('Estado')}</th><th>{t('Acción')}</th>
              </tr></thead>
              <tbody>
                {RECENT_REPORTS.map(r => (
                  <tr key={r.id} className="log-row">
                    <td style={{ color:'#fff', fontWeight:500 }}>
                      <FileText size={13} style={{ marginRight:'0.5rem', color:'var(--clr-muted)', verticalAlign:'middle' }} />{r.name}
                    </td>
                    <td className="col-date">
                      <span className="date-main">{r.date.split(' ')[0]}</span>
                      <span className="date-ago">{r.date.split(' ')[1]}</span>
                    </td>
                    <td><span style={{ color:'var(--clr-muted)', fontSize:'0.85rem' }}>{r.size}</span></td>
                    <td><span className="result-badge badge-success"><CheckCircle size={12} /> {t('Completado')}</span></td>
                    <td>
                      <button className="btn-toolbar" style={{ padding:'0.4rem 0.8rem' }}
                        onClick={() => handleDownloadCSV(r.name.replace(/_/g,' ').replace(/\.(pdf|xlsx|csv)$/,''))}>
                        <Download size={14} /> {t('Descargar')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SubPage>
  );
}

function StatCard({ Icon, label, value, color }) {
  return (
    <div className={`admin-stat-card glass-card stat-${color}`}>
      <div className="stat-icon-wrap"><Icon size={22} /></div>
      <div className="stat-info">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}
