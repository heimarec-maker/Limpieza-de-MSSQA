# Limpieza de Equipos ETB

Este repositorio contiene el proyecto completo del Portal de Gestión ETB, una aplicación FullStack para la gestión de inventario, limpieza de equipos, integración con servicios SMW y auditoría de actividades.

## Qué contiene el proyecto

- `frontend/`: aplicación web en React + Vite.
- `backend/`: servidor Node.js con Express que consume Oracle, MongoDB y LDAP.
- `backend/config/`: configuración de Oracle, MongoDB y LDAP.
- `backend/routes/`: rutas de la API REST.
- `backend/services/`: lógica de negocio para limpieza de equipos y SMW.
- `frontend/src/pages/`: páginas de usuario, manuales, administración y módulos.

## Resumen funcional

El proyecto soporta:

- autenticación corporativa vía LDAP.
- consulta y limpieza de equipos registrados en Oracle.
- registro y creación de nuevos equipos.
- integración SMW para georreferenciación y liberación de recursos.
- panel administrativo con auditoría y gestión de usuarios.
- traducciones multilenguaje en la interfaz.

> Nota: el módulo de Limpieza MSS aparece en la UI pero está en desarrollo.

## Requisitos previos

Antes de instalar, asegúrate de contar con:

- Node.js 18 o superior.
- npm.
- Acceso a la red ETB / VPN para Oracle y LDAP.
- Oracle Instant Client o librerías necesarias si `oracledb` lo requiere en tu entorno.
- MongoDB accesible si vas a utilizar la autenticación.

## Instalación para una nueva persona

1. Clona el repositorio:

```bash
git clone https://github.com/heimarec-maker/Limpieza-de-MSSQA.git
cd Limpieza-de-MSSQA
```

2. Instala dependencias en la raíz si es necesario:

```bash
npm install
```

3. Instala dependencias del backend:

```bash
cd backend
npm install
```

4. Instala dependencias del frontend:

```bash
cd ../frontend
npm install
```

## Configuración de entorno

Copia el archivo de ejemplo del backend y completa los valores según tus conexiones:

```bash
cd backend
cp .env.example .env
```

Luego edita `backend/.env` con tus datos de:

- `DB_USER`, `DB_PASSWORD`, `DB_CONNECTION_STRING` — Oracle.
- `PORT` — puerto del backend (por defecto `3001`).
- `SMW_GEOREF_URL`, `SMW_RFS_URL`, `SMW_LIBERAR_URL` — endpoints SOAP de SMW.
- `MONGO_USER`, `MONGO_PASS`, `MONGO_HOST`, `MONGO_DB`, `MONGO_AUTH_DB` — MongoDB.
- `MONGO_URL` — alternativa completa para MongoDB.
- `LDAP_URL`, `LDAP_USER_SEARCH_BASE`, `LDAP_ADMIN_DN`, `LDAP_ADMIN_PASSWORD` — LDAP.
- `LDAP_USERNAME_ATTRIBUTE` — opcional, atributo para búsqueda de usuario.
- `SESSION_SECRET` — secreto para sesiones.

> Si no tienes MongoDB o LDAP listos, puedes usar los valores de prueba sólo si el entorno lo permite, pero para pruebas reales debes tener acceso a los servicios correspondientes.

## Ejecución local

Desde la carpeta raíz puedes iniciar frontend y backend juntos:

```bash
npm start
```

O iniciar cada parte por separado:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

El frontend debería quedar disponible en `http://localhost:5173` y el backend en `http://localhost:3001`.

## Comandos útiles

- `npm run build` (desde la raíz): construye el frontend para producción.
- `npm run server` (desde la raíz): inicia solo el backend.
- `npm run dev` (desde la raíz): inicia solo el frontend.
- `npm run lint` (desde `frontend/`): ejecuta ESLint.

## Estructura de carpetas

- `frontend/src/components`: componentes reutilizables.
- `frontend/src/pages`: vistas principales y documentación en la app.
- `frontend/src/services`: llamadas al backend y utilidades.
- `backend/controllers`: controladores de API.
- `backend/services`: lógica del servidor.
- `backend/config`: adaptadores de Oracle, MongoDB y LDAP.

## Puesta en marcha para pruebas

Para que otra persona pruebe el proyecto sin descargar todo localmente, lo ideal es desplegar la aplicación en un servicio de Azure (por ejemplo Azure App Service). En ese caso, sólo necesitará la URL pública y las credenciales de acceso.

Si la persona va a probar el proyecto desde el repositorio, será necesario clonar, instalar dependencias y configurar `backend/.env` con sus propias conexiones.

## Buenas prácticas

- No subas credenciales reales a Git.
- Usa `.env.example` como plantilla de configuración.
- Comprueba que `backend/.env` esté excluido de Git si usas datos privados.

## Contacto

Si necesitas ayuda con el despliegue o la configuración de LDAP/MongoDB/Oracle, consulta la documentación del equipo o solicita los datos de acceso al administrador del proyecto.
