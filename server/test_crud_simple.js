import oracledb from 'oracledb'
import 'dotenv/config'

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
}

async function testCrud() {
  let conn
  try {
    conn = await oracledb.getConnection(dbConfig)
    console.log('CRUD TEST FOR USER: ' + dbConfig.user)
    
    const tables = ['EQUIPMENT', 'EQUIP_CA_VALUE', 'SERV_ITEM_VALUE', 'SERV_REQ_SI_VALUE']
    
    for (const table of tables) {
      console.log('--- TABLE: ASAP.' + table + ' ---')
      
      // SELECT
      try {
        const res = await conn.execute(`SELECT COUNT(*) as TOTAL FROM ASAP.${table}`)
        console.log('SELECT: OK (Rows: ' + res.rows[0].TOTAL + ')')
      } catch (e) { console.log('SELECT: FAIL - ' + e.message) }

      // UPDATE test (dummy)
      try {
        await conn.execute(`UPDATE ASAP.${table} SET ${table.includes('EQUIP') ? 'EQUIPMENT_ID' : 'VALUE_LABEL'} = ${table.includes('EQUIP') ? 'EQUIPMENT_ID' : 'VALUE_LABEL'} WHERE 1=0`, {}, { autoCommit: false })
        console.log('UPDATE: OK (Permitted)')
      } catch (e) { console.log('UPDATE: FAIL - ' + e.message) }

      // DELETE test (dummy)
      try {
        await conn.execute(`DELETE FROM ASAP.${table} WHERE 1=0`, {}, { autoCommit: false })
        console.log('DELETE: OK (Permitted)')
      } catch (e) { console.log('DELETE: FAIL - ' + e.message) }
    }
    // Check Procedures
    console.log('\n--- PROCEDURES & TYPES ---')
    const objects = await conn.execute(`SELECT OBJECT_NAME, OBJECT_TYPE, STATUS FROM ALL_OBJECTS WHERE OWNER = 'ASAP' AND OBJECT_NAME IN ('BORRADO_EQUIPOS', 'ARRAY_EQUIPOS')`)
    objects.rows.forEach(obj => {
      console.log(`${obj.OBJECT_NAME}: ${obj.OBJECT_TYPE} (${obj.STATUS})`)
    })

  } catch (err) {
    console.error('CONNECTION ERROR: ', err.message)
  } finally {
    if (conn) await conn.close()
    process.exit(0)
  }
}

testCrud()
