import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusCircle, Download } from 'lucide-react'
import SubPage from '../components/SubPage'
import { addActivityLog } from '../services/activityLog'
import { exportOperationResults } from '../services/exportService'
import './CreacionEquipos.css'

const getUsername = () => {
  try {
    const u = JSON.parse(localStorage.getItem('currentUser'))
    return u?.username || 'Desconocido'
  } catch { return 'Desconocido' }
}

// Opciones de tipo de equipo eliminadas por input libre

const ESTADOS_ASIGNAR = [
  'Disponible',
  'Asignado',
  'Recuperado',
  'No recuperado'
]

export default function CreacionEquipos() {
  const { t } = useTranslation()
  const [serial, setSerial] = useState('')
  const [mac, setMac] = useState('')
  const [tipo, setTipo] = useState('')
  const [estado, setEstado] = useState(ESTADOS_ASIGNAR[0])
  
  // Plantilla 
  const [mantenerPlantilla, setMantenerPlantilla] = useState(true)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  const mockCheckEquipoExistente = (s, m) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const query = (s + m).toLowerCase()
        if (query.includes('existe')) {
          resolve(true) // Simula que ya existe
        } else {
          resolve(false)
        }
      }, 600)
    })
  }

  const handleTipoChange = (e) => {
    setTipo(e.target.value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setResult(null)

    if (!serial || !mac) {
      setResult({ type: 'error', message: t('Tanto el Serial como la MAC son obligatorios.') })
      return
    }

    if (!tipo.trim()) {
      setResult({ type: 'error', message: t('Debes especificar el tipo de equipo.') })
      return
    }

    setLoading(true)
    
    const existe = await mockCheckEquipoExistente(serial, mac)
    if (existe) {
      setResult({ 
        type: 'error', 
        message: `Error: ${t('El equipo con serial')} ${serial} / MAC ${mac} ${t('ya existe en el sistema.')}`
      })
      setHistory(prev => [{ input: `${serial} | ${mac} | ${tipo}`, status: 'Error', message: 'Duplicado', timestamp: new Date().toISOString() }, ...prev])
      addActivityLog({
        usuario: getUsername(),
        accion: 'Creación',
        modulo: 'Creación Equipos',
        detalles: `Serial: ${serial} | MAC: ${mac} | Tipo: ${tipo} (Duplicado)`,
        resultado: 'Error',
      })
      setLoading(false)
      return
    }

    // Success process
    setTimeout(() => {
      setResult({ 
        type: 'success', 
        message: `${t('¡Equipo creado exitosamente!')} ${t('Se agregó un')} ${tipo} ${t('con el estado:')} ${t(estado)}.` 
      })
      setHistory(prev => [{ input: `${serial} | ${mac} | ${tipo}`, status: 'Éxito', message: estado, timestamp: new Date().toISOString() }, ...prev])
      addActivityLog({
        usuario: getUsername(),
        accion: 'Creación',
        modulo: 'Creación Equipos',
        detalles: `Serial: ${serial} | MAC: ${mac} | Tipo: ${tipo} | Estado: ${estado}`,
        resultado: 'Éxito',
      })
      setLoading(false)

      if (mantenerPlantilla) {
        setSerial('')
        setMac('')
      } else {
        // Limpiamos todo y volvemos a los valores por defecto
        setSerial('')
        setMac('')
        setTipo('')
        setEstado(ESTADOS_ASIGNAR[0])
      }
    }, 800)
  }

  return (
    <SubPage
      icon={<PlusCircle size={18} />}
      badge={t('Módulo')}
      title={t('Creación de equipos')}
      description={t('Registro y alta de nuevos equipos en el sistema.')}
    >
      <div className="creacion-container">
        <div className="creacion-card glass-card">
          <h2>{t('Registrar Nuevo Equipo')}</h2>
          <p className="creacion-subtitle">{t('Diligencia los campos obligatorios para guardar en inventario.')}</p>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>{t('Tipo de Equipo')}</label>
                <input 
                  type="text" 
                  value={tipo} 
                  onChange={handleTipoChange} 
                  placeholder="Ej: ONT, STB, AP..." 
                />
              </div>
              <div className="form-group">
                <label>{t('Serial')}</label>
                <input 
                  type="text" 
                  placeholder="Ej: ZXHN12345"
                  value={serial}
                  onChange={e => setSerial(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('Dirección MAC')}</label>
                <input 
                  type="text" 
                  placeholder="Ej: 00:1A:2B:AA:BB:CC"
                  value={mac}
                  onChange={e => setMac(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('Estado Asignado')}</label>
                <select value={estado} onChange={e => setEstado(e.target.value)}>
                  {ESTADOS_ASIGNAR.map(es => (
                    <option key={es} value={es}>{t(es)}</option>
                  ))}
                </select>
              </div>
            </div>



            <label className="checkbox-group">
              <input 
                type="checkbox" 
                checked={mantenerPlantilla}
                onChange={e => setMantenerPlantilla(e.target.checked)}
              />
              <span>{t('Mantener configuración de plantilla')}</span>
            </label>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('Creando...') : t('Crear Equipo')}
            </button>
          </form>

          {result && (
            <div className={`result-box ${result.type}`}>
              {result.message}
            </div>
          )}

          {/* BOTÓN EXPORTAR */}
          {history.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                className="btn btn-primary"
                style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}
                onClick={() => exportOperationResults({ module: 'Creacion_Equipos', results: history, t })}
              >
                <Download size={16} /> {t('Exportar')} ({history.length})
              </button>
            </div>
          )}

        </div>
      </div>
    </SubPage>
  )
}
