import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { User, LogOut, Activity, Users, Sparkles } from 'lucide-react'
import { useUser } from '../context/UserContext'
import etbLogo from '../assets/logo ETB-02.png'
import './Navbar.css'

/* ── Links de navegación por rol ── */
const userNavItems = [
  { labelKey: 'Limpieza de equipos',        path: '/limpieza-equipos' },
  { labelKey: 'Creación de equipos',         path: '/creacion-equipos' },
  { labelKey: 'Limpieza direcciones SMW', path: '/limpieza-smw'    },
  { labelKey: 'Limpieza ordenes MSS',     path: '/limpieza-mss'    },
]

const adminNavItems = [
  { labelKey: 'Registro de Actividad',   path: '/admin/actividad',  Icon: Activity  },
  { labelKey: 'Historial Limpiezas',     path: '/admin/limpiezas',  Icon: Sparkles  },
  { labelKey: 'Gestión de Usuarios',     path: '/admin/usuarios',   Icon: Users     },
]

export default function Navbar() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()
  const userMenuRef = useRef(null)

  const { currentUser, logout } = useUser()
  const isAdmin = currentUser?.role === 'admin'

  // Seleccionar links según rol
  const navItems = isAdmin ? adminNavItems : userNavItems

  const handleLogout = () => {
    setUserMenuOpen(false)
    setOpen(false)
    logout()
    navigate('/')
  }

  // Cerrar dropdown de usuario al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Bloquear scroll al abrir menú móvil
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <nav className={`navbar ${isAdmin ? 'navbar--admin' : ''}`}>
      {/* Logo */}
      <Link to="/home" className="navbar-brand" onClick={() => setOpen(false)}>
        <img src={etbLogo} alt="Logo ETB" className="navbar-logo" />
      </Link>

      {/* Links centrados — solo desktop */}
      <ul className="navbar-links">
        {navItems.map((item) => (
          <li key={item.labelKey}>
            <NavLink
              to={item.path}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''} ${isAdmin ? 'nav-link--admin' : ''}`}
              onClick={() => setOpen(false)}
            >
              {item.Icon && <item.Icon size={14} className="nav-link-icon" />}
              {t(item.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Sección derecha — usuario (desktop) + hamburguesa (móvil) */}
      <div className="navbar-right">

        {/* Menú de usuario — solo desktop */}
        {currentUser && (
          <div className="nav-user-container" ref={userMenuRef}>
            <button
              className={`nav-user-trigger ${userMenuOpen ? 'active' : ''}`}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className={`user-avatar ${isAdmin ? 'user-avatar--admin' : ''}`}>
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                ) : (
                  currentUser.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="user-info-wrapper">
                <span className="user-greeting">{t('Hola,')}</span>
                <span className="user-name">
                  {currentUser.username}
                  {isAdmin && <span className="role-badge admin-badge">Admin</span>}
                </span>
              </div>
              <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {userMenuOpen && (
              <div className="user-dropdown">
                <Link to="/perfil" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <span className="item-icon"><User size={16} /></span> {t('Perfil')}
                </Link>
                <div className="dropdown-divider" />
                <button className="dropdown-item logout" onClick={handleLogout}>
                  <span className="item-icon"><LogOut size={16} /></span> {t('Cerrar sesión')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Botón hamburguesa único para móvil */}
        <button
          className={`hamburger ${open ? 'is-open' : ''}`}
          onClick={() => setOpen(!open)}
          aria-label={t('Abrir menú')}
          aria-expanded={open}
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Panel móvil — links + opciones usuario en un solo panel */}
      {open && (
        <div className="mobile-menu" onClick={() => setOpen(false)}>
          <div className="mobile-menu-panel" onClick={(e) => e.stopPropagation()}>

            {/* Links de navegación */}
            <ul className="mobile-nav-links">
              {navItems.map((item) => (
                <li key={item.labelKey}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    {item.Icon && <item.Icon size={16} />}
                    {t(item.labelKey)}
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Sección usuario en móvil */}
            {currentUser && (
              <>
                <div className="mobile-divider" />
                <div className="mobile-user-section">
                  <div className="mobile-user-info">
                    <div className={`user-avatar ${isAdmin ? 'user-avatar--admin' : ''}`}>
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                      ) : (
                        currentUser.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="mobile-greeting">{t('Hola,')}</p>
                      <p className="mobile-username">
                        {currentUser.username}
                        {isAdmin && <span className="role-badge admin-badge" style={{ marginLeft: '0.4rem' }}>Admin</span>}
                      </p>
                    </div>
                  </div>
                  <Link to="/perfil" className="mobile-action-btn" onClick={() => setOpen(false)}>
                    <User size={16} /> {t('Perfil')}
                  </Link>
                  <button className="mobile-action-btn logout" onClick={handleLogout}>
                    <LogOut size={16} /> {t('Cerrar sesión')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
