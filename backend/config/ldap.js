import 'dotenv/config'
import ldap from 'ldapjs'

const escapeLDAPFilter = (value) => {
  return String(value)
    .replace(/([\\*()\0])/g, '\\$1')
    .replace(/\0/g, '\\00')
}

const buildSearchFilters = (identifier) => {
  const escaped = escapeLDAPFilter(identifier)
  const filters = []

  if (identifier.includes('@')) {
    filters.push(`(mail=${escaped})`)
  }

  filters.push(`(uid=${escaped})`, `(cn=${escaped})`, `(sAMAccountName=${escaped})`)

  if (process.env.LDAP_USERNAME_ATTRIBUTE) {
    const attr = process.env.LDAP_USERNAME_ATTRIBUTE.trim()
    if (attr && !filters.some((filter) => filter.includes(`(${attr}=`))) {
      filters.push(`(${attr}=${escaped})`)
    }
  }

  return filters
}

const getAttributeValue = (entry, attribute) => {
  const attr = entry.attributes.find((item) => item.type === attribute)
  return attr?.vals?.[0] || ''
}

//Función para validar usuarios
const authenticateUser = async (username, password, callback) => {
  const identifier = String(username || '').trim()

  if (!identifier || !password) {
    return callback(null, null)
  }

  // Developer/Local Tester Bypass
  if (identifier === 'heimar' || identifier === 'localadmin') {
    return callback(null, {
      uid: identifier,
      user: {
        uid: identifier,
        cn: identifier === 'localadmin' ? 'Administrador Local' : 'Heimar Developer',
        givenName: identifier === 'localadmin' ? 'Local' : 'Heimar',
        sn: identifier === 'localadmin' ? 'Admin' : 'Dev',
        mail: `${identifier}@etb.com.co`,
        employeeNumber: '101010',
        employeeType: 'Administrador',
        homePhone: '123456',
        etbDependencia: 'Soporte',
      }
    })
  }

  const ldapUrl = process.env.LDAP_URL
  const adminDn = process.env.LDAP_ADMIN_DN
  const adminPassword = process.env.LDAP_ADMIN_PASSWORD
  const searchBase = process.env.LDAP_USER_SEARCH_BASE
  const timeout = parseInt(process.env.LDAP_BIND_TIMEOUT_MS || '5000', 10)

  if (!ldapUrl || !adminDn || !adminPassword || !searchBase) {
    return callback(new Error('Faltan variables de configuración LDAP'), null)
  }

  const attributes = ['uid', 'cn', 'mail', 'givenName', 'sn', 'homePhone', 'etbDependencia', 'employeeType', 'employeeNumber', 'costCenterDescription', 'uidNumber', 'costCenter']
  const client = ldap.createClient({ url: ldapUrl, timeout, connectTimeout: timeout })

  client.bind(adminDn, adminPassword, (adminErr) => {
    if (adminErr) {
      adminErr.code = adminErr.code || 'LDAP_ADMIN_BIND_FAILED'
      client.unbind(() => callback(adminErr, null))
      return
    }

    const filters = buildSearchFilters(identifier)
    const searchOptions = {
      filter: `(|${filters.join('')})`,
      scope: 'sub',
      attributes
    }

    client.search(searchBase, searchOptions, (searchErr, res) => {
      if (searchErr) {
        const e = new Error('LDAP search error')
        e.code = searchErr.code || 'LDAP_SEARCH_ERROR'
        client.unbind(() => callback(e, null))
        return
      }

      let foundEntry = null

      res.on('searchEntry', (entry) => {
        if (!foundEntry) {
          foundEntry = entry
        }
      })

      res.on('error', (err) => {
        client.unbind(() => callback(err, null))
      })

      res.on('end', (result) => {
        client.unbind(() => {
          if (result.status !== 0) {
            const e = new Error(`LDAP search finished with status ${result.status}`)
            e.code = 'LDAP_SEARCH_STATUS'
            return callback(e, null)
          }

          if (!foundEntry) {
            const e = new Error('Usuario no encontrado')
            e.code = 'USER_NOT_FOUND'
            return callback(e, null)
          }

          const entry = foundEntry
          const user = {
            dn: entry.objectName,
            uid: getAttributeValue(entry, 'uid') || getAttributeValue(entry, 'cn') || identifier,
            cn: getAttributeValue(entry, 'cn') || '',
            givenName: getAttributeValue(entry, 'givenName') || '',
            sn: getAttributeValue(entry, 'sn') || '',
            mail: getAttributeValue(entry, 'mail') || '',
            employeeNumber: getAttributeValue(entry, 'employeeNumber') || '',
            employeeType: getAttributeValue(entry, 'employeeType') || '',
            etbDependencia: getAttributeValue(entry, 'etbDependencia') || '',
            homePhone: getAttributeValue(entry, 'homePhone') || '',
            costCenterDescription: getAttributeValue(entry, 'costCenterDescription') || '',
            uidNumber: getAttributeValue(entry, 'uidNumber') || '',
            costCenter: getAttributeValue(entry, 'costCenter') || ''
          }

          const userClient = ldap.createClient({ url: ldapUrl, timeout, connectTimeout: timeout })

          userClient.bind(entry.objectName, password, (userBindErr) => {
            userClient.unbind(() => {
              if (userBindErr) {
                const e = new Error(userBindErr.message || 'Error en bind de usuario')
                // Detect common ldapjs invalid credentials
                if (userBindErr.name === 'InvalidCredentialsError' || /invalid/i.test(String(userBindErr.message))) {
                  e.code = 'INVALID_CREDENTIALS'
                } else {
                  e.code = userBindErr.code || 'USER_BIND_ERROR'
                }
                return callback(e, null)
              }

              return callback(null, {
                user,
                uid: user.uid,
                password
              })
            })
          })
        })
      })
    })
  })
}

export default authenticateUser
