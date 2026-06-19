import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Genera y descarga un archivo PDF a partir de una tabla de datos.
 */
export async function exportPDF({ filename, title, headers, rows }) {
  if (!rows || rows.length === 0) return;

  try {

    const doc = new jsPDF({
      orientation: headers.length > 5 ? 'landscape' : 'portrait',
    });

    const accentColor = [0, 112, 243]; // #0070f3

    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text(title || 'Reporte de Sistema', 14, 22);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Portal Gestión ETB — Generado el: ${new Date().toLocaleString()}`, 14, 30);

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
        textColor: [51, 65, 85],
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] 
      },
      margin: { top: 35 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        const str = `Página ${doc.internal.getNumberOfPages()}`;
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    alert('Error al generar PDF: No se pudieron cargar las librerías necesarias. Por favor, asegúrate de que jspdf y jspdf-autotable estén instaladas.');
    
    // Intentar fallback a CSV si falla el PDF
    console.log('Intentando fallback a CSV...');
    exportCSVFallback({ filename, headers, rows });
  }
}

/**
 * Fallback simple a CSV si el PDF falla.
 */
function exportCSVFallback({ filename, headers, rows }) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
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
      l.usuario || '',
      l.accion || '',
      l.modulo || '',
      l.detalles || '',
      l.resultado || '',
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

export function exportCSV({ filename, headers, rows }) {
  exportPDF({ filename, title: filename.replace(/_/g, ' '), headers, rows });
}

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
