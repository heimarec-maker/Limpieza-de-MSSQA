/**
 * exportService.js
 * Servicio para la exportación de datos a formato Excel (.xlsx).
 * Mantiene compatibilidad con módulos que usaban exportPDF.
 */

/**
 * Exporta a formato Excel real (.xlsx).
 */
export async function exportExcel({ filename, headers, rows }) {
  console.log('Exportando XLSX:', { filename, rowsCount: rows?.length });
  if (!rows || rows.length === 0) return;

  try {
    // Carga dinámica de SheetJS
    const XLSX = await import('xlsx');
    
    // Crear hoja de trabajo a partir del array de arrays
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Crear libro de trabajo (Workbook)
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Portal ETB');
    
    // Generar y descargar el archivo
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error al generar Excel moderno:', error);
    // Fallback a CSV si falla la librería moderna o no está instalada
    exportCSVFallback({ filename, headers, rows });
  }
}

/**
 * Fallback a CSV simple si falla el motor de Excel.
 */
function exportCSVFallback({ filename, headers, rows }) {
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => {
      const str = String(cell).replace(/"/g, '""');
      return `"${str}"`;
    }).join(';'))
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── FUNCIONES DE COMPATIBILIDAD ─────────────────────────────────────────────
// Estas funciones ahora exportan a Excel en lugar de PDF para cumplir con la solicitud.

/**
 * Exporta registros de actividad filtrados (Anteriormente PDF, ahora XLSX).
 */
export function exportActivityLogs(logs, t) {
  exportExcel({
    filename: `Registro_Actividad_${getDateStamp()}`,
    headers: [t('Fecha'), t('Usuario'), t('Acción'), t('Módulo'), t('Detalles'), t('Resultado')],
    rows: logs.map(l => [
      formatTimestamp(l.timestamp),
      l.usuario || '',
      l.accion || '',
      l.modulo || '',
      l.detalles || '',
      l.resultado || '',
    ])
  });
}

/**
 * Exporta la lista de usuarios (Anteriormente PDF, ahora XLSX).
 */
export function exportUsers(users, t) {
  exportExcel({
    filename: `Reporte_Usuarios_${getDateStamp()}`,
    headers: [t('Nombre'), t('Correo'), t('Rol'), t('Estado'), t('Último Acceso')],
    rows: users.map(u => [
      u.name || '',
      u.email || '',
      u.role || '',
      u.status || '',
      u.lastLogin || '',
    ])
  });
}


export function exportPDF(params) {
  console.warn('exportPDF ha sido desactivado por solicitud. Redirigiendo a Excel...');
  exportExcel(params);
}

export function exportCSV(params) {
  exportExcel(params);
}

// ─── UTILIDADES ──────────────────────────────────────────────────────────────

export function getDateStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '_');
}

export function formatTimestamp(iso) {
  if (!iso) return new Date().toLocaleString();
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Exporta resultados de operación (historial / lote) a Excel/CSV.
 * Recibe un objeto: { module, results, t }
 * - `results` es un array de objetos que idealmente contienen `input`, `status`, `message`, `timestamp`.
 */
export function exportOperationResults({ module = 'Reporte', results = [], t } = {}) {
  if (!Array.isArray(results) || results.length === 0) return;

  const cleanModule = String(module).toLowerCase().replace(/\s+/g, '_');
  const filename = `Resultados_${cleanModule}_${getDateStamp()}`;

  const headers = [
    t ? t('Fecha') : 'Fecha',
    t ? t('Entrada') : 'Entrada',
    t ? t('Estado') : 'Estado',
    t ? t('Detalles') : 'Detalles'
  ];

  const rows = results.map(r => [
    formatTimestamp(r.timestamp || r.ejecutado_at || r.created_at || ''),
    r.input || r.serial || r.raw || '',
    r.status || r.result || '',
    r.message || r.detalle || r.etapa || '',
  ]);

  exportExcel({ filename, headers, rows });
}
