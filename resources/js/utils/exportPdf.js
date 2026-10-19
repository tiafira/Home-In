export function exportToPdf({
    title = 'Laporan Data',
    subtitle = '',
    branchName = 'Semua Cabang',
    columns = [],
    data = [],
    summary = null,
}) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Gagal membuka jendela cetak. Pastikan pop-up diizinkan pada browser Anda.');
        return;
    }

    const currentDate = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const userStr = localStorage.getItem('home_in_user');
    let printedBy = 'Admin Home-In';
    try {
        if (userStr) {
            const u = JSON.parse(userStr);
            printedBy = `${u.nama || u.name || 'Admin'} (${(u.role || 'admin').toUpperCase()})`;
        }
    } catch (e) {}

    const tableHeaders = columns
        .map(
            (col) =>
                `<th style="padding: 10px 12px; text-align: ${col.align || 'left'}; background-color: #F4F6FA; color: #1F2A44; font-weight: 700; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #E2E8F0;">${col.header}</th>`
        )
        .join('');

    const tableRows = data
        .map((row, idx) => {
            const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
            const cells = columns
                .map((col) => {
                    let val = '';
                    if (typeof col.render === 'function') {
                        val = col.render(row, idx);
                    } else if (col.accessor) {
                        val = row[col.accessor] !== undefined && row[col.accessor] !== null ? row[col.accessor] : '-';
                    }
                    return `<td style="padding: 9px 12px; text-align: ${col.align || 'left'}; border-bottom: 1px solid #EDF2F7; font-size: 11px; color: #334155;">${val}</td>`;
                })
                .join('');
            return `<tr style="background-color: ${bg};">${cells}</tr>`;
        })
        .join('');

    const summaryHtml = summary
        ? `<div style="margin-top: 18px; padding: 12px 16px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 11px; color: #1F2A44;"><strong>Ringkasan:</strong> ${summary}</div>`
        : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>${title} - Home-In</title>
    <style>
        body { font-family: sans-serif; color: #1F2A44; margin: 20px; }
        .header-wrap { display: flex; justify-content: space-between; border-bottom: 2px solid #1E5FC9; padding-bottom: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        @media print { .no-print { display: none !important; } }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 15px; padding: 10px; background: #EAF1FC; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; font-weight: 600; color: #1E5FC9;">Pratinjau Cetak / PDF Home-In</span>
        <button onclick="window.print()" style="padding: 8px 16px; background: #1E5FC9; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Cetak / Simpan PDF</button>
    </div>
    <div class="header-wrap">
        <div>
            <strong style="font-size: 20px; color: #1E5FC9;">Home-In</strong>
            <div style="font-size: 11px; color: #64748B;">${title}</div>
            ${subtitle ? `<div style="font-size: 10px; color: #64748B;">${subtitle}</div>` : ''}
        </div>
        <div style="text-align: right; font-size: 10px; color: #64748B;">
            <div>Cabang: ${branchName}</div>
            <div>Tanggal: ${currentDate}</div>
            <div>Oleh: ${printedBy}</div>
        </div>
    </div>
    <table>
        <thead><tr>${tableHeaders}</tr></thead>
        <tbody>${tableRows || '<tr><td colspan="10" style="text-align:center; padding: 20px;">Tidak ada data.</td></tr>'}</tbody>
    </table>
    ${summaryHtml}
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

export default exportToPdf;

