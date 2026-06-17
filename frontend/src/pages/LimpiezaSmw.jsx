import { MapPin, Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import SubPage from '../components/SubPage'

export default function LimpiezaSmw() {
  const { t } = useTranslation()
  return (
    <SubPage
      icon={<MapPin size={18} />}
      badge={t('Módulo')}
      title={t('Limpieza de direcciones smw')}
      description={t('Depuración y normalización de direcciones SMW.')}
    >
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Construction size={24} /> {t('Módulo en Desarrollo')}
        </h2>
        <p style={{ color: 'var(--clr-muted)' }}>
          {t('Este módulo estará disponible muy pronto.')}
        </p>
      </div>
    </SubPage>
  )
}
