import 'dotenv/config'
import oracledb from 'oracledb'
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
const dbConfig = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectString: process.env.DB_CONNECTION_STRING }
async function test() {
  let conn
  try {
    conn = await oracledb.getConnection(dbConfig)
    const res = await conn.execute("SELECT cv.ca_value_label, cv.ca_value FROM equip_ca_value cv JOIN equipment e ON e.equipment_id = cv.equipment_id WHERE e.serial_nbr = 'ZTEQA065JI5G'")
    res.rows.forEach(r => console.log(`${r.CA_VALUE_LABEL}: ${r.CA_VALUE}`))
  } catch (err) { console.error(err) }
  finally { if (conn) await conn.close() }
}
test()
