import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Servicio centralizado de exportación de datos.
 * Ahora soporta exportación directa a PDF con diseño profesional.
 */

/**
 * Genera y descarga un archivo PDF a partir de una tabla de datos.
 * @param {Object} options
 * @param {string} options.filename - Nombre del archivo (sin extensión).
 * @param {string} options.title - Título que aparecerá en el PDF.
 * @param {string[]} options.headers - Encabezados de las columnas.
 * @param {Array<Array<string>>} options.rows - Filas de datos.
 */
export function exportPDF({ filename, title, headers, rows }) {
  if (!rows || rows.length === 0) return;

  const doc = new jsPDF({
    orientation: headers.length > 5 ? 'landscape' : 'portrait',
  });

  // Estilo Glassmorphism / Premium Colors
  const accentColor = [0, 112, 243]; // #0070f3 del Portal

  // Título
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(title || 'Reporte de Sistema', 14, 22);

  // Fecha de generación
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Portal Gestión ETB — Generado el: ${new Date().toLocaleString()}`, 14, 30);

  // Tabla con jspdf-autotable
  autoTable(doc, {
    startY: 35,
    head: [headers],
    body: rows,
    theme: 'striped',
    headStyles: { 
      fillColor: accentColor, 
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85], // Slate 700
    },
    alternateRowStyles: { 
      fillColor: [validColor(accentColor, 0.03)] 
    },
    margin: { top: 35 },
    didDrawPage: (data) => {
      // Pie de página
      doc.setFontSize(8);
      const str = `Página ${doc.internal.getNumberOfPages()}`;
      doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
    }
  });

  doc.save(`${filename}.pdf`);
}

// Auxiliar para colores de filas
function validColor(base, alpha) {
  return [248, 250, 252]; // Slate 50
}

/**
 * Exporta registros de actividad filtrados como PDF.
 */
export function exportActivityLogs(logs, t) {
  exportPDF({
    filename: `Registro_Actividad_${getDateStamp()}`,
    title: t('Registro de Actividad'),
    headers: [t('Fecha'), t('Usuario'), t('Acción'), t('Módulo'), t('Detalles'), t('Resultado')],
    rows: logs.map(l => [
      formatTimestamp(l.timestamp),
      l.usuario,
      l.accion,
      l.modulo,
      l.detalles || '',
      l.resultado,
    ])
  });
}

/**
 * Exporta la lista de usuarios como PDF.
 */
export function exportUsers(users, t) {
  exportPDF({
    filename: `Reporte_Usuarios_${getDateStamp()}`,
    title: t('Reporte de Usuarios'),
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

/**
 * Exporta resultados de operaciones como PDF.
 */
export function exportOperationResults({ module, results, t }) {
  exportPDF({
    filename: `Resultados_${module.toLowerCase().replace(/\s+/g, '_')}_${getDateStamp()}`,
    title: `${t('Resultados')} - ${module}`,
    headers: [t('Fecha'), t('Entrada'), t('Estado'), t('Detalles')],
    rows: results.map(r => [
      formatTimestamp(r.timestamp),
      r.input || '',
      r.status || '',
      r.message || '',
    ])
  });
}

// Exportar CSV se mantiene por si se necesita en el futuro, pero se renombra internamente
export function exportCSV({ filename, headers, rows }) {
  // Por ahora lo redirigimos a PDF si el usuario quiere "todo directo a pdf"
  exportPDF({ filename, title: filename.replace(/_/g, ' '), headers, rows });
}

// ── Utilidades internas ──

function getDateStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '_');
}

function formatTimestamp(iso) {
  if (!iso) return new Date().toLocaleString();
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
