/**
 * server/db.js — Gestión de conexión a Oracle (Thin Mode)
 */
import oracledb from 'oracledb'
import 'dotenv/config'

// Configuración de oracledb para modo Thin (no requiere Instant Client)
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
oracledb.fetchAsString = [oracledb.CLOB]

const dbConfig = {
  user:          process.env.DB_USER,
  password:      process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
}

let pool = null

/** Inicializa el pool de conexiones */
export async function initDB() {
  try {
    pool = await oracledb.createPool(dbConfig)
    console.log('✅ Pool de conexiones a Oracle (ETB_PREQA / MSSLTED) iniciado.')
  } catch (err) {
    console.error('❌ Error al crear el pool de conexiones:', err.message)
    throw err
  }
}

/** Ejecuta una consulta (SELECT) */
export async function query(sql, params = {}) {
  let conn
  try {
    conn = await oracledb.getConnection()
    const result = await conn.execute(sql, params)
    
    // Normalizar claves a minúsculas para compatibilidad con el frontend
    if (result.rows && result.rows.length > 0) {
      return result.rows.map(row => {
        const normalized = {}
        for (const key in row) {
          normalized[key.toLowerCase()] = row[key]
        }
        return normalized
      })
    }
    return result.rows || []
  } catch (err) {
    console.error('❌ Error en consulta SQL:', err.message)
    throw err
  } finally {
    if (conn) {
      try { await conn.close() } catch (e) {}
    }
  }
}

/** Ejecuta una consulta que devuelve una sola fila */
export async function queryOne(sql, params = {}) {
  const rows = await query(sql, params)
  return rows.length > 0 ? rows[0] : null
}

/** Ejecuta una operación de escritura (INSERT/UPDATE/DELETE) con commit */
export async function execute(sql, params = {}) {
  let conn
  try {
    conn = await oracledb.getConnection()
    const result = await conn.execute(sql, params, { autoCommit: true })
    return result
  } catch (err) {
    console.error('❌ Error en ejecución SQL:', err.message)
    throw err
  } finally {
    if (conn) {
      try { await conn.close() } catch (e) {}
    }
  }
}

/** Ejecuta una transacción (varias sentencias) */
export async function executeTransaction(statements) {
  let conn
  try {
    conn = await oracledb.getConnection()
    for (const stmt of statements) {
      await conn.execute(stmt.sql, stmt.params || {})
    }
    await conn.commit()
  } catch (err) {
    if (conn) await conn.rollback()
    console.error('❌ Error en transacción:', err.message)
    throw err
  } finally {
    if (conn) {
      try { await conn.close() } catch (e) {}
    }
  }
}

/** 
 * En Oracle, registrarLog debe manejar el formato de fecha correctamente.
 * Si la tabla limpieza_log no existe en el esquema real, simplemente logueamos a consola.
 */
export async function registrarLog(serial, usuario, etapa, resultado, detalle) {
  try {
    await execute(`
      INSERT INTO limpieza_log (serial_nbr, usuario, etapa, resultado, detalle, ejecutado_at)
      VALUES (:serial, :usuario, :etapa, :resultado, :detalle, CURRENT_TIMESTAMP)
    `, { serial, usuario, etapa, resultado, detalle })
    console.log(`📝 Log registrado [${resultado}]: ${etapa} - ${serial}`)
  } catch (err) {
    // Si falla (ej: tabla no existe), no rompemos la ejecución pero avisamos
    console.log(`ℹ️ [Actividad] ${usuario} - ${etapa} - ${serial}: ${resultado} (${detalle})`)
  }
}
