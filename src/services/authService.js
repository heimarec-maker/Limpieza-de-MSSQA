/**
 * Servicio de autenticación — conecta con el backend real (server/index.js)
 */

const API_BASE = 'http://localhost:3001'

// ─── Login ────────────────────────────────────────────────────────────────────
/**
 * Autentica al usuario contra el backend.
 * El backend verifica credenciales Y estado activo/inactivo.
 * @param {string} identifier - Email o username.
 * @param {string} password
 * @returns {{ user: object }}
 */
export const loginBackend = async (identifier, password) => {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })

  const data = await res.json()

  if (!res.ok) {
    // Lanzar error con un campo 'code' para que el frontend pueda distinguir
    const err = new Error(data.message || 'Error al conectar con el servidor.')
    err.code = data.code || 'UNKNOWN'
    throw err
  }

  return { user: data.user }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logoutBackend = async () => {
  // Nada que hacer por ahora
}
