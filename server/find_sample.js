import oracledb from 'oracledb'
import 'dotenv/config'

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
}

async function findSample() {
  let conn
  try {
    conn = await oracledb.getConnection(dbConfig)
    
    // Find equipment with serial and its MAC address
    const res = await conn.execute(`
      SELECT 
        e.SERIAL_NBR, 
        m.CA_VALUE as MAC
      FROM ASAP.EQUIPMENT e
      JOIN ASAP.EQUIP_CA_VALUE m ON m.EQUIPMENT_ID = e.EQUIPMENT_ID AND m.CA_VALUE_LABEL = 'Mac Address'
      WHERE ROWNUM <= 5
    `)
    
    console.log('SAMPLE DATA FOR TESTING:')
    res.rows.forEach(row => {
      console.log(`SERIAL: ${row.SERIAL_NBR} | MAC: ${row.MAC}`)
    })

  } catch (err) {
    console.error('ERROR: ', err.message)
  } finally {
    if (conn) await conn.close()
    process.exit(0)
  }
}

findSample()
