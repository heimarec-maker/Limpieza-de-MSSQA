import { ClipboardList, Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import SubPage from '../components/SubPage'

export default function LimpiezaMss() {
  const { t } = useTranslation()
  return (
    <SubPage
      icon={<ClipboardList size={18} />}
      badge={t('Módulo')}
      title={t('Limpieza de ordenes MSS')}
      description={t('Revisión y limpieza de órdenes del sistema MSS.')}
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
