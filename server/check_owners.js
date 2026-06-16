import 'dotenv/config'
import oracledb from 'oracledb'
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
const dbConfig = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectString: process.env.DB_CONNECTION_STRING }
async function test() {
  let conn
  try {
    conn = await oracledb.getConnection(dbConfig)
    console.log('--- BUSCANDO TABLAS ---')
    const sql = "SELECT owner, table_name FROM all_tables WHERE table_name IN ('EQUIPMENT', 'SERV_ITEM_VALUE', 'SERV_REQ_SI_VALUE', 'EQUIP_CA_VALUE')"
    const res = await conn.execute(sql)
    console.table(res.rows)
  } catch (err) { console.error(err) }
  finally { if (conn) await conn.close() }
}
test()
