import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useUser } from '../context/UserContext'
import { getActivityLogs } from '../services/activityLog'
import {
  Monitor, Sparkles, ClipboardList, Globe,
  Pencil, LogOut, Save, CheckCircle,
  Bell, Lock, Languages, Palette, Camera
} from 'lucide-react'
import './Perfil.css'

export default function Perfil() {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { currentUser, updateUser, logout } = useUser()

  const [userStats, setUserStats] = useState({
    creaciones: 0,
    limpiezas: 0,
    ordenes: 0,
    dirs: 0
  })

  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    username:  currentUser?.username  || '',
    email:     currentUser?.email     || '',
    cargo:     currentUser?.cargo     || 'Técnico ETB',
    area:      currentUser?.area      || 'Operaciones',
    avatar:    currentUser?.avatar    || '',
  })
  const [saved, setSaved] = useState(false)
  const [profileErrors, setProfileErrors] = useState({})

  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })

  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('userSettings')
    return savedSettings ? JSON.parse(savedSettings) : {
      notifications: true,
      language: 'es-CO',
      theme: theme
    }
  })

  useEffect(() => {
    if (!currentUser) return;

    const fetchStats = () => {
      const logs = getActivityLogs()
      const myLogs = logs.filter(log => log.usuario === currentUser.username)
      
      setUserStats({
        creaciones: myLogs.filter(l => l.accion === 'Creación').length,
        limpiezas: myLogs.filter(l => l.accion === 'Limpieza').length,
        ordenes: 0, // Mock for now
        dirs: 0     // Mock for now
      })
    };

    fetchStats();
    const intervalId = setInterval(fetchStats, 5000); // Actualizar cada 5 seg
    
    return () => clearInterval(intervalId);
  }, [currentUser])

  const [showPasswordCheck, setShowPasswordCheck] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState('')

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('userSettings', JSON.stringify(newSettings))
    
    if (key === 'language') {
      i18n.changeLanguage(value)
    }

    if (key === 'theme') {
      toggleTheme(value)
    }
  }

  const handleCheckPassword = () => {
    setPasswordStatus('analizando')
    setTimeout(() => {
      setPasswordStatus('segura')
    }, 2000)
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        updateUser({ avatar: reader.result })
        setFormData(prev => ({ ...prev, avatar: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const validatePassword = (pass) => {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    return pass.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  };

  const handleSavePassword = () => {
    if (passwordData.new !== passwordData.confirm) {
      setPasswordStatus('error_match')
      return
    }
    if (!validatePassword(passwordData.new)) {
      setPasswordStatus('error_security')
      return
    }
    
    setPasswordStatus('guardando')
    setTimeout(() => {
      updateUser({ password: passwordData.new })
      setPasswordStatus('exito')
      setPasswordData({ current: '', new: '', confirm: '' })
    }, 1500)
  }

  if (!currentUser) {
    navigate('/')
    return null
  }

  const initials = formData.username.charAt(0).toUpperCase()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setProfileErrors({ ...profileErrors, [e.target.name]: undefined })
  }

  const handleSave = () => {
    const errors = {};
    if (!formData.username.trim()) {
      errors.username = t('El nombre de usuario es obligatorio.');
    } else if (formData.username.trim().length < 3) {
      errors.username = t('El nombre debe tener al menos 3 caracteres.');
    }

    if (!formData.email.trim()) {
      errors.email = t('El correo electrónico es obligatorio.');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = t('El formato del correo electrónico no es válido.');
      }
    }

    if (!formData.cargo.trim()) {
      errors.cargo = t('El cargo es obligatorio.');
    }
    if (!formData.area.trim()) {
      errors.area = t('El área es obligatoria.');
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    
    setProfileErrors({});
    updateUser(formData)
    setEditMode(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="perfil-page">

      {/* ── Hero Header ── */}
      <div className="perfil-hero">
        <div className="perfil-hero-bg" />
        <div className="perfil-hero-content">

          {/* Avatar */}
          <div className="perfil-avatar-wrap">
            <label className="perfil-avatar-label">
              <div className="perfil-avatar">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Avatar" className="perfil-avatar-img" />
                ) : (
                  initials
                )}
                <div className="perfil-avatar-overlay">
                  <Camera size={24} />
                </div>
                <span className="perfil-status-dot" />
              </div>
              <input type="file" accept="image/*" className="perfil-avatar-input" onChange={handleAvatarChange} />
            </label>
          </div>

          {/* Nombre y rol */}
          <div className="perfil-hero-info">
            <h1 className="perfil-name">{formData.username}</h1>
            <p className="perfil-role">{formData.cargo} · {formData.area}</p>
            <span className="perfil-badge">{t('Activo')}</span>
          </div>

          {/* Acciones hero */}
          <div className="perfil-hero-actions">
            <button
              className="btn-perfil btn-perfil-primary"
              onClick={() => setEditMode(true)}
            >
              <Pencil size={15} /> {t("Editar perfil")}
            </button>
            <button
              className="btn-perfil btn-perfil-ghost"
              onClick={handleLogout}
            >
              <LogOut size={15} /> {t("Cerrar sesión")}
            </button>
          </div>

        </div>
      </div>

      {/* ── Stats ── */}
      <div className="perfil-stats">
        <div className="perfil-stat-card glass-card">
          <span className="perfil-stat-icon"><Monitor size={24} /></span>
          <span className="perfil-stat-value">{userStats.creaciones || '0'}</span>
          <span className="perfil-stat-label">{t('Equipos creados')}</span>
        </div>
        <div className="perfil-stat-card glass-card">
          <span className="perfil-stat-icon"><Sparkles size={24} /></span>
          <span className="perfil-stat-value">{userStats.limpiezas || '0'}</span>
          <span className="perfil-stat-label">{t('Limpiezas equipos')}</span>
        </div>
        <div className="perfil-stat-card glass-card">
          <span className="perfil-stat-icon"><ClipboardList size={24} /></span>
          <span className="perfil-stat-value">{userStats.ordenes || '0'}</span>
          <span className="perfil-stat-label">{t('Órdenes MSS')}</span>
        </div>
        <div className="perfil-stat-card glass-card">
          <span className="perfil-stat-icon"><Globe size={24} /></span>
          <span className="perfil-stat-value">{userStats.dirs || '0'}</span>
          <span className="perfil-stat-label">{t('Dirs. SMW')}</span>
        </div>
      </div>

      {/* ── Grid info + settings ── */}
      <div className="perfil-grid">

        {/* Información personal */}
        <section className="perfil-section glass-card">
          <div className="perfil-section-header">
            <h2>{t("Información personal")}</h2>
            {!editMode && (
              <button className="btn-perfil-sm" onClick={() => setEditMode(true)}>
                {t("Editar")}
              </button>
            )}
          </div>

          <div className="perfil-fields">
            <Field
              label={t("Nombre de usuario")}
              name="username"
              value={formData.username}
              editMode={editMode}
              onChange={handleChange}
              error={profileErrors.username}
            />
            <Field
              label={t("Correo electrónico")}
              name="email"
              value={formData.email}
              editMode={editMode}
              onChange={handleChange}
              placeholder="usuario@etb.com"
              error={profileErrors.email}
            />
            <Field
              label={t("Cargo")}
              name="cargo"
              value={formData.cargo}
              editMode={editMode}
              onChange={handleChange}
              error={profileErrors.cargo}
            />
            <Field
              label={t("Área")}
              name="area"
              value={formData.area}
              editMode={editMode}
              onChange={handleChange}
              error={profileErrors.area}
            />
          </div>

          {editMode && (
            <div className="perfil-edit-actions">
              <button
                className="btn-perfil btn-perfil-primary"
                onClick={handleSave}
              >
                <Save size={15} /> {t("Guardar cambios")}
              </button>
              <button
                className="btn-perfil btn-perfil-ghost"
                onClick={() => setEditMode(false)}
              >
                {t("Cancelar")}
              </button>
            </div>
          )}

          {saved && (
            <div className="perfil-toast">
              <CheckCircle size={16} /> {t("Cambios guardados correctamente")}
            </div>
          )}
        </section>

        {/* Configuración de cuenta */}
        <section className="perfil-section glass-card">
          <div className="perfil-section-header" style={{ textAlign: 'center', width: '100%', display: 'block' }}>
            <h2>{t("Configuración")}</h2>
          </div>

          <div className="perfil-config-list">
            <ConfigItem
              Icon={Bell}
              title={t("Notificaciones")}
              desc={t("Gestiona alertas del sistema")}
              action={
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={settings.notifications} 
                    onChange={(e) => updateSetting('notifications', e.target.checked)} 
                  />
                  <span className="toggle-slider"></span>
                </label>
              }
            />
            <ConfigItem
              Icon={Lock}
              title={t("Seguridad")}
              desc={t("Contraseña y acceso")}
              action={
                <button 
                  className="btn-perfil-sm" 
                  onClick={() => { setShowPasswordCheck(true); setPasswordStatus(''); }}
                >
                  {t("Cambiar")}
                </button>
              }
            />
            <ConfigItem
              Icon={Languages}
              title={t("Idioma")}
              desc={t("Selecciona tu idioma")}
              action={
                <select 
                  className="config-select"
                  value={settings.language}
                  onChange={(e) => updateSetting('language', e.target.value)}
                >
                  <option value="es-CO">🇨🇴 Español (Colombia)</option>
                  <option value="en-US">🇺🇸 English (US)</option>
                  <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                  <option value="zh-CN">🇨🇳 中文 (中国)</option>
                </select>
              }
            />
            <ConfigItem
              Icon={Palette}
              title={t("Tema")}
              desc={t("Apariencia de la pantalla")}
              action={
                <select 
                  className="config-select"
                  value={settings.theme}
                  onChange={(e) => updateSetting('theme', e.target.value)}
                >
                  <option value="dark">{t("Modo oscuro")}</option>
                  <option value="light">{t("Modo claro")}</option>
                </select>
              }
            />
          </div>

          <div className="perfil-danger-zone">
            <p className="perfil-danger-label">{t("Zona de peligro")}</p>
            <button className="btn-perfil-danger" onClick={handleLogout}>
              <LogOut size={15} /> {t("Cerrar sesión permanentemente")}
            </button>
          </div>
        </section>

      </div>

      {showPasswordCheck && (
        <div className="password-modal-overlay">
          <div className="password-modal glass-card">
            <h3>{t("Cambiar Contraseña")}</h3>
            
            {(passwordStatus === '' || passwordStatus.startsWith('error')) && (
              <div className="password-form">
                <div className="perfil-field">
                  <label className="perfil-field-label">{t("Nueva contraseña")}</label>
                  <input 
                    type="password" 
                    className="perfil-field-input" 
                    value={passwordData.new}
                    onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                  />
                </div>
                <div className="perfil-field mt-3">
                  <label className="perfil-field-label">{t("Confirmar contraseña")}</label>
                  <input 
                    type="password" 
                    className="perfil-field-input" 
                    value={passwordData.confirm}
                    onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                  />
                </div>

                {passwordStatus === 'error_match' && <p className="password-error">{t("Las contraseñas no coinciden")}</p>}
                {passwordStatus === 'error_security' && <p className="password-error">{t("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.")}</p>}

                <div className="modal-actions mt-3">
                  <button className="btn-perfil btn-perfil-primary" onClick={handleSavePassword}>
                    <Save size={15} /> {t("Guardar")}
                  </button>
                  <button className="btn-perfil btn-perfil-ghost" onClick={() => setShowPasswordCheck(false)}>
                    {t("Cancelar")}
                  </button>
                </div>
              </div>
            )}

            {passwordStatus === 'guardando' && (
              <div className="password-evaluating">
                <div className="spinner"></div>
                <p>{t("Actualizando credenciales...")}</p>
              </div>
            )}

            {passwordStatus === 'exito' && (
              <div className="password-result">
                <CheckCircle size={40} color="#4ade80" />
                <h4>{t("¡Contraseña Actualizada!")}</h4>
                <p>{t("Tu nueva contraseña ha sido guardada de forma segura.")}</p>
                <button className="btn-perfil btn-perfil-primary mt-3" onClick={() => {setShowPasswordCheck(false); setPasswordStatus('');}}>
                  {t("Entendido")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

/* ── Sub-componentes ── */

function Field({ label, name, value, editMode, onChange, placeholder, error }) {
  return (
    <div className="perfil-field">
      <label className="perfil-field-label">{label}</label>
      {editMode ? (
        <>
          <input
            className={`perfil-field-input ${error ? 'input-error' : ''}`}
            style={error ? { borderColor: '#ef4444' } : {}}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder || ''}
          />
          {error && <div className="error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem' }}>{error}</div>}
        </>
      ) : (
        <span className="perfil-field-value">{value || '—'}</span>
      )}
    </div>
  )
}

function ConfigItem({ Icon, title, desc, action }) {
  return (
    <div className="config-item">
      <span className="config-icon"><Icon size={20} /></span>
      <div className="config-text">
        <p className="config-title">{title}</p>
        <p className="config-desc">{desc}</p>
      </div>
      <div className="config-action">
        {action}
      </div>
    </div>
  )
}
