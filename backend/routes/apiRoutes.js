import express from 'express'
import * as equipmentService from '../services/equipmentService.js'
import * as db from '../config/db.js'
import { login as authLogin } from '../controllers/authController.js'
import * as smwSoapService from '../services/smwSoapService.js'
import User from '../models/modelsUser.js'
import '../config/dbMongo.js' // asegurar conexión Mongo

const router = express.Router()

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
  const { usuario, mac = '', esMasivo = false } = req.body
  const serialUp = serial.toUpperCase()

  try {

    const equipo = await equipmentService.validarEquipo(serialUp)
    if (!equipo) return res.status(404).json({ ok: false, message: `El equipo "${serial}" no existe.` })

    const estadoActual = (equipo.estado || '').toUpperCase()
    if (['LIBRE', 'DISPONIBLE', 'RETIRADO'].includes(estadoActual)) {
      return res.json({ ok: true, advertencia: true, message: `El equipo ya está en estado ${estadoActual}.` })
    }

    await equipmentService.ejecutarBorrado(serialUp, usuario, esMasivo)
    const filasItem = await equipmentService.limpiarServItem(serialUp, usuario, esMasivo)
    const filasReq = await equipmentService.limpiarServReq(serialUp, usuario, esMasivo)

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
    const actividades = (logs || []).map(log => {
      let resultado = log.resultado === 'ÉXITO' ? 'Éxito' : log.resultado === 'NO_ENCONTRADO' ? 'Advertencia' : 'Error'
      
      // Sanitizar etapa y saber si es masivo
      const etapaStr = log.etapa || ''
      const esMasivo = etapaStr.includes('MASIVO') || etapaStr.includes('MASIVA')
      const esIndividual = etapaStr.includes('INDIVIDUAL')
      
      const tipoOperacion = esMasivo ? ' (Masiva)' : (esIndividual ? ' (Individual)' : '')

      // Determinar módulo y acción según la etapa
      let modulo = 'Limpieza de Equipos' + tipoOperacion
      let accion = 'Limpieza'
      
      if (etapaStr.startsWith('SMW_')) {
        modulo = 'Limpieza de SMW' + tipoOperacion
      }
      
      if (etapaStr === 'VALIDACION' || etapaStr.includes('CONSULTA')) {
        accion = 'Consulta'
      }

      return {
        id: `log-${log.log_id || Math.random()}`,
        usuario: log.usuario,
        accion,
        modulo,
        detalles: `[${log.serial_nbr}] ${log.etapa} — ${log.detalle}`,
        resultado,
        timestamp: log.ejecutado_at,
      }
    })
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
  const { direccion, usuario, esMasivo = false } = req.body
  const usuarioReal = usuario || 'Sistema'
  const tipo = esMasivo ? '_MASIVA' : '_INDIVIDUAL'
  try {
    if (!direccion) return res.status(400).json({ ok: false, message: 'La dirección es obligatoria.' })

    // Step 1: Georef
    const codigoDireccion = await smwSoapService.georeferenciarDireccion(direccion)
    
    // Step 2: Rfs
    const { list: rfsList, mensaje } = await smwSoapService.consultarRfs(codigoDireccion)

    // Registrar Consulta en Log
    const estadoRfs = rfsList.length > 0
      ? `${rfsList.length} RFS encontrado(s)`
      : 'Sin RFS — dirección limpia'
    await db.registrarLog(
      codigoDireccion,
      usuarioReal,
      'SMW_CONSULTA' + tipo,
      rfsList.length > 0 ? 'ÉXITO' : 'INFO',
      `[SMW] Consulta dirección: "${direccion}" → ${estadoRfs}`
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
      usuarioReal,
      'SMW_CONSULTA' + tipo,
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
  const { codigoDireccion, rfsList, usuario, direccion, esMasivo = false } = req.body
  const tipo = esMasivo ? '_MASIVA' : '_INDIVIDUAL'
  try {
    if (!codigoDireccion || !rfsList) {
      return res.status(400).json({ ok: false, message: 'Datos insuficientes para la limpieza.' })
    }

    await smwSoapService.liberarRecursos(codigoDireccion, rfsList)

    // Registrar Log
    await db.registrarLog(
      codigoDireccion, 
      usuario || 'Sistema', 
      'SMW_LIMPIEZA' + tipo, 
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
      'SMW_LIMPIEZA' + tipo,
      'ERROR',
      `Fallo en limpieza SMW [${direccion || 'N/A'}]: ${err.message}`
    )
    res.status(500).json({ ok: false, message: err.message || 'Error al realizar limpieza SMW.' })
  }
})

export default router
