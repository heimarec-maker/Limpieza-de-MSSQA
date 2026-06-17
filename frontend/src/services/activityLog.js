/**
 * Servicio de registro de actividad (Activity Log)
 * Guarda las acciones en localStorage.
 */

const LOCAL_KEY = 'etb_activity_log'

// ─── Obtener todos los logs ───────────────────────────────────────────────────
/**
 * Obtiene todos los registros de actividad desde localStorage.
 * @returns {Array} Lista ordenada por fecha descendente.
 */
export function getActivityLogs() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const logs = raw ? JSON.parse(raw) : []
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  } catch {
    return []
  }
}

// ─── Agregar un nuevo log ─────────────────────────────────────────────────────
/**
 * Agrega un nuevo registro de actividad en localStorage.
 * @param {Object} entry
 * @param {string} entry.usuario   - Nombre del usuario.
 * @param {string} entry.accion    - 'Limpieza' | 'Creación' | 'Consulta'.
 * @param {string} entry.modulo    - Módulo donde ocurrió.
 * @param {string} entry.detalles  - Detalles libres.
 * @param {string} entry.resultado - 'Éxito' | 'Error' | 'Advertencia' | 'Info'.
 * @returns {Object} El registro creado.
 */
export function addActivityLog({ usuario, accion, modulo, detalles, resultado }) {
  const logs = getActivityLogs()

  const newEntry = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    usuario,
    accion,
    modulo,
    detalles,
    resultado,
    timestamp: new Date().toISOString(),
  }

  logs.unshift(newEntry)
  localStorage.setItem(LOCAL_KEY, JSON.stringify(logs.slice(0, 500)))
  window.dispatchEvent(new CustomEvent('activityLogUpdated'))

  return newEntry
}

// ─── Limpiar todos los logs ───────────────────────────────────────────────────
/**
 * Elimina todos los registros de actividad.
 */
export function clearActivityLogs() {
  localStorage.removeItem(LOCAL_KEY)
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────
/**
 * Obtiene estadísticas resumidas de los registros.
 * @returns {Object} { total, limpiezas, creaciones, consultas, errores, usuarios }
 */
export function getActivityStats() {
  const logs = getActivityLogs()
  const usuarios = new Set(logs.map(l => l.usuario))

  return {
    total: logs.length,
    limpiezas: logs.filter(l => l.accion === 'Limpieza').length,
    creaciones: logs.filter(l => l.accion === 'Creación').length,
    consultas: logs.filter(l => l.accion === 'Consulta').length,
    errores: logs.filter(l => l.resultado === 'Error').length,
    exitosos: logs.filter(l => l.resultado === 'Éxito').length,
    usuarios: usuarios.size,
    listaUsuarios: [...usuarios],
  }
}
