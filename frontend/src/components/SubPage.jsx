
import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './SubPage.css'

export default function SubPage({ icon, badge, title, description, action, children }) {
  const { t } = useTranslation()
  return (
    <section className="page-hero">
      <div className="page-content">
        <div className="page-header">
          <div className="page-badge">{icon} {badge}</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <h1 className="page-title">{title}</h1>
            {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
          </div>
          <p className="page-desc">{description}</p>
        </div>
        {children || (
          <div className="coming-soon">
            <div className="coming-soon-icon"><Construction size={48} /></div>
            <p>{t('Contenido en construcción. Pronto estará disponible.')}</p>
          </div>
        )}
      </div>
    </section>
  )
}
