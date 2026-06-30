
import authenticateUser from '../config/ldap.js'
import '../config/dbMongo.js' // ensure mongoose connection for login DB
import User from '../models/modelsUser.js'

const allowedRoles = ['Usuario', 'Administrador'] // Roles permitidos para acceder al sistema

const login = (req, res) => {
  // Accept either `username` or `identifier` (frontend/tests may use either)
  const username = req.body.username || req.body.identifier
  const password = req.body.password

  if (!username || !password) {
    return res.status(400).json({ message: 'Faltan credenciales. Enviar JSON con `username` (o `identifier`) y `password`.' })
  }

  authenticateUser(username, password, async (err, success) => {
    if (err) {
      console.error('LDAP authentication error:', err);
      // Map LDAP error codes to HTTP responses
      const code = err.code || ''
      if (code === 'USER_NOT_FOUND') {
        return res.status(404).json({ message: 'Usuario no existe.' })
      }
      if (code === 'INVALID_CREDENTIALS') {
        return res.status(401).json({ message: 'Contraseña incorrecta.' })
      }
      // Other LDAP/internal errors
      return res.status(500).json({ message: 'Error en la autenticación LDAP.' })
    }

    if (!success || !success.user || !success.uid) {
      return res.status(401).json({ message: 'Autenticación LDAP fallida.' });
    }

    const ldapUser = success.user;
    const uid = ldapUser.uid || ldapUser.cn || username;
    const givenName = ldapUser.givenName || '';
    const sn = ldapUser.sn || '';
    const mail = ldapUser.mail || '';
    const employeeNumber = ldapUser.employeeNumber || '';
    const employeeType = ldapUser.employeeType || '';
    const etbDependencia = ldapUser.etbDependencia || '';
    const homePhone = ldapUser.homePhone || '';

    try {
      // Buscar por 'usuario' (uid) primero, si no existe, intentar por correo
      let dbUser = await User.findOne({ usuario: uid });
      if (!dbUser && mail) {
        dbUser = await User.findOne({ correo: mail });
      }

      if (dbUser) {
        // Actualizar campos no sensibles y mantener rol si ya existe
        dbUser.nombre = (givenName && sn) ? `${givenName} ${sn}`.trim() : (givenName || dbUser.nombre);
        // Mantener apellido en DB pero no lo enviaremos en la respuesta
        dbUser.correo = mail || dbUser.correo;
        dbUser.numero_identificacion = employeeNumber || dbUser.numero_identificacion;
        dbUser.employeeType = employeeType || dbUser.employeeType;
        dbUser.etbDependencia = etbDependencia || dbUser.etbDependencia;
        dbUser.telefono = homePhone || dbUser.telefono;
        dbUser.estado = dbUser.estado || 'Activo';
        await dbUser.save();
      } else {
        // Crear nuevo usuario mínimo. Rol por defecto 'Usuario'
        const newUser = new User({
          usuario: uid,
          nombre: (givenName && sn) ? `${givenName} ${sn}`.trim() : (givenName || ''),
          apellido: sn || '', // Se mantiene en BD pero no se envía en respuesta
          numero_identificacion: employeeNumber || '',
          employeeType: employeeType || '',
          etbDependencia: etbDependencia || '',
          tipo_documento: 'CC',
          correo: mail || '',
          estado: 'Activo',
          rol: 'Usuario',
          telefono: homePhone || '',
          movil: '',
        });
        dbUser = await newUser.save();
      }

      // debug logs removed

      // Validar rol y permisos
      const roleName = dbUser.rol || 'Usuario';
      if (!allowedRoles.includes(roleName)) {
        return res.status(403).json({ message: 'Acceso denegado. Rol insuficiente.' });
      }

      // Guardar en sesión (no guardar contraseña)
      req.session.user = {
        usuario: dbUser.usuario,
        role: roleName,
        nombre: dbUser.nombre,
        employeeType: dbUser.employeeType || '',
        area: dbUser.etbDependencia || '',
        correo: dbUser.correo,
        telefono: dbUser.telefono || '',
        movil: dbUser.movil || '',
        numero_identificacion: dbUser.numero_identificacion || '',
        tipo_documento: dbUser.tipo_documento || '',
        estado: dbUser.estado || 'Activo'
      };

      // displayName es el mismo que nombre (ya contiene nombre completo)
      req.session.user.displayName = req.session.user.nombre || req.session.user.usuario

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ ok: false, message: 'Error interno al guardar la sesión.' });
        }

        // Map role to front-end expected values
        const frontendRole = (roleName === 'Administrador') ? 'admin' : 'user';

        // Return session user including displayName; frontend should use `displayName` for header/profile
        return res.status(200).json({ ok: true, user: { ...req.session.user, role: frontendRole } });
      });
    } catch (dbError) {
      console.error('Error al consultar/guardar en MongoDB:', dbError);
      return res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });
}

export { login }
