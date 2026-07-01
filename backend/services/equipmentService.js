import * as db from '../config/db.js'

/** OP 1 — Validar estado del equipo por serial (Paso 1.1 del manual) */
export async function validarEquipo(serial) {
  return await db.queryOne(`
    SELECT 
      a.ca_value      AS estado, 
      b.serial_nbr    AS serial,
      b.equipment_id  AS equipment_id
    FROM   ASAP.equip_ca_value a, ASAP.equipment b
    WHERE  b.serial_nbr = :serial
    AND    a.ca_value_label = 'Estado CPE'
    AND    a.equipment_id = b.equipment_id
  `, { serial })
}

/** OP 2 — Borrado del equipo (Paso 1.2: procedimiento con ARRAY_EQUIPOS) */
export async function ejecutarBorrado(serial, usuario, esMasivo = false) {
  console.log(`[Step 1.2] Ejecutando BORRADO_EQUIPOS para ${serial}...`)
  const plsql = `
    DECLARE
      VALORES ASAP.ARRAY_EQUIPOS := ASAP.ARRAY_EQUIPOS(:serial);
    BEGIN
      ASAP.BORRADO_EQUIPOS (VALORES);
    END;
  `;
  const start = Date.now()
  await db.execute(plsql, { serial })
  console.log(`[Step 1.2] Finalizado en ${Date.now() - start}ms`)
  const tipo = esMasivo ? '_MASIVO' : '_INDIVIDUAL'
  await db.registrarLog(serial, usuario, 'BORRADO' + tipo, 'ÉXITO', 'Paso 1.2: Procedimiento BORRADO_EQUIPOS ejecutado exitosamente.')
}

export async function limpiarServItem(serial, usuario, esMasivo = false) {
  console.log(`[Step 1.3] Limpiando serv_item_value para ${serial}...`)
  const start = Date.now()
  const r = await db.execute(`
    UPDATE ASAP.serv_item_value
    SET    valid_value = valid_value || '*'
    WHERE  value_label = 'Serial' AND valid_value = :serial
  `, { serial })
  
  const changes = r.rowsAffected || 0
  console.log(`[Step 1.3] Finalizado. Filas: ${changes} (${Date.now() - start}ms)`)
  const tipo = esMasivo ? '_MASIVO' : '_INDIVIDUAL'
  await db.registrarLog(serial, usuario, 'SERV_ITEM' + tipo,
    changes > 0 ? 'ÉXITO' : 'INFO',
    `Paso 1.3: ${changes} fila(s) actualizadas en serv_item_value`)
  return changes
}

export async function limpiarServReq(serial, usuario, esMasivo = false) {
  console.log(`[Step 1.4] Limpiando serv_req_si_value para ${serial}...`)
  const start = Date.now()
  const r = await db.execute(`
    UPDATE ASAP.serv_req_si_value
    SET    valid_value = valid_value || '*'
    WHERE  value_label = 'Serial' AND valid_value = :serial
  `, { serial })
  
  const changes = r.rowsAffected || 0
  console.log(`[Step 1.4] Finalizado. Filas: ${changes} (${Date.now() - start}ms)`)
  const tipo = esMasivo ? '_MASIVO' : '_INDIVIDUAL'
  await db.registrarLog(serial, usuario, 'SERV_REQ' + tipo,
    changes > 0 ? 'ÉXITO' : 'INFO',
    `Paso 1.4: ${changes} fila(s) actualizadas en serv_req_si_value`)
  return changes
}

export async function listarTodosEquipos() {
  return await db.query(`
    SELECT
      e.equipment_id,
      e.serial_nbr,
      e.availability_status AS estado_general,
      cv.ca_value AS estado_cpe
    FROM ASAP.equipment e
    LEFT JOIN ASAP.equip_ca_value cv
           ON cv.equipment_id  = e.equipment_id
          AND cv.ca_value_label = 'Estado CPE'
    ORDER BY e.equipment_id DESC
  `)
}
