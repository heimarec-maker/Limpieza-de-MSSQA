import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import SubPage from '../components/SubPage';
import {
  Database, UploadCloud, Download, CheckCircle,
  Clock, Save, RefreshCw, AlertTriangle, X,
  Calendar, Settings, HardDrive, Trash2, Shield
} from 'lucide-react';
import './AdminPanel.css';

const INITIAL_BACKUPS = [
  { id: 1, name: 'etb_backup_20260504_2300.sql.gz', date: '2026-05-04 23:00', size: '142 MB', bytes: 142, status: 'Completado', type: 'Automático' },
  { id: 2, name: 'etb_backup_20260503_2300.sql.gz', date: '2026-05-03 23:00', size: '140 MB', bytes: 140, status: 'Completado', type: 'Automático' },
  { id: 3, name: 'etb_backup_manual_v1.sql.gz',     date: '2026-05-02 15:30', size: '138 MB', bytes: 138, status: 'Completado', type: 'Manual' },
  { id: 4, name: 'etb_backup_20260502_2300.sql.gz', date: '2026-05-02 23:00', size: '138 MB', bytes: 138, status: 'Fallido',    type: 'Automático' },
];

const TOTAL_STORAGE = 500; // MB

export default function AdminRespaldo() {
  const { t } = useTranslation();
  const [backups,        setBackups]        = useState(INITIAL_BACKUPS);
  const [isBackingUp,    setIsBackingUp]    = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [restoreTarget,  setRestoreTarget]  = useState(null);
  const [schedule,       setSchedule]       = useState({ freq: 'Diario', hour: '23:00', retention: '7' });
  const [showSchedule,   setShowSchedule]   = useState(false);
  const progressRef = useRef(null);

  const usedBytes  = backups.filter(b => b.status === 'Completado').reduce((a, b) => a + b.bytes, 0);
  const usedPct    = Math.min(100, Math.round((usedBytes / TOTAL_STORAGE) * 100));

  const handleBackup = () => {
    setIsBackingUp(true);
    setProgress(0);
    let pct = 0;
    progressRef.current = setInterval(() => {
      pct += Math.random() * 12 + 4;
      if (pct >= 100) {
        pct = 100;
        clearInterval(progressRef.current);
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
        const newBackup = {
          id: Date.now(),
          name: `etb_backup_${stamp}.sql.gz`,
          date: `${now.toISOString().slice(0,10)} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
          size: '143 MB', bytes: 143,
          status: 'Completado', type: 'Manual',
        };
        setBackups(prev => [newBackup, ...prev]);
        setTimeout(() => { setIsBackingUp(false); setProgress(0); }, 500);
      }
      setProgress(Math.min(100, pct));
    }, 200);
  };

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  const handleDelete = (id) => setBackups(prev => prev.filter(b => b.id !== id));

  const completedCount = backups.filter(b => b.status === 'Completado').length;
  const lastBackup = backups.find(b => b.status === 'Completado');

  return (
    <SubPage icon={<Database size={18} />} badge={t('Administración')}
      title={t('Respaldo de Datos')}
      description={t('Gestiona las copias de seguridad de la base de datos del sistema.')}>

      <div className="admin-container">

        {/* ── Estadísticas ── */}
        <div className="admin-stats-grid">
          <StatCard Icon={Save}       label={t('Último Respaldo')}    value={lastBackup ? lastBackup.date.split(' ')[0] : '—'} color="emerald" />
          <StatCard Icon={HardDrive}  label={t('Espacio Usado')}      value={`${usedBytes} MB`}    color="blue"   />
          <StatCard Icon={UploadCloud} label={t('Respaldos Totales')} value={completedCount}        color="purple" />
          <StatCard Icon={Shield}      label={t('Retención')}         value={`${schedule.retention} días`} color="accent" />
        </div>

        {/* ── Uso de almacenamiento ── */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
            <span style={{ color:'#fff', fontWeight:600, fontSize:'0.95rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <HardDrive size={16} color="var(--clr-accent)" /> {t('Uso de Almacenamiento')}
            </span>
            <span style={{ color:'var(--clr-muted)', fontSize:'0.82rem' }}>{usedBytes} MB / {TOTAL_STORAGE} MB</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width:`${usedPct}%`, background: usedPct > 80 ? '#ef4444' : usedPct > 60 ? '#f59e0b' : 'linear-gradient(90deg,var(--clr-primary),var(--clr-accent))' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.4rem' }}>
            <span style={{ color:'var(--clr-muted)', fontSize:'0.75rem' }}>{usedPct}% {t('utilizado')}</span>
            <span style={{ color:'var(--clr-muted)', fontSize:'0.75rem' }}>{TOTAL_STORAGE - usedBytes} MB {t('disponible')}</span>
          </div>
        </div>

        {/* ── Crear respaldo manual ── */}
        <div className="glass-card" style={{ padding:'2rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1.5rem' }}>
            <div>
              <h3 style={{ color:'#fff', margin:'0 0 0.4rem 0', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <Database size={20} color="var(--clr-accent)" /> {t('Crear Respaldo Manual')}
              </h3>
              <p style={{ color:'var(--clr-muted)', margin:0, fontSize:'0.9rem' }}>
                {t('Genera una copia de seguridad instantánea de todos los registros.')}
              </p>
            </div>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button className="btn-toolbar" onClick={() => setShowSchedule(s => !s)}>
                <Settings size={16} /> {t('Programar')}
              </button>
              <button className="btn btn-primary" style={{ padding:'0.8rem 1.5rem', minWidth:'200px', justifyContent:'center' }}
                onClick={handleBackup} disabled={isBackingUp}>
                {isBackingUp
                  ? <><RefreshCw size={18} className="spin" /> {t('Generando...')} {Math.round(progress)}%</>
                  : <><UploadCloud size={18} /> {t('Iniciar Respaldo Ahora')}</>}
              </button>
            </div>
          </div>

          {/* ── Barra de progreso ── */}
          {isBackingUp && (
            <div style={{ marginTop:'1.25rem' }}>
              <div className="progress-bar-bg" style={{ height:'16px', borderRadius:'8px' }}>
                <div className="progress-bar-fill" style={{ width:`${progress}%`, height:'16px', borderRadius:'8px' }} />
              </div>
              <p style={{ color:'var(--clr-muted)', fontSize:'0.8rem', margin:'0.4rem 0 0', textAlign:'center' }}>
                {t('Procesando... por favor no cierre esta ventana.')}
              </p>
            </div>
          )}

          {/* ── Panel de programación ── */}
          {showSchedule && (
            <div style={{ marginTop:'1.5rem', paddingTop:'1.5rem', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ color:'#fff', margin:'0 0 1rem 0', fontSize:'0.95rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <Calendar size={16} color="var(--clr-accent)" /> {t('Configuración de Respaldo Automático')}
              </h4>
              <div className="form-grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))' }}>
                <div className="form-group">
                  <label className="form-label">{t('Frecuencia')}</label>
                  <select className="form-select" value={schedule.freq}
                    onChange={e => setSchedule(p => ({ ...p, freq: e.target.value }))}>
                    <option value="Cada hora">{t('Cada hora')}</option>
                    <option value="Diario">{t('Diario')}</option>
                    <option value="Semanal">{t('Semanal')}</option>
                    <option value="Mensual">{t('Mensual')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Hora de ejecución')}</label>
                  <input className="form-input" type="time" value={schedule.hour}
                    onChange={e => setSchedule(p => ({ ...p, hour: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Retención (días)')}</label>
                  <select className="form-select" value={schedule.retention}
                    onChange={e => setSchedule(p => ({ ...p, retention: e.target.value }))}>
                    <option value="7">7 {t('días')}</option>
                    <option value="14">14 {t('días')}</option>
                    <option value="30">30 {t('días')}</option>
                    <option value="90">90 {t('días')}</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop:'1rem', display:'flex', justifyContent:'flex-end' }}>
                <button className="btn btn-primary" style={{ padding:'0.6rem 1.2rem' }}
                  onClick={() => setShowSchedule(false)}>
                  <Save size={16} /> {t('Guardar configuración')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Historial ── */}
        <h3 style={{ margin:'0', color:'#fff', fontSize:'1.1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <Clock size={18} color="var(--clr-accent)" /> {t('Historial de Copias de Seguridad')}
        </h3>
        <div className="admin-table-wrap glass-card">
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr>
                <th>{t('Nombre del Archivo')}</th>
                <th>{t('Fecha')}</th>
                <th>{t('Tipo')}</th>
                <th>{t('Tamaño')}</th>
                <th>{t('Estado')}</th>
                <th style={{ textAlign:'right' }}>{t('Acciones')}</th>
              </tr></thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.id} className="log-row">
                    <td style={{ color:'#fff', fontWeight:500 }}>
                      <Database size={13} style={{ marginRight:'0.5rem', color:'var(--clr-muted)', verticalAlign:'middle' }} />
                      {b.name}
                    </td>
                    <td className="col-date">
                      <span className="date-main">{b.date.split(' ')[0]}</span>
                      <span className="date-ago">{b.date.split(' ')[1]}</span>
                    </td>
                    <td>
                      <span style={{ color:'var(--clr-muted)', fontSize:'0.82rem', background:'rgba(255,255,255,0.05)', padding:'0.2rem 0.5rem', borderRadius:'4px' }}>
                        {t(b.type)}
                      </span>
                    </td>
                    <td><span style={{ color:'var(--clr-muted)', fontSize:'0.85rem' }}>{b.size}</span></td>
                    <td>
                      {b.status === 'Completado'
                        ? <span className="result-badge badge-success"><CheckCircle size={12} /> {t('Completado')}</span>
                        : <span className="result-badge badge-error"><AlertTriangle size={12} /> {t('Fallido')}</span>}
                    </td>
                    <td style={{ textAlign:'right' }}>
                      <button className="btn-toolbar" style={{ padding:'0.4rem', marginLeft:'0.4rem' }}
                        title={t('Descargar')} disabled={b.status !== 'Completado'}>
                        <Download size={15} />
                      </button>
                      <button className="btn-toolbar" style={{ padding:'0.4rem', marginLeft:'0.4rem' }}
                        title={t('Restaurar')} disabled={b.status !== 'Completado'}
                        onClick={() => setRestoreTarget(b)}>
                        <RefreshCw size={15} />
                      </button>
                      <button className="btn-toolbar btn-toolbar-danger" style={{ padding:'0.4rem', marginLeft:'0.4rem' }}
                        title={t('Eliminar')} onClick={() => handleDelete(b.id)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal Restaurar ── */}
      {restoreTarget && (
        <div className="confirm-overlay" onClick={() => setRestoreTarget(null)}>
          <div className="confirm-dialog glass-card" onClick={e => e.stopPropagation()}>
            <RefreshCw size={40} style={{ color:'#3b82f6' }} />
            <h3>{t('¿Restaurar respaldo?')}</h3>
            <p>
              {t('Se restaurará la base de datos al estado del respaldo')}:{' '}
              <strong style={{ color:'#fff' }}>{restoreTarget.name}</strong>.<br />
              <span style={{ color:'#ef4444' }}>{t('⚠ Los datos actuales serán reemplazados.')}</span>
            </p>
            <div className="confirm-actions">
              <button className="btn btn-primary" style={{ background:'#3b82f6' }}
                onClick={() => { alert(t('Restauración iniciada (demo)')); setRestoreTarget(null); }}>
                <RefreshCw size={16} /> {t('Sí, restaurar')}
              </button>
              <button className="btn btn-accent" onClick={() => setRestoreTarget(null)}>{t('Cancelar')}</button>
            </div>
          </div>
        </div>
      )}
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
