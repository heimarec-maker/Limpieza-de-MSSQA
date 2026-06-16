import 'dotenv/config'
import oracledb from 'oracledb'
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
const dbConfig = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectString: process.env.DB_CONNECTION_STRING }
async function test() {
  let conn
  try {
    conn = await oracledb.getConnection(dbConfig)
    const res = await conn.execute("SELECT column_name FROM all_tab_columns WHERE table_name = 'EQUIPMENT' ORDER BY column_id")
    console.log('COLUMNS_START')
    res.rows.forEach(r => console.log(r.COLUMN_NAME))
    console.log('COLUMNS_END')
  } catch (err) { console.error(err) }
  finally { if (conn) await conn.close() }
}
test()
