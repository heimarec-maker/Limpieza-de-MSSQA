const ldap = require('ldapjs');
require('dotenv').config();

// Función para escapar los caracteres especiales en el filtro LDAP
const escapeLDAPFilter = (value) => {
  return value.replace(/([\\\*\(\)\0])/g, '\\$1');
};

const searchUserNom = async (searchQuery) => {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: process.env.LDAP_URL });

    client.bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD, (err) => {
      if (err) {
        console.error('Error al vincularse al servidor LDAP:', err);
        return reject(`Error al vincularse al servidor LDAP: ${err}`);
      }

      // Validar que la búsqueda no esté vacía
      if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim() === '') {
        client.unbind();
        return resolve([]); // Si no hay query, devolver un array vacío
      }

      // Limpia la búsqueda
      const cleanedSearchQuery = escapeLDAPFilter(searchQuery.trim());
      console.log('Búsqueda limpiada y escapada:', cleanedSearchQuery);

      const searchOptions = {
        filter: `(|(givenName=${cleanedSearchQuery}*)(sn=${cleanedSearchQuery}*)(employeeNumber=${cleanedSearchQuery}*))`,
        scope: 'sub',
        attributes: ['uid', 'givenName', 'sn', 'mail', 'homePhone', 'etbDependencia', 'employeeType', 'employeeNumber', 'costCenterDescription', 'uidNumber', 'costCenter']
      };

      let userData = [];

      client.search(process.env.LDAP_USER_SEARCH_BASE, searchOptions, (err, res) => {
        if (err) {
          console.error(`Error en la búsqueda LDAP para la consulta: ${cleanedSearchQuery}`, err);
          client.unbind();
          return reject(`Error en la búsqueda LDAP: ${err}`);
        }

        res.on('searchEntry', (entry) => {
          userData.push({
            givenName: entry.attributes.find(a => a.type === 'givenName')?.vals[0] || '',
            sn: entry.attributes.find(a => a.type === 'sn')?.vals[0] || '',
            employeeNumber: entry.attributes.find(a => a.type === 'employeeNumber')?.vals[0] || '',
            costCenter: entry.attributes.find(a => a.type === 'costCenter')?.vals[0] || '',
            uid: entry.attributes.find(a => a.type === 'uid')?.vals[0] || '',
            mail: entry.attributes.find(a => a.type === 'mail')?.vals[0] || ''
          });
        });

        res.on('error', (err) => {
          console.error(`Error en la búsqueda LDAP para la consulta: ${cleanedSearchQuery}`, err);
          client.unbind();
          return reject(`Error en la búsqueda LDAP: ${err}`);
        });

        res.on('end', (result) => {
          client.unbind();

          // Verificar si hubo resultados y devolverlos
          if (result.status === 0 && userData.length > 0) {
            console.log('Resultados encontrados:', userData);
            resolve(userData);
          } else {
            console.log('No se encontraron resultados para la búsqueda:', cleanedSearchQuery);
            resolve([]);
          }
        });
      });
    });
  });
};

module.exports = { searchUserNom };