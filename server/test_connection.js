import 'dotenv/config'
import oracledb from 'oracledb'

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const dbConfig = {
  user:          process.env.DB_USER,
  password:      process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
}

async function testQuery() {
  let conn
  try {
    console.log('Conectando a Oracle con:', dbConfig.user, '@', dbConfig.connectString)
    conn = await oracledb.getConnection(dbConfig)
    console.log('✅ Conexión exitosa.')

    const serial = 'ZTEQA065JI5G'
    const mac = 'AAAAAAAAA115'

    const sql = `
      SELECT 
        a.ca_value      AS estado_cpe, 
        b.serial_nbr    AS serial_nbr,
        b.equipment_id  AS equipment_id,
        m.ca_value      AS mac_address
      FROM   ASAP.equip_ca_value a, ASAP.equipment b, ASAP.equip_ca_value m
      WHERE  b.serial_nbr = :serial
      AND    a.ca_value_label = 'Estado CPE'
      AND    a.equipment_id = b.equipment_id
      AND    m.equipment_id = b.equipment_id
      AND    m.ca_value_label = 'Mac Address'
      AND    m.ca_value = :mac
    `

    console.log('Ejecutando consulta de validación...')
    const result = await conn.execute(sql, { serial, mac })
    
    if (result.rows.length > 0) {
      console.log('✅ Equipo encontrado:')
      console.table(result.rows)
    } else {
      console.warn('⚠️ Equipo no encontrado con ese Serial y MAC.')
    }

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    if (conn) {
      try { await conn.close() } catch (e) {}
    }
  }
}

testQuery()
