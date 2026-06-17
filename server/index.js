/**
 * server/index.js — API REST de Limpieza de Equipos ETB
 * Puerto: 3001
 *
 * Endpoints:
 *   GET  /api/equipos              → Listar todos los equipos
 *   GET  /api/equipos/:serial      → OP1: Validar estado de un equipo
 *   POST /api/limpieza/:serial     → OP2+3+4: Proceso completo de limpieza
 *   GET  /api/limpieza/logs        → Historial de limpiezas
 *   GET  /api/limpieza/logs/:serial→ Historial de un serial específico
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import * as db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Inicializar base de datos
db.initDB().catch(err => {
  console.error('No se pudo iniciar la conexión a Oracle. El servidor podría fallar en las consultas.')
})

// ─────────────────────────────────────────────────────────────────────────────
// Funciones internas de BD
// ─────────────────────────────────────────────────────────────────────────────

/** OP 1 — Validar estado del equipo por serial (Paso 1.1 del manual) */
async function validarEquipo(serial) {
  // Siguiendo exactamente el Paso 1.1: SELECT ca_value AS ESTADO, serial_nbr AS SERIAL...
  return await db.queryOne(`
    SELECT 
      a.ca_value      AS estado, 
      b.serial_nbr    AS serial,
      b.equipment_id  AS equipment_id,
      b.brand         AS brand,
      b.model         AS model,
      b.tipo          AS tipo
    FROM   ASAP.equip_ca_value a, ASAP.equipment b
    WHERE  b.serial_nbr = :serial
    AND    a.ca_value_label = 'Estado CPE'
    AND    a.equipment_id = b.equipment_id
  `, { serial })
}

/** OP 2 — Borrado del equipo (Paso 1.2: procedimiento con ARRAY_EQUIPOS) */
async function ejecutarBorrado(serial, usuario) {
  console.log(`[Step 1.2] Ejecutando BORRADO_EQUIPOS para ${serial}...`)
  const plsql = `
    DECLARE
      VALORES ASAP.ARRAY_EQUIPOS := ASAP.ARRAY_EQUIPOS(:serial);
    BEGIN
      ASAP.BORRADO_EQUIPOS (VALORES);
    END;
  `;
  const start = Date.now()
  await db.execute(plsql, { serial })
  console.log(`[Step 1.2] Finalizado en ${Date.now() - start}ms`)
  await db.registrarLog(serial, usuario, 'BORRADO', 'ÉXITO', 'Paso 1.2: Procedimiento BORRADO_EQUIPOS ejecutado exitosamente.')
}

async function limpiarServItem(serial, usuario) {
  console.log(`[Step 1.3] Limpiando serv_item_value para ${serial}...`)
  const start = Date.now()
  const r = await db.execute(`
    UPDATE ASAP.serv_item_value
    SET    valid_value = valid_value || '*'
    WHERE  value_label = 'Serial' AND valid_value = :serial
  `, { serial })
  
  const changes = r.rowsAffected || 0
  console.log(`[Step 1.3] Finalizado. Filas: ${changes} (${Date.now() - start}ms)`)
  await db.registrarLog(serial, usuario, 'SERV_ITEM',
    changes > 0 ? 'ÉXITO' : 'NO_ENCONTRADO',
    `Paso 1.3: ${changes} fila(s) actualizadas en serv_item_value`)
  return changes
}

async function limpiarServReq(serial, usuario) {
  console.log(`[Step 1.4] Limpiando serv_req_si_value para ${serial}...`)
  const start = Date.now()
  const r = await db.execute(`
    UPDATE ASAP.serv_req_si_value
    SET    valid_value = valid_value || '*'
    WHERE  value_label = 'Serial' AND valid_value = :serial
  `, { serial })
  
  const changes = r.rowsAffected || 0
  console.log(`[Step 1.4] Finalizado. Filas: ${changes} (${Date.now() - start}ms)`)
  await db.registrarLog(serial, usuario, 'SERV_REQ',
    changes > 0 ? 'ÉXITO' : 'NO_ENCONTRADO',
    `Paso 1.4: ${changes} fila(s) actualizadas en serv_req_si_value`)
  return changes
}

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/equipos — Lista todos los equipos */
app.get('/api/equipos', async (_req, res) => {
  try {
    const equipos = await db.query(`
      SELECT
        e.equipment_id,
        e.serial_nbr,
        e.model,
        e.brand,
        e.tipo,
        e.estado AS estado_general,
        cv.ca_value AS estado_cpe
      FROM ASAP.equipment e
      LEFT JOIN ASAP.equip_ca_value cv
             ON cv.equipment_id  = e.equipment_id
            AND cv.ca_value_label = 'Estado CPE'
      ORDER BY e.equipment_id DESC
    `)
    res.json({ ok: true, data: equipos })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener equipos de la DB.' })
  }
})

/** GET /api/equipos/:serial — OP1: Validar estado de un equipo */
app.get('/api/equipos/:serial', async (req, res) => {
  const { serial } = req.params
  const serialUp = serial.toUpperCase()

  try {
    const mac = (req.query.mac || '').toUpperCase()
    const equipo = await validarEquipo(serialUp)

    if (!equipo) {
      return res.status(404).json({
        ok: false,
        mensaje: `Serial "${serial}" no encontrado en Oracle (ASAP).`
      })
    }

    // Normalizar para el frontend (la consulta ahora devuelve 'estado' y 'serial')
    const responseData = {
      ...equipo,
      estado_cpe: equipo.estado,
      serial_nbr: equipo.serial
    }

    res.json({ ok: true, data: responseData })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al validar el equipo.' })
  }
})

/** POST /api/limpieza/:serial — OP2+3+4: Proceso completo con Serial Y MAC */
app.post('/api/limpieza/:serial', async (req, res) => {
  const { serial } = req.params
  const { usuario, mac, timestamp } = req.body 
  const serialUp = serial.toUpperCase()
  const macUp = mac ? mac.toUpperCase() : null

  try {
    if (!macUp) {
      await db.registrarLog(serialUp, usuario, 'VALIDACION', 'ERROR', 'MAC no proporcionada para la limpieza')
      return res.status(400).json({
        ok: false,
        etapa: 'VALIDACION',
        message: `Para iniciar la limpieza, la MAC es obligatoria.`
      })
    }

    // ── OP 1: Validar (Paso 1.1) ──
    const equipo = await validarEquipo(serialUp)
    if (!equipo) {
      await db.registrarLog(serialUp, usuario, 'VALIDACION', 'NO_ENCONTRADO', `Serial ${serialUp} no encontrado en Oracle`)
      return res.status(404).json({
        ok: false,
        etapa: 'VALIDACION',
        message: `El equipo con serial "${serial}" no existe en el sistema.`
      })
    }

    const estadoActual = (equipo.estado || '').toUpperCase()
    if (['LIBRE', 'DISPONIBLE', 'RETIRADO'].includes(estadoActual)) {
      return res.json({
        ok: true,
        advertencia: true,
        message: `El equipo ${serialUp} ya se encuentra en estado ${estadoActual}. No requiere limpieza.`,
        equipo
      })
    }

    // ── OP 2: BORRADO_EQUIPOS ──
    await ejecutarBorrado(serialUp, usuario)

    // ── OP 3: serv_item_value ──
    const filasItem = await limpiarServItem(serialUp, usuario)

    // ── OP 4: serv_req_si_value ──
    const filasReq = await limpiarServReq(serialUp, usuario)

    res.json({
      ok: true,
      message: `Equipo ${serial} con MAC ${mac} limpiado y liberado correctamente.`,
      detalle: {
        serial: serialUp,
        mac: macUp,
        filasServItem: filasItem,
        filasServReq: filasReq,
      }
    })
  } catch (err) {
    console.error('❌ Error en proceso de limpieza:', err)
    res.status(500).json({ ok: false, message: 'Error fatal durante el proceso de limpieza.', error: err.message })
  }
})

/** GET /api/actividad — Registro de actividad unificado (para AdminPanel) */
app.get('/api/actividad', async (_req, res) => {
  try {
    const logs = await db.getLogs()

    const actividades = (logs || []).map(log => {
      let resultado
      if      (log.resultado === 'ÉXITO')        resultado = 'Éxito'
      else if (log.resultado === 'NO_ENCONTRADO')resultado = 'Advertencia'
      else                                        resultado = 'Error'

      const accion = log.etapa === 'VALIDACION' ? 'Consulta' : 'Limpieza'

      const etapaLabel = {
        BORRADO:    'Borrado de equipo',
        SERV_ITEM:  'Limpieza Serv. Item',
        SERV_REQ:   'Limpieza Serv. Req',
        VALIDACION: 'Validación de serial',
      }[log.etapa] || log.etapa

      return {
        id:        `log-${log.log_id || Math.random().toString(36).substr(2, 9)}`,
        usuario:   log.usuario,
        accion,
        modulo:    'Limpieza de Equipos',
        detalles:  `[${log.serial_nbr}] ${etapaLabel} — ${log.detalle}`,
        resultado,
        timestamp: log.ejecutado_at,
        _source:   'oracle',
        _etapa:    log.etapa,
        _serial:   log.serial_nbr,
      }
    })

    res.json({ ok: true, data: actividades })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener historial de actividad.' })
  }
})

/** GET /api/limpieza/logs — Historial completo de limpiezas */
app.get('/api/limpieza/logs', async (_req, res) => {
  try {
    const logs = await db.getLogs()
    res.json({ ok: true, data: logs })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener logs.' })
  }
})

/** GET /api/limpieza/logs/:serial — Historial de un serial específico */
app.get('/api/limpieza/logs/:serial', async (req, res) => {
  try {
    const logs = await db.getLogs(req.params.serial.toUpperCase())
    res.json({ ok: true, data: logs })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener logs del serial.' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// USUARIOS — Lista real de usuarios del sistema (mirror de authService)
// ─────────────────────────────────────────────────────────────────────────────

// Passwords almacenados del lado servidor (mirror de authService)
const USER_PASSWORDS = {
  '1': 'Admin123*',
  '2': 'Heimar123*',
  '3': 'Vanessa123*',
}

let SYSTEM_USERS = [
  {
    id: '1',
    username: 'admin',
    name: 'Admin ETB',
    email: 'admin@etb.com.co',
    role: 'Administrador',
    department: 'Operaciones',
    cargo: 'Administrador ETB',
    status: 'Activo',
  },
  {
    id: '2',
    username: 'heimar',
    name: 'Heimar',
    email: 'heimar@etb.com.co',
    role: 'Operador',
    department: 'Operaciones',
    cargo: 'Técnico ETB',
    status: 'Activo',
  },
  {
    id: '3',
    username: 'vanessa',
    name: 'Vanessa',
    email: 'vanessa@etb.com.co',
    role: 'Administrador',
    department: 'Operaciones',
    cargo: 'Administradora ETB',
    status: 'Activo',
  },
]

/** GET /api/usuarios — Lista real de usuarios del sistema con último acceso */
app.get('/api/usuarios', async (_req, res) => {
  try {
    // Intentar obtener el último acceso de cada usuario desde los logs de limpieza
    let lastLoginMap = {}
    try {
      const lastLogins = await db.query(`
        SELECT usuario, MAX(ejecutado_at) as last_login
        FROM   limpieza_log
        GROUP  BY usuario
      `)
      lastLogins.forEach(row => {
        lastLoginMap[row.usuario.toLowerCase()] = row.last_login
      })
    } catch (dbErr) {
      // Si Oracle no está disponible o la tabla no existe, seguimos sin datos de último acceso
      console.log('ℹ️ No se pudo obtener último acceso de usuarios (Oracle no disponible):', dbErr.message)
    }

    const usuarios = SYSTEM_USERS.map(u => {
      const lastLogin = lastLoginMap[u.username.toLowerCase()] || null
      return {
        ...u,
        avatar: u.name.charAt(0).toUpperCase(),
        lastLogin: lastLogin ? formatRelativeTime(lastLogin) : 'Sin actividad',
        lastLoginRaw: lastLogin,
      }
    })

    res.json({ ok: true, data: usuarios })
  } catch (err) {
    console.error('❌ Error en /api/usuarios:', err.message)
    res.status(500).json({ ok: false, message: 'Error al obtener usuarios.' })
  }
})

/** POST /api/login — Autenticación real del lado servidor */
app.post('/api/login', (req, res) => {
  const { identifier, password } = req.body

  if (!identifier || !password) {
    return res.status(400).json({
      ok: false,
      message: 'El usuario/correo y la contraseña son obligatorios.',
    })
  }

  // Buscar usuario por email o username
  const user = SYSTEM_USERS.find(
    u => u.email === identifier || u.username === identifier
  )

  if (!user) {
    return res.status(401).json({
      ok: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciales incorrectas. Verifica tu usuario y contraseña.',
    })
  }

  // Verificar contraseña
  const storedPassword = USER_PASSWORDS[user.id]
  if (!storedPassword || storedPassword !== password) {
    return res.status(401).json({
      ok: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciales incorrectas. Verifica tu usuario y contraseña.',
    })
  }

  // Verificar estado activo
  if (user.status === 'Inactivo') {
    return res.status(403).json({
      ok: false,
      code: 'USER_INACTIVE',
      message: 'Tu cuenta ha sido desactivada. Contacta al administrador para reactivarla.',
    })
  }

  // Login exitoso — devolver usuario sin password
  const { ...safeUser } = user
  res.json({
    ok: true,
    user: {
      ...safeUser,
      role: user.role === 'Administrador' ? 'admin' : 'user',
    },
  })
})

/** PATCH /api/usuarios/:id/toggle — Activar/Desactivar usuario */
app.patch('/api/usuarios/:id/toggle', (req, res) => {
  const { id } = req.params
  const user = SYSTEM_USERS.find(u => u.id === id)

  if (!user) {
    return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
  }

  user.status = user.status === 'Activo' ? 'Inactivo' : 'Activo'

  res.json({ ok: true, data: user })
})

/** PUT /api/usuarios/:id — Actualizar datos de usuario */
app.put('/api/usuarios/:id', (req, res) => {
  const { id } = req.params
  const userIndex = SYSTEM_USERS.findIndex(u => u.id === id)

  if (userIndex === -1) {
    return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
  }

  const { name, email, role, status, department } = req.body
  SYSTEM_USERS[userIndex] = { ...SYSTEM_USERS[userIndex], name, email, role, status, department }

  res.json({ ok: true, data: SYSTEM_USERS[userIndex] })
})

/** Formatea una fecha ISO a tiempo relativo en español */
function formatRelativeTime(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Hace un momento'
  if (diffMin < 60) return `Hace ${diffMin} min`
  if (diffHrs < 24) return `Hace ${diffHrs} hora${diffHrs > 1 ? 's' : ''}`
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`
  return `Hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Inicio del servidor
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 API de Limpieza ETB corriendo en http://localhost:${PORT}`)
  console.log(`   📦 Oracle: ${process.env.DB_CONNECTION_STRING}`)
  console.log(`   Endpoints disponibles:`)
  console.log(`     GET  /api/equipos`)
  console.log(`     GET  /api/equipos/:serial?mac=...`) // Actualizado para incluir MAC
  console.log(`     POST /api/limpieza/:serial { usuario, mac }`) // Actualizado para incluir MAC
  console.log(`     GET  /api/limpieza/logs`)
  console.log(`     GET  /api/limpieza/logs/:serial`)
  console.log(`     GET  /api/actividad          ← nuevo: actividad unificada\n`)
})

setInterval(() => {}, 1000 * 60 * 60); // Keep event loop alive
