import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check } from 'lucide-react'
import { consultarEquipo } from '../services/limpiezaDbService'
import './ImportPreviewModal.css'

export default function ImportPreviewModal({ isOpen, fileSerials, onClose, onConfirm }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !fileSerials || fileSerials.length === 0) return

    // Inicializar el estado de los ítems a "cargando"
    const parsedItems = fileSerials.map(serial => ({
      serial,
      estado: 'Consultando...',
      color: 'var(--clr-muted)',
      loading: true,
      selected: true
    }))
    
    setItems(parsedItems)
    setLoading(true)

    // Consultar el estado en la base de datos de cada equipo (en lotes/chunks para soportar cantidades extremas)
    const cargarEstados = async () => {
      const results = []
      const chunkSize = 20 // Lotes de 20 en 20 para no saturar la BD ni el navegador

      for (let i = 0; i < parsedItems.length; i += chunkSize) {
        const chunk = parsedItems.slice(i, i + chunkSize)
        
        const chunkResults = await Promise.all(
          chunk.map(async (item) => {
            try {
              const res = await consultarEquipo(item.serial)
              let estadoFinal = 'Desconocido'
              let color = 'var(--clr-muted)'

              if (res.type === 'error') {
                estadoFinal = 'No Encontrado'
                color = '#ef4444' // Rojo
              } else if (res.data) {
                const est = (res.data.estado_cpe || res.data.estado_general || res.data.estado || 'Desconocido').toUpperCase()
                estadoFinal = est
                
                if (['LIBRE', 'DISPONIBLE', 'RETIRADO'].includes(est)) {
                  color = '#10b981' // Verde
                } else {
                  color = '#f59e0b' // Amarillo
                }
              }
              
              return {
                ...item,
                estado: estadoFinal,
                color,
                loading: false
              }
            } catch (error) {
              return { ...item, estado: 'Error de red', color: '#ef4444', loading: false }
            }
          })
        )
        results.push(...chunkResults)
        // Opcional: Actualizar el estado con lo que llevamos cargado para que el usuario vaya viendo avance
        setItems([...results, ...parsedItems.slice(i + chunkSize)])
      }
      
      setLoading(false)
    }

    cargarEstados()

  }, [isOpen, fileSerials])

  if (!isOpen) return null

  const toggleSelect = (index) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, selected: !it.selected } : it))
  }

  const handleConfirm = () => {
    const validSerials = items.filter(it => it.selected).map(it => it.serial)
    onConfirm(validSerials)
  }

  return createPortal(
    <div className="import-modal-overlay">
      <div className="import-modal-box glass-card">
        <div className="import-modal-header">
          <h3>Vista Previa de Importación</h3>
          <button className="import-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="import-modal-body">
          <p className="import-modal-desc">
            Se encontraron <strong>{items.length}</strong> serial(es). 
            Se ha consultado su estado actual en la base de datos:
          </p>
          
          <div className="import-modal-table-wrap">
            <table className="import-modal-table">
              <thead>
                <tr>
                  <th width="40" style={{ textAlign: 'center' }}>Incluir</th>
                  <th>Serial Extraído</th>
                  <th>Estado en BD</th>
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
                    <td><code>{it.serial}</code></td>
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
