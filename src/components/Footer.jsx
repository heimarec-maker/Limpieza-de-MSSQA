import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, FileText, HelpCircle, Mail, Phone, Network } from 'lucide-react'
import './Footer.css'

export default function Footer() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  // Definición de datos para iterar, facilitando el mantenimiento y la escalabilidad
  const quickLinks = [
    { icon: HelpCircle, label: 'Soporte Técnico', href: '/soporte', isRouterLink: true },
    { icon: FileText, label: 'Manual de Usuario', href: '/manual', isRouterLink: true },
    { icon: ShieldCheck, label: 'Políticas de Seguridad', href: '/seguridad', isRouterLink: true }
  ]

  const contactLinks = [
    { icon: Mail, label: 'soporte.portal@etb.com', href: 'mailto:soporte@etb.com' },
    { icon: Phone, label: 'PBX: +57 601 3777777', href: 'tel:+576013777777' }
  ]

  const legalLinks = [
    { label: 'Términos y Condiciones', href: '/terminos' },
    { label: 'Aviso de Privacidad', href: '/privacidad' },
    { label: 'Políticas de Cookies', href: '/cookies' }
  ]

  return (
    <footer className="footer">
      <div className="footer-container">
        
        <div className="footer-top">
          {/* Columna 1: Branding y Descripción */}
          <div className="footer-col">
            <h4 className="footer-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Network size={18} color="var(--clr-primary)" />
                {t('Portal Gestión ETB')}
              </span>
            </h4>
            <p className="footer-desc">
              {t('Plataforma centralizada y segura para la administración, monitoreo y gestión de servicios e infraestructura tecnológica corporativa.')}
            </p>
          </div>

          {/* Columna 2: Enlaces Rápidos */}
          <div className="footer-col">
            <h4 className="footer-title">{t('Enlaces Rápidos')}</h4>
            <ul className="footer-links" aria-label="Enlaces rápidos">
              {quickLinks.map((link, idx) => {
                const Icon = link.icon;
                return (
                  <li key={idx}>
                    {link.isRouterLink ? (
                      <Link to={link.href}>
                        <Icon size={16} strokeWidth={2.5} />
                        {t(link.label)}
                      </Link>
                    ) : (
                      <a href={link.href}>
                        <Icon size={16} strokeWidth={2.5} />
                        {t(link.label)}
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Columna 3: Contacto */}
          <div className="footer-col">
            <h4 className="footer-title">{t('Líneas de Atención')}</h4>
            <ul className="footer-links" aria-label="Contacto interno">
              {contactLinks.map((contact, idx) => {
                const Icon = contact.icon;
                return (
                  <li key={idx}>
                    <a href={contact.href}>
                      <Icon size={16} strokeWidth={2.5} />
                      {contact.label}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* Sección Inferior: Legales y Copyright */}
        <div className="footer-bottom">
          <nav className="footer-legal" aria-label="Enlaces legales">
            {legalLinks.map((legal, idx) => (
              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <a href={legal.href}>{t(legal.label)}</a>
                {idx < legalLinks.length - 1 && <span className="footer-separator">•</span>}
              </span>
            ))}
          </nav>
          
          <p className="footer-copyright">
            {t('© {{year}} Empresa de Telecomunicaciones de Bogotá. Todos los derechos reservados.', { year: currentYear })}
          </p>
        </div>

      </div>
    </footer>
  )
}
