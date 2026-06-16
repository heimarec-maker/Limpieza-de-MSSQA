import oracledb from 'oracledb'
import 'dotenv/config'

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
}

async function validate() {
  let conn
  try {
    conn = await oracledb.getConnection(dbConfig)
    
    const serial = 'FFFNAOAA82AF38065'
    const mac = 'FFFAODE05FI38065'

    const res = await conn.execute(`
      SELECT 
        a.CA_VALUE AS ESTADO_CPE, 
        b.SERIAL_NBR, 
        b.EQUIPMENT_ID, 
        m.CA_VALUE AS MAC_ADDRESS
      FROM ASAP.EQUIP_CA_VALUE a, ASAP.EQUIPMENT b, ASAP.EQUIP_CA_VALUE m
      WHERE b.SERIAL_NBR = :serial
      AND a.CA_VALUE_LABEL = 'Estado CPE'
      AND a.EQUIPMENT_ID = b.EQUIPMENT_ID
      AND m.EQUIPMENT_ID = b.EQUIPMENT_ID
      AND m.CA_VALUE_LABEL = 'Mac Address'
      AND m.CA_VALUE = :mac
    `, { serial, mac })
    
    if (res.rows.length > 0) {
      console.log('VALIDATION SUCCESSFUL:')
      console.log(JSON.stringify(res.rows[0], null, 2))
    } else {
      console.log('VALIDATION FAILED: No equipment found with those credentials.')
    }

  } catch (err) {
    console.error('ERROR: ', err.message)
  } finally {
    if (conn) await conn.close()
    process.exit(0)
  }
}

validate()
