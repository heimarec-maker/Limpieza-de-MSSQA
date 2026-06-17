/**
 * Servicio centralizado de exportación de datos.
 * Soporta formatos CSV y JSON para cualquier dataset del sistema.
 */

/**
 * Genera y descarga un archivo CSV a partir de datos.
 * @param {Object} options
 * @param {string} options.filename - Nombre del archivo (sin extensión).
 * @param {string[]} options.headers - Encabezados de las columnas.
 * @param {Array<Array<string>>} options.rows - Filas de datos.
 */
export function exportCSV({ filename, headers, rows }) {
  if (!rows || rows.length === 0) return

  const escapeCsv = (val) => {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(','))
  ].join('\n')

  downloadBlob(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;')
}

/**
 * Genera y descarga un archivo JSON a partir de datos.
 * @param {Object} options
 * @param {string} options.filename - Nombre del archivo (sin extensión).
 * @param {Array|Object} options.data - Datos a exportar.
 */
export function exportJSON({ filename, data }) {
  if (!data) return
  const jsonContent = JSON.stringify(data, null, 2)
  downloadBlob(jsonContent, `${filename}.json`, 'application/json;charset=utf-8;')
}

/**
 * Exporta registros de actividad filtrados como CSV.
 * @param {Array} logs - Registros de actividad.
 * @param {Function} t - Función de traducción.
 */
export function exportActivityLogs(logs, t) {
  exportCSV({
    filename: `registro_actividad_${getDateStamp()}`,
    headers: [t('Fecha'), t('Usuario'), t('Acción'), t('Módulo'), t('Detalles'), t('Resultado')],
    rows: logs.map(l => [
      formatTimestamp(l.timestamp),
      l.usuario,
      l.accion,
      l.modulo,
      l.detalles || '',
      l.resultado,
    ])
  })
}

/**
 * Exporta la lista de usuarios como CSV.
 * @param {Array} users - Lista de usuarios.
 * @param {Function} t - Función de traducción.
 */
export function exportUsers(users, t) {
  exportCSV({
    filename: `reporte_usuarios_${getDateStamp()}`,
    headers: [t('Nombre'), t('Correo'), t('Rol'), t('Estado'), t('Último Acceso')],
    rows: users.map(u => [
      u.name,
      u.email,
      u.role,
      u.status,
      u.lastLogin,
    ])
  })
}

/**
 * Exporta resultados de operaciones (limpieza, creación, etc.) como CSV.
 * @param {Object} options
 * @param {string} options.module - Nombre del módulo.
 * @param {Array} options.results - Lista de resultados {input, status, message, timestamp}.
 * @param {Function} options.t - Función de traducción.
 */
export function exportOperationResults({ module, results, t }) {
  exportCSV({
    filename: `${module.toLowerCase().replace(/\s+/g, '_')}_${getDateStamp()}`,
    headers: [t('Fecha'), t('Entrada'), t('Estado'), t('Detalles')],
    rows: results.map(r => [
      r.timestamp || new Date().toISOString(),
      r.input || '',
      r.status || '',
      r.message || '',
    ])
  })
}

// ── Utilidades internas ──

function downloadBlob(content, filename, mimeType) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getDateStamp() {
  return new Date().toISOString().slice(0, 10)
}

function formatTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}
