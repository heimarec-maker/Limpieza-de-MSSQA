import 'dotenv/config'
import oracledb from 'oracledb'
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
const dbConfig = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectString: process.env.DB_CONNECTION_STRING }

async function inspect() {
  let conn
  try {
    conn = await oracledb.getConnection(dbConfig)
    const serial = 'ZTEQA065JI5G'
    console.log(`Buscando atributos para el serial: ${serial}`)
    
    const sql = `
      SELECT cv.ca_value_label, cv.ca_value
      FROM   equip_ca_value cv
      JOIN   equipment e ON e.equipment_id = cv.equipment_id
      WHERE  e.serial_nbr = :serial
    `
    const result = await conn.execute(sql, { serial })
    console.log('📊 Atributos encontrados en equip_ca_value:')
    console.table(result.rows)

  } catch (err) { console.error(err) }
  finally { if (conn) await conn.close() }
}
inspect()
