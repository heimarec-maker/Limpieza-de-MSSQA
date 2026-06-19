/**
 * exportService.js
 * Servicio para la exportación de datos a formato Excel (.xlsx).
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
    // Fallback a CSV si falla la librería moderna
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

// Funciones auxiliares para nombres de archivo y fechas
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
