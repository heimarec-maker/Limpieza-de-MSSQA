import express from 'express'
import * as equipmentService from '../services/equipmentService.js'
import * as db from '../config/db.js'
import { login as authLogin } from '../controllers/authController.js'
import * as smwSoapService from '../services/smwSoapService.js'
import User from '../models/modelsUser.js'
import '../config/dbMongo.js' // asegurar conexión Mongo

const router = express.Router()

const CLEANING_ETAPAS = new Set(['BORRADO', 'SERV_ITEM', 'SERV_REQ'])
const CLEANING_WINDOW_MS = 15 * 60 * 1000

function mapResultadoActividad(resultado) {
  if (resultado === 'ÉXITO') return 'Éxito'
  if (resultado === 'INFO') return 'Info'
  if (resultado === 'NO_ENCONTRADO') return 'Advertencia'
  return 'Error'
}

function buildActividadDetalle({ serial_nbr, usuario, etapas }) {
  const parts = [
    `Serial: ${serial_nbr}`,
    `Usuario: ${usuario}`,
  ]

  const paso12 = etapas.BORRADO?.detalle || 'Procedimiento BORRADO_EQUIPOS ejecutado exitosamente.'
  parts.push(`Paso 1.2: ${paso12}`)

  if (etapas.SERV_ITEM) {
    parts.push(`Paso 1.3: ${etapas.SERV_ITEM.detalle}`)
  }

  if (etapas.SERV_REQ) {
    parts.push(`Paso 1.4: ${etapas.SERV_REQ.detalle}`)
  }

  return parts.join(' | ')
}

function buildActividadPasos({ etapas }) {
  const pasos = []

  if (etapas.BORRADO) {
    pasos.push({
      paso: '1.2',
      etiqueta: 'BORRADO',
      detalle: etapas.BORRADO.detalle || 'Procedimiento BORRADO_EQUIPOS ejecutado exitosamente.',
      resultado: etapas.BORRADO.resultado,
    })
  }

  if (etapas.SERV_ITEM) {
    pasos.push({
      paso: '1.3',
      etiqueta: 'SERV_ITEM',
      detalle: etapas.SERV_ITEM.detalle,
      resultado: etapas.SERV_ITEM.resultado,
    })
  }

  if (etapas.SERV_REQ) {
    pasos.push({
      paso: '1.4',
      etiqueta: 'SERV_REQ',
      detalle: etapas.SERV_REQ.detalle,
      resultado: etapas.SERV_REQ.resultado,
    })
  }

  return pasos
}

function agruparLogsLimpieza(logs = []) {
  const ordenados = [...logs].sort((a, b) => new Date(b.ejecutado_at) - new Date(a.ejecutado_at))
  const consumidos = new Set()
  const actividades = []

  const getLogId = (log) => log.log_id ?? `${log.serial_nbr}-${log.etapa}-${log.ejecutado_at}`

  for (let i = 0; i < ordenados.length; i++) {
    const log = ordenados[i]
    const logId = getLogId(log)

    if (consumidos.has(logId)) continue

    const esInicioLimpieza = log.etapa === 'BORRADO' && log.resultado === 'ÉXITO'

    if (esInicioLimpieza) {
      const etapas = { BORRADO: log }
      const tsInicio = new Date(log.ejecutado_at).getTime()

      // Buscar 1.3 (SERV_ITEM) y 1.4 (SERV_REQ) del mismo serial y usuario
      for (const candidato of ordenados) {
        const candidatoId = getLogId(candidato)
        if (candidatoId === logId) continue

        const mismoSerial = candidato.serial_nbr === log.serial_nbr
        const mismoUsuario = candidato.usuario === log.usuario
        const esServItem = candidato.etapa === 'SERV_ITEM'
        const esServReq = candidato.etapa === 'SERV_REQ'
        const tsCandidato = new Date(candidato.ejecutado_at).getTime()
        const dentroDeVentana = Math.abs(tsInicio - tsCandidato) <= CLEANING_WINDOW_MS

        if (mismoSerial && mismoUsuario && (esServItem || esServReq) && dentroDeVentana) {
          etapas[candidato.etapa] = candidato
          consumidos.add(candidatoId)
        }
      }

      consumidos.add(logId)
      actividades.push({
        id: `log-${logId}`,
        usuario: log.usuario,
        accion: 'Limpieza',
        modulo: 'Limpieza de Equipos',
        detalles: buildActividadDetalle({ serial_nbr: log.serial_nbr, usuario: log.usuario, etapas }),
        pasos: buildActividadPasos({ etapas }),
        resultado: 'Éxito',
        timestamp: log.ejecutado_at,
        serial_nbr: log.serial_nbr,
        etapa: 'BORRADO',
        _source: 'oracle',
      })
      continue
    }

    const esPasoSecundarioDeLimpieza = CLEANING_ETAPAS.has(log.etapa) && ordenados.some(base => {
      if (base.etapa !== 'BORRADO' || base.resultado !== 'ÉXITO') return false
      if (base.serial_nbr !== log.serial_nbr || base.usuario !== log.usuario) return false
      const baseTs = new Date(base.ejecutado_at).getTime()
      const logTs = new Date(log.ejecutado_at).getTime()
      return Math.abs(baseTs - logTs) <= CLEANING_WINDOW_MS
    })

    if (esPasoSecundarioDeLimpieza) {
      consumidos.add(logId)
      continue
    }

    consumidos.add(logId)
    const esConsulta = log.etapa === 'VALIDACION' || log.etapa === 'SMW_CONSULTA'
    actividades.push({
      id: `log-${logId}`,
      usuario: log.usuario,
      accion: esConsulta ? 'Consulta' : 'Limpieza',
      modulo: log.etapa?.startsWith('SMW_') ? 'Limpieza de SMW' : 'Limpieza de Equipos',
      detalles: `[${log.serial_nbr}] ${log.etapa} — ${log.detalle}`,
      resultado: mapResultadoActividad(log.resultado),
      timestamp: log.ejecutado_at,
      serial_nbr: log.serial_nbr,
      etapa: log.etapa,
      _source: 'oracle',
    })
  }

  return actividades
}

// NOTE: Removed the old hardcoded SYSTEM_USERS and USER_PASSWORDS to use LDAP + Mongo login

// ─── RUTAS DE EQUIPOS ────────────────────────────────────────────────────────

router.get('/equipos', async (_req, res) => {
  try {
    const equipos = await equipmentService.listarTodosEquipos()
    res.json({ ok: true, data: equipos })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener equipos de la DB.' })
  }
})

router.get('/equipos/:serial', async (req, res) => {
  const { serial } = req.params
  try {
    const equipo = await equipmentService.validarEquipo(serial.toUpperCase())
    if (!equipo) {
      return res.status(404).json({ ok: false, mensaje: `Serial "${serial}" no encontrado.` })
    }
    res.json({ ok: true, data: { ...equipo, estado_cpe: equipo.estado, serial_nbr: equipo.serial } })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al validar el equipo.' })
  }
})

router.post('/limpieza/:serial', async (req, res) => {
  const { serial } = req.params
  const { usuario, mac } = req.body
  const serialUp = serial.toUpperCase()

  try {
    if (!mac) return res.status(400).json({ ok: false, message: 'La MAC es obligatoria.' })

    const equipo = await equipmentService.validarEquipo(serialUp)
    if (!equipo) return res.status(404).json({ ok: false, message: `El equipo "${serial}" no existe.` })

    const estadoActual = (equipo.estado || '').toUpperCase()
    if (['LIBRE', 'DISPONIBLE', 'RETIRADO'].includes(estadoActual)) {
      return res.json({ ok: true, advertencia: true, message: `El equipo ya está en estado ${estadoActual}.` })
    }

    await equipmentService.ejecutarBorrado(serialUp, usuario)
    const filasItem = await equipmentService.limpiarServItem(serialUp, usuario)
    const filasReq = await equipmentService.limpiarServReq(serialUp, usuario)

    res.json({
      ok: true,
      message: `Equipo ${serial} limpiado correctamente.`,
      detalle: { serial: serialUp, mac, filasServItem: filasItem, filasServReq: filasReq }
    })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error en el proceso de limpieza.', error: err.message })
  }
})

// ─── ACTIVIDAD Y LOGS ────────────────────────────────────────────────────────

router.get('/actividad', async (_req, res) => {
  try {
    const logs = await db.getLogs()
    const actividades = agruparLogsLimpieza(logs || [])
    res.json({ ok: true, data: actividades })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener actividad.' })
  }
})

router.get('/limpieza/logs', async (_req, res) => {
  try {
    const logs = await db.getLogs()
    res.json({ ok: true, data: logs })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener logs.' })
  }
})

// ─── USUARIOS Y AUTH ─────────────────────────────────────────────────────────

router.get('/usuarios', async (_req, res) => {
  try {
    const usuarios = await User.find({}).sort({ createdAt: -1 }).lean()
    res.json({ ok: true, data: usuarios })
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener usuarios.' })
  }
})

// Use real login controller (LDAP + Mongo upsert)
router.post('/login', (req, res) => {
  // authLogin handles LDAP verification, upsert and session
  return authLogin(req, res)
})


// ─── RUTAS DE LIMPIEZA SMW (SOAP) ───────────────────────────────────────────

// ─── RUTAS DE LIMPIEZA SMW (SOAP) ───────────────────────────────────────────

/**
 * Consulta una dirección en SMW:
 * 1. Georreferencia para obtener CodigoDireccion
 * 2. Consulta RFS para obtener el listado y cantidad
 */
router.post('/smw/consultar', async (req, res) => {
  const { direccion, usuario = 'Sistema' } = req.body
  try {
    if (!direccion) return res.status(400).json({ ok: false, message: 'La dirección es obligatoria.' })

    // Step 1: Georef
    const codigoDireccion = await smwSoapService.georeferenciarDireccion(direccion)
    
    // Step 2: Rfs
    const { list: rfsList, mensaje } = await smwSoapService.consultarRfs(codigoDireccion)

    // Registrar Consulta en Log
    await db.registrarLog(
      codigoDireccion,
      usuario,
      'SMW_CONSULTA',
      'ÉXITO',
      `Consulta técnica de dirección SMW: ${direccion}`
    )

    res.json({
      ok: true,
      data: {
        direccion,
        codigoDireccion,
        cantidadRfs: rfsList.length,
        mensaje,
        rfsList
      }
    })
  } catch (err) {
    console.error('Error en /smw/consultar:', err.message)
    await db.registrarLog(
      'DIREC_ERR', 
      'Sistema', 
      'SMW_CONSULTA', 
      'ERROR', 
      `Fallo al consultar dirección [${direccion}]: ${err.message}`
    )
    res.status(500).json({ ok: false, message: err.message || 'Error al consultar SMW.' })
  }
})

/**
 * Realiza la limpieza en SMW
 */
router.post('/smw/limpiar', async (req, res) => {
  const { codigoDireccion, rfsList, usuario, direccion } = req.body
  try {
    if (!codigoDireccion || !rfsList) {
      return res.status(400).json({ ok: false, message: 'Datos insuficientes para la limpieza.' })
    }

    await smwSoapService.liberarRecursos(codigoDireccion, rfsList)

    // Registrar Log
    await db.registrarLog(
      codigoDireccion, 
      usuario || 'Sistema', 
      'SMW_LIMPIEZA', 
      'ÉXITO', 
      `Limpieza de recursos SMW exitosa. Dirección: ${direccion || 'N/A'}`
    )

    res.json({
      ok: true,
      message: 'Limpieza de recursos SMW completada exitosamente.'
    })
  } catch (err) {
    console.error('Error en /smw/limpiar:', err.message)
    // Registrar Error
    await db.registrarLog(
      codigoDireccion || 'ERR', 
      usuario || 'Sistema', 
      'SMW_LIMPIEZA', 
      'ERROR', 
      `Fallo: ${err.message}`
    )
    res.status(500).json({ ok: false, message: err.message || 'Error al realizar limpieza SMW.' })
  }
})

export default router
