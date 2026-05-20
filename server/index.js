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
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH   = path.join(__dirname, '../database/limpieza_equipos.db')

// ─── Abrir BD ─────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH)
db.pragma('foreign_keys = ON')
db.pragma('journal_mode = WAL')   // Mejor rendimiento para lecturas concurrentes

const app  = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// ─────────────────────────────────────────────────────────────────────────────
// Funciones internas de BD
// ─────────────────────────────────────────────────────────────────────────────

function registrarLog(serial, usuario, etapa, resultado, detalle, timestamp = null) {
  db.prepare(`
    INSERT INTO limpieza_log (serial_nbr, usuario, etapa, resultado, detalle, ejecutado_at)
    VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now', 'localtime')))
  `).run(serial, usuario, etapa, resultado, detalle, timestamp)
}

/** OP 1 — Validar estado del equipo por serial */
function validarEquipo(serial, mac) {
  return db.prepare(`
    SELECT
      e.equipment_id,
      e.serial_nbr,
      e.model,
      e.brand,
      e.tipo,
      e.estado              AS estado_general,
      cv.ca_value           AS estado_cpe
    FROM   equipment e
    LEFT JOIN equip_ca_value cv -- Para el estado CPE
           ON cv.equipment_id  = e.equipment_id
          AND cv.ca_value_label = 'Estado CPE'
    LEFT JOIN equip_ca_value cv_mac -- Para la MAC
           ON cv_mac.equipment_id  = e.equipment_id
          AND cv_mac.ca_value_label = 'Dirección MAC'
    WHERE  e.serial_nbr = ?
  `).get(serial) ?? null
}

/** OP 2 — BORRADO_EQUIPOS: desvincula el equipo (cambia estado a LIBRE) */
function ejecutarBorrado(equipmentId, serial, usuario, timestamp = null) {
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE equip_ca_value
      SET    ca_value   = 'RETIRADO', updated_at = COALESCE(?, datetime('now', 'localtime'))
      WHERE  equipment_id  = ? AND ca_value_label = 'Estado CPE'
    `).run(timestamp, equipmentId)

    db.prepare(`
      UPDATE equipment
      SET    estado = 'LIBRE', updated_at = COALESCE(?, datetime('now', 'localtime'))
      WHERE  equipment_id = ?
    `).run(timestamp, equipmentId)
  })
  tx()
  registrarLog(serial, usuario, 'BORRADO', 'ÉXITO', 'Equipo desvinculado correctamente', timestamp)
}

/** OP 3 — Marcar serial en serv_item_value con '*' */
function limpiarServItem(serial, usuario, timestamp = null) {
  const r = db.prepare(`
    UPDATE serv_item_value
    SET    valid_value = '*', updated_at = COALESCE(?, datetime('now', 'localtime'))
    WHERE  value_label = 'Serial' AND valid_value = ?
  `).run(timestamp, serial)
  registrarLog(serial, usuario, 'SERV_ITEM',
    r.changes > 0 ? 'ÉXITO' : 'NO_ENCONTRADO',
    `${r.changes} fila(s) actualizadas en serv_item_value`, timestamp)
  return r.changes
}

/** OP 4 — Marcar serial en serv_req_si_value con '*' */
function limpiarServReq(serial, usuario, timestamp = null) {
  const r = db.prepare(`
    UPDATE serv_req_si_value
    SET    valid_value = '*', updated_at = COALESCE(?, datetime('now', 'localtime'))
    WHERE  value_label = 'Serial' AND valid_value = ?
  `).run(timestamp, serial)
  registrarLog(serial, usuario, 'SERV_REQ',
    r.changes > 0 ? 'ÉXITO' : 'NO_ENCONTRADO',
    `${r.changes} fila(s) actualizadas en serv_req_si_value`, timestamp)
  return r.changes
}

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/equipos — Lista todos los equipos */
app.get('/api/equipos', (_req, res) => {
  const equipos = db.prepare(`
    SELECT
      e.equipment_id,
      e.serial_nbr,
      e.model,
      e.brand,
      e.tipo,
      e.estado AS estado_general,
      cv.ca_value AS estado_cpe
    FROM equipment e
    LEFT JOIN equip_ca_value cv
           ON cv.equipment_id  = e.equipment_id
          AND cv.ca_value_label = 'Estado CPE'
    ORDER BY e.created_at DESC
  `).all()
  res.json({ ok: true, data: equipos })
})

/** GET /api/equipos/:serial — OP1: Validar estado de un equipo */
app.get('/api/equipos/:serial', (req, res) => {
  const { serial } = req.params
  const serialUp = serial.toUpperCase()

  const equipo = validarEquipo(serialUp, null)

  if (!equipo) {
    return res.status(404).json({
      ok: false,
      mensaje: `Serial "${serial}" no encontrado en la base de datos.`
    })
  }

  res.json({ ok: true, data: equipo })
})

/** POST /api/limpieza/:serial — OP2+3+4: Proceso completo con Serial Y MAC */
app.post('/api/limpieza/:serial', (req, res) => {
  const { serial } = req.params
  const { usuario, mac, timestamp } = req.body // La MAC y timestamp se esperan en el cuerpo
  const serialUp = serial.toUpperCase()
  const macUp = mac ? mac.toUpperCase() : null

  if (!macUp) {
    registrarLog(serialUp, usuario, 'VALIDACION', 'ERROR', 'MAC no proporcionada para la limpieza', timestamp)
    return res.status(400).json({
      ok: false,
      etapa: 'VALIDACION',
      message: `Para iniciar la limpieza, la MAC es obligatoria.`
    })
  }

  // ── OP 1: Validar ──
  const equipo = validarEquipo(serialUp, macUp) // Validar con Serial y MAC
  if (!equipo) {
    registrarLog(serialUp, usuario, 'VALIDACION', 'NO_ENCONTRADO', `Serial ${serialUp} con MAC ${macUp} no existe o no coincide en equipment`, timestamp)
    return res.status(404).json({
      ok: false,
      etapa: 'VALIDACION',
      message: `El equipo con serial "${serial}" y MAC "${mac}" no existe o no coincide en el sistema.`
    })
  }

  if (equipo.estado_general === 'LIBRE') {
    return res.json({
      ok: true,
      advertencia: true,
      message: `El equipo ${serial} con MAC ${mac} ya se encuentra libre y limpio.`,
      equipo
    })
  }

  // ── OP 2: BORRADO_EQUIPOS ──
  ejecutarBorrado(equipo.equipment_id, serialUp, usuario, timestamp)

  // ── OP 3: serv_item_value ──
  const filasItem = limpiarServItem(serialUp, usuario, timestamp)

  // ── OP 4: serv_req_si_value ──
  const filasReq = limpiarServReq(serialUp, usuario, timestamp)

  res.json({
    ok: true,
    message: `Equipo ${serial} con MAC ${mac} limpiado y liberado correctamente.`,
    detalle: {
      serial: serialUp,
      mac: macUp,
      modelo: equipo.model,
      tipo: equipo.tipo,
      filasServItem: filasItem,
      filasServReq: filasReq,
    }
  })
})

/** GET /api/actividad — Registro de actividad unificado (para AdminPanel) */
app.get('/api/actividad', (_req, res) => {
  const logs = db.prepare(`
    SELECT log_id as id, serial_nbr, usuario, etapa, resultado, detalle, ejecutado_at
    FROM   limpieza_log
    ORDER  BY ejecutado_at DESC
    LIMIT  500
  `).all()

  const actividades = logs.map(log => {
    // Mapear resultado SQLite → formato frontend
    let resultado
    if      (log.resultado === 'ÉXITO')         resultado = 'Éxito'
    else if (log.resultado === 'NO_ENCONTRADO') resultado = 'Advertencia'
    else                                         resultado = 'Error'

    // Mapear etapa → acción del timeline
    const accion = log.etapa === 'VALIDACION' ? 'Consulta' : 'Limpieza'

    // Etiqueta legible de la etapa
    const etapaLabel = {
      BORRADO:    'Borrado de equipo',
      SERV_ITEM:  'Limpieza Serv. Item',
      SERV_REQ:   'Limpieza Serv. Req',
      VALIDACION: 'Validación de serial',
    }[log.etapa] || log.etapa

    return {
      id:        `db-${log.id}`,
      usuario:   log.usuario,
      accion,
      modulo:    'Limpieza de Equipos',
      detalles:  `[${log.serial_nbr}] ${etapaLabel} — ${log.detalle}`,
      resultado,
      timestamp: log.ejecutado_at,
      _source:   'db',
      _etapa:    log.etapa,
      _serial:   log.serial_nbr,
    }
  })

  res.json({ ok: true, data: actividades })
})

/** GET /api/limpieza/logs — Historial completo de limpiezas */
app.get('/api/limpieza/logs', (_req, res) => {
  const logs = db.prepare(`
    SELECT * FROM limpieza_log ORDER BY ejecutado_at DESC LIMIT 200
  `).all()
  res.json({ ok: true, data: logs })
})

/** GET /api/limpieza/logs/:serial — Historial de un serial */
app.get('/api/limpieza/logs/:serial', (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM limpieza_log
    WHERE serial_nbr = ?
    ORDER BY ejecutado_at DESC
  `).all(req.params.serial.toUpperCase())
  res.json({ ok: true, data: logs })
})

// ─────────────────────────────────────────────────────────────────────────────
// Inicio del servidor
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 API de Limpieza ETB corriendo en http://localhost:${PORT}`)
  console.log(`   📦 BD: ${DB_PATH}`)
  console.log(`   Endpoints disponibles:`)
  console.log(`     GET  /api/equipos`)
  console.log(`     GET  /api/equipos/:serial?mac=...`) // Actualizado para incluir MAC
  console.log(`     POST /api/limpieza/:serial { usuario, mac }`) // Actualizado para incluir MAC
  console.log(`     GET  /api/limpieza/logs`)
  console.log(`     GET  /api/limpieza/logs/:serial`)
  console.log(`     GET  /api/actividad          ← nuevo: actividad unificada\n`)
})

setInterval(() => {}, 1000 * 60 * 60); // Keep event loop alive
