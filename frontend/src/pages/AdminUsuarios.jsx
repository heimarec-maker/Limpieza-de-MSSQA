import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SubPage from '../components/SubPage';
import {
  Users, UserPlus, Search, Filter,
  Shield, CheckCircle, XCircle,
  Activity, Mail, Edit, Trash2, Download,
  X, Save, Lock, Unlock, AlertTriangle, Briefcase, Loader
} from 'lucide-react';
import './AdminPanel.css';
import { exportUsers } from '../services/exportService';

const API_BASE = 'http://localhost:3001';

const EMPTY_FORM = { name: '', email: '', role: 'Operador', status: 'Activo', department: '' };

export default function AdminUsuarios() {
  const { t } = useTranslation();
  const [searchText,    setSearchText]    = useState('');
  const [filterRole,    setFilterRole]    = useState('Todos');
  const [usersList,     setUsersList]     = useState([]);
  const [showModal,     setShowModal]     = useState(false);
  const [editingUser,   setEditingUser]   = useState(null);
  const [formData,      setFormData]      = useState(EMPTY_FORM);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [formErrors,    setFormErrors]    = useState({});
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // Cargar usuarios reales desde la API al montar
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios`);
      const json = await res.json();
      if (json.ok) {
        setUsersList(json.data);
      } else {
        setError(t('Error al cargar los usuarios.'));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(t('No se pudo conectar con el servidor.'));
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = usersList.filter(u => {
    if (filterRole !== 'Todos' && u.role !== filterRole) return false;
    if (searchText && !u.name.toLowerCase().includes(searchText.toLowerCase()) &&
        !u.email.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => { setEditingUser(null); setFormData(EMPTY_FORM); setFormErrors({}); setShowModal(true); };
  const openEdit   = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, role: user.role, status: user.status, department: user.department });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSave = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = t('El nombre es obligatorio.');
    } else if (formData.name.trim().length < 3) {
      errors.name = t('El nombre debe tener al menos 3 caracteres.');
    }
    
    if (!formData.email.trim()) {
      errors.email = t('El correo electrónico es obligatorio.');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = t('El formato del correo electrónico no es válido.');
      } else {
        const isDuplicate = usersList.some(u => u.email.toLowerCase() === formData.email.toLowerCase() && (!editingUser || u.id !== editingUser.id));
        if (isDuplicate) {
          errors.email = t('Ya existe un usuario con este correo electrónico.');
        }
      }
    }
    
    if (!formData.department.trim()) {
      errors.department = t('El departamento es obligatorio.');
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});

    if (editingUser) {
      setUsersList(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
    } else {
      setUsersList(prev => [{
        ...formData,
        id: Date.now(),
        avatar: formData.name.charAt(0).toUpperCase(),
        lastLogin: t('Nunca'),
      }, ...prev]);
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    setUsersList(prev => prev.filter(u => u.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleToggle = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/${userId}/toggle`, { method: 'PATCH' });
      const json = await res.json();
      if (json.ok) {
        setUsersList(prev => prev.map(u =>
          u.id === userId ? { ...u, status: json.data.status } : u
        ));
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  const handleExport = () => { if (filteredUsers.length > 0) exportUsers(filteredUsers, t); };

  const total    = usersList.length;
  const activos  = usersList.filter(u => u.status === 'Activo').length;
  const admins   = usersList.filter(u => u.role === 'Administrador').length;
  const inactivos= usersList.filter(u => u.status === 'Inactivo').length;

  const avatarBg = (role) =>
    role === 'Administrador'
      ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
      : 'linear-gradient(135deg,#1d4ed8,#3b82f6)';

  return (
    <SubPage icon={<Users size={18} />} badge={t('Administración')}
      title={t('Gestión de Usuarios')}
      description={t('Administra los accesos, roles y permisos de los usuarios en la plataforma.')}>

      <div className="admin-container">

        {/* ── Estadísticas ── */}
        <div className="admin-stats-grid">
          <StatCard Icon={Users}        label={t('Usuarios Totales')}    value={total}    color="blue"    />
          <StatCard Icon={CheckCircle}  label={t('Usuarios Activos')}    value={activos}  color="emerald" />
          <StatCard Icon={Shield}       label={t('Administradores')}     value={admins}   color="purple"  />
          <StatCard Icon={XCircle}      label={t('Usuarios Inactivos')}  value={inactivos} color="red"   />
        </div>

        {/* ── Toolbar ── */}
        <div className="admin-toolbar glass-card">
          <div className="toolbar-filters">
            <div className="filter-group">
              <Filter size={16} />
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="Todos">{t('Todos los roles')}</option>
                <option value="Administrador">{t('Administrador')}</option>
                <option value="Operador">{t('Operador')}</option>
                <option value="Consultor">{t('Consultor')}</option>
              </select>
            </div>
            <div className="filter-search">
              <Search size={16} />
              <input type="text" placeholder={t('Buscar por nombre o correo...')}
                value={searchText} onChange={e => setSearchText(e.target.value)} />
            </div>
          </div>
          <div className="toolbar-actions">
            <button className="btn-toolbar" onClick={handleExport} title={t('Exportar')}>
              <Download size={16} /> {t('Exportar')}
            </button>
            <button className="btn btn-primary" style={{ padding: '0.6rem 1rem' }} onClick={openCreate}>
              <UserPlus size={16} /> {t('Nuevo Usuario')}
            </button>
          </div>
        </div>

        {/* ── Contador ── */}
        <div className="admin-results-count">
          <Users size={16} />
          {t('Mostrando')} <strong>{filteredUsers.length}</strong> {t('de')} <strong>{total}</strong> {t('usuarios')}
        </div>

        {/* ── Tabla ── */}
        <div className="admin-table-wrap glass-card">
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('Usuario')}</th>
                  <th>{t('Correo')}</th>
                  <th>{t('Departamento')}</th>
                  <th>{t('Rol')}</th>
                  <th>{t('Estado')}</th>
                  <th>{t('Último Acceso')}</th>
                  <th style={{ textAlign: 'right' }}>{t('Acciones')}</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7}>
                    <div className="admin-empty" style={{ padding:'2.5rem' }}>
                      <Loader size={40} className="spin-animation" />
                      <h3>{t('Cargando usuarios...')}</h3>
                    </div>
                  </td></tr>
                )}
                {error && !loading && (
                  <tr><td colSpan={7}>
                    <div className="admin-empty" style={{ padding:'2.5rem' }}>
                      <AlertTriangle size={40} style={{ color:'#ef4444' }} />
                      <h3 style={{ color:'#ef4444' }}>{error}</h3>
                      <button className="btn btn-primary" style={{ marginTop:'1rem' }} onClick={fetchUsers}>
                        {t('Reintentar')}
                      </button>
                    </div>
                  </td></tr>
                )}
                {!loading && !error && filteredUsers.map(user => (
                  <tr key={user.id} className="log-row">
                    <td className="col-user">
                      <div className="user-cell">
                        <div className="mini-avatar" style={{ background: avatarBg(user.role) }}>{user.avatar}</div>
                        <span style={{ fontWeight: 500, color: '#fff' }}>{user.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', color:'var(--clr-muted)' }}>
                        <Mail size={14} /> {user.email}
                      </div>
                    </td>
                    <td>
                      <span style={{ color:'var(--clr-muted)', fontSize:'0.82rem', background:'rgba(255,255,255,0.05)', padding:'0.2rem 0.6rem', borderRadius:'4px' }}>
                        <Briefcase size={11} style={{ marginRight:'0.3rem', verticalAlign:'middle' }} />
                        {user.department || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`result-badge ${user.role === 'Administrador' ? 'badge-warning' : user.role === 'Operador' ? 'badge-info' : 'badge-success'}`}>
                        {user.role === 'Administrador' ? <Shield size={12} /> : <Users size={12} />}
                        {t(user.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`result-badge ${user.status === 'Activo' ? 'badge-success' : 'badge-error'}`}>
                        {user.status === 'Activo' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {t(user.status)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', color:'var(--clr-muted)', fontSize:'0.85rem' }}>
                        <Activity size={14} /> {user.lastLogin}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-toolbar" style={{ padding:'0.4rem', marginLeft:'0.4rem' }}
                        title={user.status === 'Activo' ? t('Desactivar') : t('Activar')}
                        onClick={() => handleToggle(user.id)}>
                        {user.status === 'Activo' ? <Lock size={15} /> : <Unlock size={15} />}
                      </button>
                      <button className="btn-toolbar" style={{ padding:'0.4rem', marginLeft:'0.4rem' }}
                        title={t('Editar')} onClick={() => openEdit(user)}>
                        <Edit size={15} />
                      </button>
                      <button className="btn-toolbar btn-toolbar-danger" style={{ padding:'0.4rem', marginLeft:'0.4rem' }}
                        title={t('Eliminar')} onClick={() => setDeleteTarget(user)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && !error && filteredUsers.length === 0 && (
                  <tr><td colSpan={7}>
                    <div className="admin-empty" style={{ padding:'2.5rem' }}>
                      <Users size={40} /><h3>{t('Sin usuarios')}</h3>
                      <p>{t('No hay usuarios que coincidan con los filtros.')}</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal Crear / Editar ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? <><Edit size={18} /> {t('Editar Usuario')}</> : <><UserPlus size={18} /> {t('Nuevo Usuario')}</>}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {Object.keys(formErrors).length > 0 && (
              <div className="security-alert error" style={{ margin: '0 1.5rem 1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <AlertTriangle size={16} />
                {t('Por favor, corrige los errores en el formulario.')}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">{t('Nombre completo')}</label>
                <input className={`form-input ${formErrors.name ? 'input-error' : ''}`} type="text" placeholder="Ej. Juan García"
                  style={formErrors.name ? { borderColor: '#ef4444' } : {}}
                  value={formData.name} onChange={e => { setFormData(p => ({ ...p, name: e.target.value })); setFormErrors(p => ({...p, name: undefined})); }} />
                {formErrors.name && <div className="error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem' }}>{formErrors.name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">{t('Correo electrónico')}</label>
                <input className={`form-input ${formErrors.email ? 'input-error' : ''}`} type="email" placeholder="usuario@etb.com"
                  style={formErrors.email ? { borderColor: '#ef4444' } : {}}
                  value={formData.email} onChange={e => { setFormData(p => ({ ...p, email: e.target.value })); setFormErrors(p => ({...p, email: undefined})); }} />
                {formErrors.email && <div className="error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem' }}>{formErrors.email}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">{t('Rol')}</label>
                <select className="form-select" value={formData.role}
                  onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}>
                  <option value="Administrador">{t('Administrador')}</option>
                  <option value="Operador">{t('Operador')}</option>
                  <option value="Consultor">{t('Consultor')}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Departamento')}</label>
                <input className={`form-input ${formErrors.department ? 'input-error' : ''}`} type="text" placeholder="Ej. Operaciones"
                  style={formErrors.department ? { borderColor: '#ef4444' } : {}}
                  value={formData.department} onChange={e => { setFormData(p => ({ ...p, department: e.target.value })); setFormErrors(p => ({...p, department: undefined})); }} />
                {formErrors.department && <div className="error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem' }}>{formErrors.department}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">{t('Estado')}</label>
                <select className="form-select" value={formData.status}
                  onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                  <option value="Activo">{t('Activo')}</option>
                  <option value="Inactivo">{t('Inactivo')}</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-toolbar" onClick={() => setShowModal(false)}>{t('Cancelar')}</button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={16} /> {editingUser ? t('Guardar cambios') : t('Crear usuario')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmar eliminación ── */}
      {deleteTarget && (
        <div className="confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirm-dialog glass-card" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={40} className="confirm-icon" />
            <h3>{t('¿Eliminar usuario?')}</h3>
            <p>{t('Se eliminará permanentemente la cuenta de')} <strong style={{ color:'#fff' }}>{deleteTarget.name}</strong>. {t('Esta acción no se puede deshacer.')}</p>
            <div className="confirm-actions">
              <button className="btn btn-primary" style={{ background:'#ef4444' }} onClick={handleDelete}>
                <Trash2 size={16} /> {t('Sí, eliminar')}
              </button>
              <button className="btn btn-accent" onClick={() => setDeleteTarget(null)}>{t('Cancelar')}</button>
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
