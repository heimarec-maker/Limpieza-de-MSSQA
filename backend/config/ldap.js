
import 'dotenv/config'
import { authenticate } from 'ldap-authentication'

//Función para validar usuarios
const authenticateUser = async (username, password, callback) => {
  // Decide dinámicamente el atributo de búsqueda (uid o mail) si el identificador parece un correo
  const isEmail = typeof username === 'string' && username.includes('@');
  const usernameAttr = isEmail ? 'mail' : (process.env.LDAP_USERNAME_ATTRIBUTE || 'uid');

  const options = {
    ldapOpts: {
      url: process.env.LDAP_URL,
    },
    adminDn: process.env.LDAP_ADMIN_DN,
    adminPassword: process.env.LDAP_ADMIN_PASSWORD,
    userPassword: password,
    userSearchBase: process.env.LDAP_USER_SEARCH_BASE,
    usernameAttribute: usernameAttr,
    username: username,
    attributes: ['uid', 'givenName', 'sn', 'mail', 'homePhone', 'etbDependencia', 'employeeType', 'employeeNumber', 'costCenterDescription', 'uidNumber', 'costCenter'],
  };

  try {
    const user = await authenticate(options);

    if (!user) {
      return callback(null, null);
    }

    // Pasamos el 'uid' y 'password' al callback
    callback(null, {
      user,
      uid: user.uid, // UID del usuario
      password: password // Contraseña del usuario (NO se guarda en DB)
    });
  } catch (error) {
    callback(error, null);
  }
};
export default authenticateUser;
