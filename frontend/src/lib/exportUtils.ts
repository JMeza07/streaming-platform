// src/lib/exportUtils.ts
import { dialog } from '@/components/Dialog';

export interface ColumnDef {
  key: string;
  label: string;
  format?: (value: any, row: any) => string;
}

export interface SummaryCard {
  label: string;
  value: string | number;
}

export interface PrintReportOptions {
  title: string;
  subtitle?: string;
  date?: string;
  summaryCards?: SummaryCard[];
  columns: ColumnDef[];
  rows: any[];
  footerNotes?: string;
  platformName?: string;
}

/**
 * Exporta un arreglo de datos a un archivo CSV con BOM UTF-8 para compatibilidad total con Excel.
 */
export function exportToCSV(filename: string, columns: ColumnDef[], data: any[]) {
  if (!data || data.length === 0) {
    dialog.alert('No hay datos disponibles para exportar.', { type: 'warning', title: 'Sin Datos' });
    return;
  }

  // Encabezados
  const headerRow = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');

  // Filas
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        const rawVal = col.format ? col.format(row[col.key], row) : row[col.key];
        const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
        return `"${valStr.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  // BOM para UTF-8 (\uFEFF)
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\.csv$/, '')}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Genera una ventana imprimible profesional y dispara la vista de impresión del navegador.
 */
export function triggerPrintReport(options: PrintReportOptions) {
  const { title, subtitle, date, summaryCards, columns, rows, footerNotes } = options;

  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    dialog.alert('Por favor permita ventanas emergentes (pop-ups) para generar el reporte de impresión.', { type: 'warning', title: 'Ventana Bloqueada' });
    return;
  }

  const currentDate = date || new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });

  const summaryCardsHtml = summaryCards && summaryCards.length > 0
    ? `
      <div class="kpi-grid">
        ${summaryCards
          .map(
            (c) => `
          <div class="kpi-card">
            <div class="kpi-label">${c.label}</div>
            <div class="kpi-val">${c.value}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `
    : '';

  const tableHeaderHtml = columns.map((col) => `<th>${col.label}</th>`).join('');

  const tableRowsHtml = rows
    .map(
      (row, idx) => `
    <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
      ${columns
        .map((col) => {
          const val = col.format ? col.format(row[col.key], row) : row[col.key];
          return `<td>${val !== undefined && val !== null ? val : '-'}</td>`;
        })
        .join('')}
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${title} - Reporte</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
        body { margin: 0; padding: 24px; color: #111827; background: #fff; font-size: 11px; }
        .header { border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
        .title { font-size: 20px; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.5px; }
        .subtitle { font-size: 11px; color: #6b7280; margin-top: 4px; }
        .date { font-size: 10px; color: #9ca3af; text-align: right; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 18px; }
        .kpi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; }
        .kpi-label { font-size: 9px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.5px; }
        .kpi-val { font-size: 16px; font-weight: 700; color: #111827; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
        th { background: #111827; color: #fff; text-align: left; padding: 7px 9px; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
        td { padding: 6px 9px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        tr.even { background: #ffffff; }
        tr.odd { background: #f9fafb; }
        .footer { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-blue { background: #e0f2fe; color: #0369a1; }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">${title}</h1>
          ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
        </div>
        <div class="date">
          <strong>${(options.platformName || 'SISTEMA').toUpperCase()} BACKOFFICE</strong><br>
          Generado: ${currentDate}
        </div>
      </div>

      ${summaryCardsHtml}

      <table>
        <thead>
          <tr>${tableHeaderHtml}</tr>
        </thead>
        <tbody>
          ${tableRowsHtml || '<tr><td colspan="' + columns.length + '" style="text-align:center;padding:20px;">No se encontraron registros.</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div>${footerNotes || 'Documento confidencial para uso administrativo exclusivo.'}</div>
        <div>Total Registros: <strong>${rows.length}</strong></div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
