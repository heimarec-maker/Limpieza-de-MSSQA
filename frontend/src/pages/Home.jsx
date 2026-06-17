import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Monitor, PlusCircle, MapPin, ClipboardList, ArrowRight,
  ShieldCheck, Activity, Users, Sparkles
} from 'lucide-react'
import './Home.css'

/* ── Cards para usuarios normales ── */
const userCards = [
  {
    Icon: Monitor,
    title: 'Limpieza de equipos',
    desc: 'Gestión y limpieza del inventario de equipos.',
    path: '/limpieza-equipos',
    accent: 'cyan',
  },
  {
    Icon: PlusCircle,
    title: 'Creación de equipos',
    desc: 'Registro y alta de nuevos equipos en el sistema.',
    path: '/creacion-equipos',
    accent: 'blue',
  },
  {
    Icon: MapPin,
    title: 'Limpieza SMW',
    desc: 'Depuración y normalización de direcciones SMW.',
    path: '/limpieza-smw',
    accent: 'teal',
  },
  {
    Icon: ClipboardList,
    title: 'Limpieza MSS',
    desc: 'Revisión y limpieza de órdenes del sistema MSS.',
    path: '/limpieza-mss',
    accent: 'indigo',
  },
]

/* ── Cards para administradores (sincronizadas con Navbar) ── */
const adminCards = [
  {
    Icon: Activity,
    title: 'Registro de Actividad',
    desc: 'Consulta y auditoría de todas las operaciones realizadas por los usuarios.',
    path: '/admin/actividad',
    accent: 'purple',
  },
  {
    Icon: Sparkles,
    title: 'Historial Limpiezas',
    desc: 'Historial detallado de todas las limpiezas de equipos realizadas.',
    path: '/admin/limpiezas',
    accent: 'rose',
  },
  {
    Icon: Users,
    title: 'Gestión de Usuarios',
    desc: 'Administración de cuentas, roles y permisos del sistema.',
    path: '/admin/usuarios',
    accent: 'blue',
  },
]

/* ── Paleta de acentos premium ── */
const accentMap = {
  /* User accents */
  cyan:    { bg: 'rgba(6, 182, 212, 0.08)',   border: 'rgba(6, 182, 212, 0.22)',   color: '#22d3ee', glow: 'rgba(6, 182, 212, 0.30)',   gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.02))' },
  blue:    { bg: 'rgba(59, 130, 246, 0.08)',   border: 'rgba(59, 130, 246, 0.22)',   color: '#60a5fa', glow: 'rgba(59, 130, 246, 0.30)',   gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.02))' },
  teal:    { bg: 'rgba(20, 184, 166, 0.08)',   border: 'rgba(20, 184, 166, 0.22)',   color: '#2dd4bf', glow: 'rgba(20, 184, 166, 0.30)',   gradient: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(20, 184, 166, 0.02))' },
  indigo:  { bg: 'rgba(99, 102, 241, 0.08)',   border: 'rgba(99, 102, 241, 0.22)',   color: '#818cf8', glow: 'rgba(99, 102, 241, 0.30)',   gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.02))' },
  /* Admin accents */
  purple:  { bg: 'rgba(168, 85, 247, 0.08)',   border: 'rgba(168, 85, 247, 0.22)',   color: '#c084fc', glow: 'rgba(168, 85, 247, 0.30)',   gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.02))' },
  rose:    { bg: 'rgba(244, 63, 94, 0.08)',    border: 'rgba(244, 63, 94, 0.22)',    color: '#fb7185', glow: 'rgba(244, 63, 94, 0.30)',    gradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(244, 63, 94, 0.02))' },
}

export default function Home() {
  const { t } = useTranslation()
  const savedUser = localStorage.getItem('currentUser')
  const currentUser = savedUser ? JSON.parse(savedUser) : null
  const isAdmin = currentUser?.role === 'admin'

  const cards = isAdmin 
    ? adminCards.map(c => ({ ...c, title: t(c.title), desc: t(c.desc) }))
    : userCards.map(c => ({ ...c, title: t(c.title), desc: t(c.desc) }))

  return (
    <section className="hero">
      {/* Orbes de fondo animados */}
      <div className="hero-orb hero-orb--1" />
      <div className="hero-orb hero-orb--2" />

      <div className="hero-content">
        {/* ── Badge dinámico según rol ── */}
        {isAdmin ? (
          <span className="hero-badge hero-badge--admin">
            <ShieldCheck size={14} />
            {t('Panel de Administración')}
          </span>
        ) : (
          <span className="hero-badge">{t('Centro de Operaciones')}</span>
        )}

        <h1 className="hero-title">
          {isAdmin ? t('Administración') : t('Gestión Automatizada')}
        </h1>
        <p className="hero-subtitle">
          {isAdmin
            ? t('Supervisa, audita y gestiona todos los procesos y usuarios de la plataforma ETB.')
            : t('Plataforma centralizada para la optimización y control de procesos técnicos ETB.')}
        </p>

        <div className={`hero-cards ${isAdmin ? 'hero-cards--admin' : ''}`}>
          {cards.map((c, i) => {
            const accent = c.accent ? accentMap[c.accent] : null
            return (
              <Link
                to={c.path}
                key={c.title}
                className={`card glass-card ${c.accent ? 'card--accent' : ''} ${isAdmin ? 'card--admin' : ''}`}
                style={{
                  '--accent-bg': accent?.bg,
                  '--accent-border': accent?.border,
                  '--accent-color': accent?.color,
                  '--accent-glow': accent?.glow,
                  '--accent-gradient': accent?.gradient,
                  '--card-delay': `${i * 80}ms`,
                }}
              >
                {/* Shimmer decorativo */}
                <div className="card-shimmer" />

                <div className="card-icon-wrapper">
                  <c.Icon size={24} />
                </div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
                <div className="card-arrow">
                  <span className="card-arrow-label">{t('Acceder')}</span>
                  <ArrowRight size={16} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
