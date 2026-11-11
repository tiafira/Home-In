/**
 * Helper to export data to CSV and Excel-compatible format.
 */

export function exportToCsv({ filename = 'export-data.csv', headers = [], rows = [] }) {
    const csvContent =
        '\uFEFF' + // UTF-8 BOM for Excel compatibility
        [
            headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
            ...rows.map((row) =>
                row
                    .map((cell) => {
                        const val = cell !== null && cell !== undefined ? String(cell) : '';
                        return `"${val.replace(/"/g, '""')}"`;
                    })
                    .join(',')
            ),
        ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportToExcel({
    filename = 'export-data.xls',
    title = 'Data Export Home-In',
    headers = [],
    rows = [],
}) {
    // Generate clean HTML table spreadsheet format that Excel opens natively
    const headerRow = headers.map((h) => `<th style="background-color: #1E5FC9; color: #ffffff; font-weight: bold; padding: 8px 12px; border: 1px solid #cbd5e1;">${h}</th>`).join('');
    const dataRows = rows
        .map(
            (r, idx) =>
                `<tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">` +
                r
                    .map(
                        (cell) =>
                            `<td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 11px;">${cell !== null && cell !== undefined ? cell : '-'}</td>`
                    )
                    .join('') +
                '</tr>'
        )
        .join('');

    const excelHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>${title.slice(0, 30)}</x:Name>
                            <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
        </head>
        <body>
            <h3 style="color: #1E5FC9; font-family: sans-serif;">Home-In — ${title}</h3>
            <p style="font-size: 11px; font-family: sans-serif; color: #64748b;">Tanggal Unduh: ${new Date().toLocaleString('id-ID')}</p>
            <table border="1" style="border-collapse: collapse; font-family: sans-serif;">
                <thead><tr>${headerRow}</tr></thead>
                <tbody>${dataRows}</tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.xls') ? filename : `${filename}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

