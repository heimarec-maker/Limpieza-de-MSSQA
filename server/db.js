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
    if (!err.message.includes('ORA-00942')) {
      console.error('❌ Error en consulta SQL:', err.message)
    }
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
    // Squelch ORA-00942 in logs
    if (!err.message.includes('ORA-00942')) {
      console.error('❌ Error en ejecución SQL (Oracle):', err.message)
    }
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
 * Registra logs en Oracle. Si la tabla no existe (ORA-00942), loguea a consola.
 */
export async function registrarLog(serial, usuario, etapa, resultado, detalle) {
  try {
    await execute(`
      INSERT INTO limpieza_log (serial_nbr, usuario, etapa, resultado, detalle, ejecutado_at)
      VALUES (:serial, :usuario, :etapa, :resultado, :detalle, CURRENT_TIMESTAMP)
    `, { serial, usuario, etapa, resultado, detalle })
    console.log(`📝 Log registrado [${resultado}]: ${etapa} - ${serial}`)
  } catch (err) {
    // Si falla (ej: tabla no existe en Oracle), avisamos por consola
    console.log(`ℹ️ [Log Oracle No Disponible] ${usuario} - ${etapa} - ${serial}: ${resultado} (${detalle})`)
  }
}

/** Obtiene logs de Oracle */
export async function getLogs(serial = null) {
  try {
    if (serial) {
      return await query(`
        SELECT * FROM limpieza_log 
        WHERE serial_nbr = :serial 
        ORDER BY ejecutado_at DESC
      `, { serial })
    }
    return await query(`
      SELECT * FROM (
        SELECT * FROM limpieza_log ORDER BY ejecutado_at DESC
      ) WHERE ROWNUM <= 200
    `)
  } catch (err) {
    // Si falla (ej: tabla no existe), no rompemos pero logueamos
    if (!err.message.includes('ORA-00942')) {
      console.error('⚠️ Error al obtener logs de Oracle:', err.message)
    }
    return []
  }
}

