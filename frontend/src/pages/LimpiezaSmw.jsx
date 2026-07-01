import { useState } from 'react'
import { MapPin, Search, PlusCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUser } from '../context/UserContext'
import SubPage from '../components/SubPage'
import SmwCleaningModal from '../components/SmwCleaningModal'

import { consultarDireccionSmw, limpiarDireccionSmw } from '../services/smwService'

export default function LimpiezaSmw() {
  const { t } = useTranslation()
  const { currentUser } = useUser()
  const [address, setAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [selectedData, setSelectedData] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!address.trim()) {
      setError(t('Por favor ingrese una dirección válida.'))
      return
    }

    setIsSearching(true)
    
    try {
      const data = await consultarDireccionSmw(address, currentUser?.username || currentUser?.usuario || 'Sistema')
      setSelectedData(data)
      setShowModal(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  const handleClean = async (data) => {
    setShowModal(false)
    setIsSearching(true)
    setError(null)
    
    try {
      await limpiarDireccionSmw(data.codigoDireccion, data.rfsList, currentUser?.username || 'Sistema', address)
      setSuccessMsg(t('Libreación de RFS exitosa en SMW'))
      setAddress('')
      setSelectedData(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <SubPage
      icon={<MapPin size={18} />}
      badge={t('Módulo de Red')}
      title={t('Limpieza de Direcciones SMW')}
      description={t('Herramienta técnica para la normalización y depuración de registros de direcciones en el inventario SMW.')}
    >
      <div className="limpieza-container" style={{ maxWidth: '840px', margin: '0 auto' }}>
        
        {/* Card Principal de Búsqueda */}
        <div className="glass-card" style={{ padding: '3rem', marginTop: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
            <div className="icon-wrapper primary" style={{ margin: '0 auto 1.5rem', width: '70px', height: '70px', borderRadius: '20px' }}>
              <Search size={34} />
            </div>
            <h2 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-1px' }}>
              {t('Consultar Inventario')}
            </h2>
            <p style={{ color: 'var(--clr-muted)', marginTop: '0.75rem', fontSize: '1.1rem' }}>
              {t('Ingrese la dirección normalizada para obtener sus parámetros técnicos de SMW.')}
            </p>
          </div>

          <form onSubmit={handleSearch}>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label htmlFor="address" style={{ display: 'block', marginBottom: '1rem', fontWeight: '700', fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>
                {t('Dirección Normalizada')}
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    id="address"
                    type="text"
                    className="login-input"
                    placeholder={t('Ej: CL 43F SUR')}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value)
                      if (error) setError(null)
                    }}
                    disabled={isSearching}
                    style={{ 
                      width: '100%', 
                      padding: '1.2rem 1.2rem 1.2rem 3.5rem',
                      fontSize: '1.1rem',
                      borderRadius: '16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: error ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'
                    }}
                  />
                  <MapPin size={22} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, color: error ? '#ef4444' : 'var(--clr-accent)' }} />
                  
                  {address && !isSearching && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddress('')
                        setError(null)
                      }}
                      style={{
                        position: 'absolute',
                        right: '1.2rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        color: 'var(--clr-muted)',
                        cursor: 'pointer',
                        padding: '0.4rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      className="clear-btn"
                      title={t('Limpiar')}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSearching}
                  style={{ height: '62px', minWidth: '180px', borderRadius: '16px', fontSize: '1.1rem' }}
                >
                  {isSearching ? (
                    <Loader2 size={24} className="spin-animation" />
                  ) : (
                    <>
                      <Search size={22} />
                      {t('Consultar')}
                    </>
                  )}
                </button>
              </div>
              {error && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Info size={14} /> {error}
                </p>
              )}
            </div>
          </form>

          {/* Feedback de Éxito */}
          {successMsg && (
            <div className="glass-card" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.8rem', borderRadius: '12px' }}>
                <CheckCircle2 size={24} />
              </div>
              <p style={{ color: '#10b981', fontWeight: '500', fontSize: '1rem' }}>{successMsg}</p>
            </div>
          )}

          {/* Sección de Ayuda / Info */}
          <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', color: 'var(--clr-accent)' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(0, 112, 243, 0.1)', borderRadius: '10px' }}>
                  <PlusCircle size={20} />
                </div>
                <span style={{ fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('Propósito')}</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--clr-muted)', lineHeight: '1.6' }}>
                {t('Este módulo permite liberar recursos lógicos bloqueados en direcciones que han cambiado su estado técnico o requieren re-aprovisionamiento.')}
              </p>
            </div>
            
            <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', color: '#10b981' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px' }}>
                  <CheckCircle2 size={20} />
                </div>
                <span style={{ fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('Garantía')}</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--clr-muted)', lineHeight: '1.6' }}>
                {t('La limpieza asegura que la base de datos SMW refleje la realidad física, evitando errores de Cross-Reference en la red.')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <SmwCleaningModal 
        isOpen={showModal}
        data={selectedData} 
        onClose={() => setShowModal(false)}
        onClean={handleClean}
      />
    </SubPage>
  )
}
