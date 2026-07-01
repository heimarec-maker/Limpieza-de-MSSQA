import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check } from 'lucide-react'
import { consultarDireccionSmw } from '../services/smwService'
import { useUser } from '../context/UserContext'
import './ImportPreviewModal.css'

const getUsername = () => {
  try {
    const u = JSON.parse(localStorage.getItem('currentUser'))
    return u?.username || u?.usuario || 'Desconocido'
  } catch {
    return 'Desconocido'
  }
}

export default function SmwImportPreviewModal({ isOpen, fileAddresses, onClose, onConfirm }) {
  const username = getUsername()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !fileAddresses || fileAddresses.length === 0) return

    // Inicializar el estado
    const parsedItems = fileAddresses.map(address => ({
      address,
      estado: 'Consultando recursos...',
      color: 'var(--clr-muted)',
      loading: true,
      selected: true,
      data: null // Para guardar codigoDireccion y rfsList
    }))
    
    setItems(parsedItems)
    setLoading(true)

    const cargarEstados = async () => {
      const results = []
      const chunkSize = 20 

      for (let i = 0; i < parsedItems.length; i += chunkSize) {
        const chunk = parsedItems.slice(i, i + chunkSize)
        
        const chunkResults = await Promise.all(
          chunk.map(async (item) => {
            try {
              const res = await consultarDireccionSmw(item.address, currentUser?.username || 'Sistema')
              let estadoFinal = 'Sin RFS'
              let color = 'var(--clr-muted)'

              if (res.cantidadRfs > 0) {
                estadoFinal = `${res.cantidadRfs} RFS Encontrados`
                color = '#f59e0b' // Amarillo (Requiere limpieza)
              } else {
                estadoFinal = 'Libre / Sin recursos'
                color = '#10b981' // Verde
              }
              
              return {
                ...item,
                estado: estadoFinal,
                color,
                loading: false,
                data: res // Guarda { codigoDireccion, rfsList }
              }
            } catch (error) {
              return { ...item, estado: 'Dirección No Encontrada', color: '#ef4444', loading: false, data: null }
            }
          })
        )
        results.push(...chunkResults)
        setItems([...results, ...parsedItems.slice(i + chunkSize)])
      }
      
      setLoading(false)
    }

    cargarEstados()

  }, [isOpen, fileAddresses])

  if (!isOpen) return null

  const toggleSelect = (index) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, selected: !it.selected } : it))
  }

  const handleConfirm = () => {
    const validItems = items.filter(it => it.selected).map(it => it.address)
    onConfirm(validItems)
  }

  return createPortal(
    <div className="import-modal-overlay">
      <div className="import-modal-box glass-card">
        <div className="import-modal-header">
          <h3>Vista Previa de Importación SMW</h3>
          <button className="import-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="import-modal-body">
          <p className="import-modal-desc">
            Se encontraron <strong>{items.length}</strong> dirección(es). 
            Consultando recursos lógicos amarrados...
          </p>
          
          <div className="import-modal-table-wrap">
            <table className="import-modal-table">
              <thead>
                <tr>
                  <th width="40" style={{ textAlign: 'center' }}>Incluir</th>
                  <th>Dirección Extraída</th>
                  <th>Estado SMW</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className={!it.selected ? 'import-row-disabled' : ''}>
                    <td align="center">
                      <input 
                        type="checkbox" 
                        checked={it.selected}
                        onChange={() => toggleSelect(idx)}
                      />
                    </td>
                    <td><code>{it.address}</code></td>
                    <td>
                      {it.loading ? (
                        <span className="import-spinner"></span>
                      ) : (
                        <strong style={{ color: it.color, fontSize: '0.85rem' }}>{it.estado}</strong>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="import-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={loading || !items.some(i => i.selected)}>
            <Check size={16} style={{ marginRight: '0.4rem', verticalAlign: '-3px' }}/>
            {loading ? 'Consultando...' : 'Confirmar Importación'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
