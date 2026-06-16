import 'dotenv/config'
import oracledb from 'oracledb'

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const dbConfig = {
  user:          process.env.DB_USER,
  password:      process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
}

async function inspectSchema() {
  let conn
  try {
    conn = await oracledb.getConnection(dbConfig)
    console.log('✅ Conexión exitosa para inspección.')

    const sql = `
      SELECT column_name, data_type 
      FROM all_tab_columns 
      WHERE table_name = 'EQUIPMENT'
      ORDER BY column_id
    `

    const result = await conn.execute(sql)
    console.log('📊 Columnas de la tabla EQUIPMENT:')
    console.table(result.rows)

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    if (conn) {
      try { await conn.close() } catch (e) {}
    }
  }
}

inspectSchema()
