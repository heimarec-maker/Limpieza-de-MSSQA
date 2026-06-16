/**
 * limpiezaDbService.js
 * Servicio frontend que consume la API REST del servidor de Limpieza de Equipos.
 * Todas las llamadas van a /api/* (proxiado por Vite → http://localhost:3001)
 */

const API = '/api'

// ─── OP 1: Consultar estado de un equipo por serial ──────────────────────────
export async function consultarEquipo(serial, mac = '') {
  const url = `${API}/equipos/${encodeURIComponent(serial.toUpperCase())}?mac=${encodeURIComponent(mac.toUpperCase())}`
  const res = await fetch(url)
  const json = await res.json()

  if (!res.ok) {
    // 404 → equipo no encontrado
    return { type: 'error', message: json.mensaje, data: null }
  }

  const eq = json.data
  const estado = eq.estado_cpe || eq.estado_general || 'DESCONOCIDO'

  if (estado === 'LIBRE' || estado === 'RETIRADO') {
    return {
      type: 'success',
      message: `Estado del equipo: Disponible (${eq.modelo || eq.model || eq.tipo}). El equipo se encuentra limpio y liberado.`,
      data: eq,
    }
  }

  return {
    type: 'warning',
    message: `Estado del equipo: ${estado} — ${eq.model || eq.tipo} (${eq.brand}). Requiere limpieza para ser liberado.`,
    data: eq,
  }
}

// ─── OP 2+3+4: Ejecutar limpieza completa ────────────────────────────────────
export async function ejecutarLimpieza(serial, mac, usuario = 'Sistema') {
  const timestamp = new Date().toISOString();

  const res = await fetch(
    `${API}/limpieza/${encodeURIComponent(serial.toUpperCase())}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, mac, timestamp }),
    }
  )

  const json = await res.json()

  if (!res.ok) {
    return { type: 'error', message: json.message || json.mensaje }
  }

  if (json.advertencia) {
    return { type: 'warning', message: json.message || json.mensaje }
  }

  return {
    type: 'success',
    message: json.message || json.mensaje,
    detalle: json.detalle,
  }
}

// ─── Listar todos los equipos ─────────────────────────────────────────────────
export async function listarEquipos() {
  const res  = await fetch(`${API}/equipos`)
  const json = await res.json()
  return json.ok ? json.data : []
}

// ─── Historial de limpiezas ───────────────────────────────────────────────────
export async function getLogs(serial = null) {
  const url = serial
    ? `${API}/limpieza/logs/${encodeURIComponent(serial.toUpperCase())}`
    : `${API}/limpieza/logs`
  const res  = await fetch(url)
  const json = await res.json()
  return json.ok ? json.data : []
}

// ─── Actividad unificada para AdminPanel ─────────────────────────────────────
/**
 * Obtiene registros de actividad desde la BD SQLite (limpieza_log),
 * ya mapeados al formato que espera AdminPanel:
 * { id, usuario, accion, modulo, detalles, resultado, timestamp }
 */
export async function getDBActivityLogs() {
  try {
    const res  = await fetch(`${API}/actividad`)
    const json = await res.json()
    return json.ok ? json.data : []
  } catch {
    return []
  }
}
