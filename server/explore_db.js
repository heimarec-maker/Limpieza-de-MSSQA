/**
 * Script de exploración de la base de datos Oracle ETB_PREQA
 * Revisa esquemas, tablas, privilegios y capacidades CRUD
 */
import oracledb from 'oracledb'
import 'dotenv/config'

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
}

async function explore() {
  let conn
  try {
    console.log(`\n🔌 Conectando a: ${dbConfig.connectString} como ${dbConfig.user}...\n`)
    conn = await oracledb.getConnection(dbConfig)
    console.log('✅ Conexión exitosa\n')

    // 1. Info del usuario actual
    console.log('══════════════════════════════════════════════════')
    console.log('  1. INFORMACIÓN DEL USUARIO ACTUAL')
    console.log('══════════════════════════════════════════════════')
    const userInfo = await conn.execute(`SELECT USER, SYS_CONTEXT('USERENV','CURRENT_SCHEMA') AS CURRENT_SCHEMA FROM DUAL`)
    console.log('  Usuario:', userInfo.rows[0].USER)
    console.log('  Schema:', userInfo.rows[0].CURRENT_SCHEMA)

    // 2. Roles del usuario
    console.log('\n══════════════════════════════════════════════════')
    console.log('  2. ROLES ASIGNADOS')
    console.log('══════════════════════════════════════════════════')
    try {
      const roles = await conn.execute(`SELECT GRANTED_ROLE, ADMIN_OPTION, DEFAULT_ROLE FROM USER_ROLE_PRIVS ORDER BY GRANTED_ROLE`)
      if (roles.rows.length === 0) console.log('  (Sin roles)')
      else roles.rows.forEach(r => console.log(`  • ${r.GRANTED_ROLE} (admin: ${r.ADMIN_OPTION}, default: ${r.DEFAULT_ROLE})`))
    } catch (e) { console.log('  ⚠️ No se pudo consultar roles:', e.message) }

    // 3. Privilegios del sistema
    console.log('\n══════════════════════════════════════════════════')
    console.log('  3. PRIVILEGIOS DEL SISTEMA')
    console.log('══════════════════════════════════════════════════')
    try {
      const sysPrivs = await conn.execute(`SELECT PRIVILEGE, ADMIN_OPTION FROM USER_SYS_PRIVS ORDER BY PRIVILEGE`)
      if (sysPrivs.rows.length === 0) console.log('  (Sin privilegios de sistema directos)')
      else sysPrivs.rows.forEach(p => console.log(`  • ${p.PRIVILEGE} (admin: ${p.ADMIN_OPTION})`))
    } catch (e) { console.log('  ⚠️ No se pudo consultar privilegios de sistema:', e.message) }

    // 4. Privilegios sobre tablas (CRUD capabilities)
    console.log('\n══════════════════════════════════════════════════')
    console.log('  4. PRIVILEGIOS SOBRE TABLAS (CRUD)')
    console.log('══════════════════════════════════════════════════')
    try {
      const tabPrivs = await conn.execute(`
        SELECT OWNER, TABLE_NAME, PRIVILEGE, GRANTABLE 
        FROM USER_TAB_PRIVS 
        WHERE OWNER != USER
        ORDER BY OWNER, TABLE_NAME, PRIVILEGE
        FETCH FIRST 100 ROWS ONLY
      `)
      if (tabPrivs.rows.length === 0) {
        console.log('  (Sin privilegios directos sobre tablas de otros esquemas)')
      } else {
        let currentTable = ''
        tabPrivs.rows.forEach(p => {
          const tableFull = `${p.OWNER}.${p.TABLE_NAME}`
          if (tableFull !== currentTable) {
            currentTable = tableFull
            console.log(`\n  📋 ${tableFull}:`)
          }
          console.log(`     ${p.PRIVILEGE} (grantable: ${p.GRANTABLE})`)
        })
      }
    } catch (e) { console.log('  ⚠️ No se pudo consultar privilegios sobre tablas:', e.message) }

    // 5. Tablas propias del usuario
    console.log('\n══════════════════════════════════════════════════')
    console.log('  5. TABLAS PROPIAS DEL USUARIO')
    console.log('══════════════════════════════════════════════════')
    try {
      const myTables = await conn.execute(`SELECT TABLE_NAME, NUM_ROWS, LAST_ANALYZED FROM USER_TABLES ORDER BY TABLE_NAME`)
      if (myTables.rows.length === 0) console.log('  (No tiene tablas propias)')
      else myTables.rows.forEach(t => console.log(`  • ${t.TABLE_NAME} (filas aprox: ${t.NUM_ROWS || '?'}, analizado: ${t.LAST_ANALYZED || 'nunca'})`))
    } catch (e) { console.log('  ⚠️ No se pudo consultar tablas propias:', e.message) }

    // 6. Tablas accesibles (de otros esquemas) — agrupadas por schema
    console.log('\n══════════════════════════════════════════════════')
    console.log('  6. TABLAS ACCESIBLES (OTROS ESQUEMAS)')
    console.log('══════════════════════════════════════════════════')
    try {
      const accTables = await conn.execute(`
        SELECT OWNER, TABLE_NAME, NUM_ROWS 
        FROM ALL_TABLES 
        WHERE OWNER NOT IN ('SYS','SYSTEM','MDSYS','CTXSYS','XDB','WMSYS','ORDSYS','DBSNMP','OUTLN','APEX_040200','APEX_050000','APEX_PUBLIC_USER','FLOWS_FILES')
          AND OWNER != USER
        ORDER BY OWNER, TABLE_NAME
        FETCH FIRST 150 ROWS ONLY
      `)
      if (accTables.rows.length === 0) {
        console.log('  (No tiene acceso a tablas de otros esquemas)')
      } else {
        let currentOwner = ''
        let count = 0
        accTables.rows.forEach(t => {
          if (t.OWNER !== currentOwner) {
            currentOwner = t.OWNER
            count = 0
            console.log(`\n  📂 Schema: ${t.OWNER}`)
          }
          count++
          if (count <= 30) {
            console.log(`     • ${t.TABLE_NAME} (filas: ${t.NUM_ROWS || '?'})`)
          } else if (count === 31) {
            console.log(`     ... (más tablas en este schema)`)
          }
        })
      }
    } catch (e) { console.log('  ⚠️ No se pudo consultar tablas accesibles:', e.message) }

    // 7. Esquema ASAP - tablas relevantes al proyecto
    console.log('\n══════════════════════════════════════════════════')
    console.log('  7. TABLAS DEL ESQUEMA ASAP (proyecto)')
    console.log('══════════════════════════════════════════════════')
    try {
      const asapTables = await conn.execute(`
        SELECT TABLE_NAME, NUM_ROWS 
        FROM ALL_TABLES 
        WHERE OWNER = 'ASAP'
        ORDER BY TABLE_NAME
        FETCH FIRST 100 ROWS ONLY
      `)
      if (asapTables.rows.length === 0) {
        console.log('  (No se encontraron tablas en ASAP o no hay acceso)')
      } else {
        asapTables.rows.forEach(t => console.log(`  • ${t.TABLE_NAME} (filas: ${t.NUM_ROWS || '?'})`))
        console.log(`\n  Total tablas ASAP accesibles: ${asapTables.rows.length}`)
      }
    } catch (e) { console.log('  ⚠️ No se pudo consultar tablas ASAP:', e.message) }

    // 8. Privilegios específicos sobre tablas ASAP
    console.log('\n══════════════════════════════════════════════════')
    console.log('  8. PRIVILEGIOS SOBRE TABLAS ASAP')
    console.log('══════════════════════════════════════════════════')
    try {
      const asapPrivs = await conn.execute(`
        SELECT TABLE_NAME, PRIVILEGE, GRANTABLE 
        FROM ALL_TAB_PRIVS 
        WHERE TABLE_SCHEMA = 'ASAP' AND GRANTEE = USER
        ORDER BY TABLE_NAME, PRIVILEGE
        FETCH FIRST 100 ROWS ONLY
      `)
      if (asapPrivs.rows.length === 0) {
        console.log('  (Sin privilegios directos — podría tener acceso vía roles)')
      } else {
        let currentTable = ''
        asapPrivs.rows.forEach(p => {
          if (p.TABLE_NAME !== currentTable) {
            currentTable = p.TABLE_NAME
            console.log(`\n  📋 ASAP.${p.TABLE_NAME}:`)
          }
          console.log(`     ${p.PRIVILEGE} (grantable: ${p.GRANTABLE})`)
        })
      }
    } catch (e) { console.log('  ⚠️ No se pudo consultar privilegios ASAP:', e.message) }

    // 9. Verificar si podemos hacer INSERT/UPDATE/DELETE en ASAP
    console.log('\n══════════════════════════════════════════════════')
    console.log('  9. TEST CRUD — VERIFICACIÓN DE PERMISOS')
    console.log('══════════════════════════════════════════════════')
    const testTables = ['equipment', 'equip_ca_value', 'serv_item_value', 'serv_req_si_value']
    for (const table of testTables) {
      console.log(`\n  🔍 ASAP.${table}:`)
      // SELECT
      try {
        await conn.execute(`SELECT * FROM ASAP.${table} FETCH FIRST 1 ROWS ONLY`)
        console.log('     ✅ SELECT — OK')
      } catch (e) { console.log(`     ❌ SELECT — ${e.message.split('\n')[0]}`) }
      // UPDATE (WHERE 1=0 para no modificar datos)
      try {
        await conn.execute(`UPDATE ASAP.${table} SET equipment_id = equipment_id WHERE 1=0`, {}, { autoCommit: false })
        console.log('     ✅ UPDATE — Permitido')
      } catch (e) {
        const msg = e.message.split('\n')[0]
        if (msg.includes('ORA-01031') || msg.includes('ORA-00942') || msg.includes('insufficient privileges')) {
          console.log(`     ❌ UPDATE — Sin permiso`)
        } else {
          console.log(`     ⚠️ UPDATE — ${msg.substring(0,80)}`)
        }
      }
      // DELETE (WHERE 1=0 para no borrar datos)
      try {
        await conn.execute(`DELETE FROM ASAP.${table} WHERE 1=0`, {}, { autoCommit: false })
        console.log('     ✅ DELETE — Permitido')
      } catch (e) {
        const msg = e.message.split('\n')[0]
        if (msg.includes('ORA-01031') || msg.includes('ORA-00942') || msg.includes('insufficient privileges')) {
          console.log(`     ❌ DELETE — Sin permiso`)
        } else {
          console.log(`     ⚠️ DELETE — ${msg.substring(0,80)}`)
        }
      }
    }

    // 10. Procedimientos accesibles
    console.log('\n══════════════════════════════════════════════════')
    console.log('  10. PROCEDIMIENTOS/FUNCIONES ACCESIBLES EN ASAP')
    console.log('══════════════════════════════════════════════════')
    try {
      const procs = await conn.execute(`
        SELECT OBJECT_NAME, OBJECT_TYPE, STATUS
        FROM ALL_OBJECTS
        WHERE OWNER = 'ASAP' AND OBJECT_TYPE IN ('PROCEDURE','FUNCTION','PACKAGE','TYPE')
        ORDER BY OBJECT_TYPE, OBJECT_NAME
        FETCH FIRST 50 ROWS ONLY
      `)
      if (procs.rows.length === 0) {
        console.log('  (No se encontraron procedimientos/funciones)')
      } else {
        procs.rows.forEach(p => console.log(`  • [${p.OBJECT_TYPE}] ${p.OBJECT_NAME} (${p.STATUS})`))
      }
    } catch (e) { console.log('  ⚠️ No se pudo consultar procedimientos:', e.message) }

    // 11. Verificar acceso al procedimiento BORRADO_EQUIPOS y ARRAY_EQUIPOS
    console.log('\n══════════════════════════════════════════════════')
    console.log('  11. ACCESO A BORRADO_EQUIPOS + ARRAY_EQUIPOS')
    console.log('══════════════════════════════════════════════════')
    try {
      const proc = await conn.execute(`
        SELECT OBJECT_NAME, OBJECT_TYPE, STATUS 
        FROM ALL_OBJECTS 
        WHERE OWNER = 'ASAP' AND OBJECT_NAME = 'BORRADO_EQUIPOS'
      `)
      if (proc.rows.length > 0) {
        console.log(`  ✅ BORRADO_EQUIPOS: ${proc.rows[0].OBJECT_TYPE} — Status: ${proc.rows[0].STATUS}`)
      } else {
        console.log('  ❌ BORRADO_EQUIPOS no encontrado en ASAP')
      }
    } catch (e) { console.log('  ⚠️ Error:', e.message) }

    try {
      const arrType = await conn.execute(`
        SELECT OBJECT_NAME, OBJECT_TYPE, STATUS 
        FROM ALL_OBJECTS 
        WHERE OWNER = 'ASAP' AND OBJECT_NAME = 'ARRAY_EQUIPOS'
      `)
      if (arrType.rows.length > 0) {
        console.log(`  ✅ ARRAY_EQUIPOS: ${arrType.rows[0].OBJECT_TYPE} — Status: ${arrType.rows[0].STATUS}`)
      } else {
        console.log('  ❌ ARRAY_EQUIPOS type no encontrado en ASAP')
      }
    } catch (e) { console.log('  ⚠️ Error:', e.message) }

    // 12. Verificar si podemos crear tablas propias (para limpieza_log)
    console.log('\n══════════════════════════════════════════════════')
    console.log('  12. CAPACIDAD DE CREAR TABLAS PROPIAS')
    console.log('══════════════════════════════════════════════════')
    try {
      const createPriv = await conn.execute(`SELECT PRIVILEGE FROM USER_SYS_PRIVS WHERE PRIVILEGE = 'CREATE TABLE'`)
      if (createPriv.rows.length > 0) {
        console.log('  ✅ Tiene privilegio CREATE TABLE')
      } else {
        // Check via roles
        const rolePriv = await conn.execute(`
          SELECT rsp.PRIVILEGE 
          FROM ROLE_SYS_PRIVS rsp, USER_ROLE_PRIVS urp 
          WHERE rsp.ROLE = urp.GRANTED_ROLE AND rsp.PRIVILEGE = 'CREATE TABLE'
        `)
        if (rolePriv.rows.length > 0) {
          console.log('  ✅ Tiene privilegio CREATE TABLE (vía rol)')
        } else {
          console.log('  ❌ No tiene privilegio CREATE TABLE')
        }
      }
    } catch (e) { console.log('  ⚠️ No se pudo verificar:', e.message) }

    console.log('\n══════════════════════════════════════════════════')
    console.log('  EXPLORACIÓN COMPLETADA')
    console.log('══════════════════════════════════════════════════\n')

  } catch (err) {
    console.error('❌ Error de conexión:', err.message)
  } finally {
    if (conn) {
      try { await conn.close() } catch (e) {}
    }
    process.exit(0)
  }
}

explore()
