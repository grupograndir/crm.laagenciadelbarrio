const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../../Llamadas Contactos IA..xlsx');
const OUTPUT_PATH = path.join(__dirname, '../src/lib/calls-data.json');

function excelDateToJSDate(serial) {
    if (!serial || isNaN(serial)) return null;
    // Handle if it's already a string date
    if (typeof serial === 'string') {
        const d = new Date(serial);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return null;
    }
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
}

// Hojas a excluir del procesamiento
const EXCLUDED_SHEETS = ['Plantilla'];

try {
    const workbook = xlsx.readFile(EXCEL_PATH);
    const result = {
        summary: {
            totalCalls: 0,
            contacted: 0,
            notContacted: 0
        },
        advisors: []
    };

    workbook.SheetNames
        .filter(name => !EXCLUDED_SHEETS.includes(name))
        .forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];

            // Leer como array de arrays para capturar SIEMPRE la primera columna
            const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            if (rawData.length < 2) return; // Solo header, sin datos

            const headers = rawData[0].map(h => h ? String(h).trim() : '');
            const rows = rawData.slice(1);

            // Encontrar índices de columnas (la primera columna SIEMPRE es referencia)
            const colIdx = {
                ref: 0, // Primera columna = referencia SIEMPRE
                nombre: headers.findIndex(h => /^nombre$/i.test(h)),
                telefono: headers.findIndex(h => /^tel[eé]fono$/i.test(h)),
                fecha: headers.findIndex(h => /^fecha$/i.test(h)),
                contactado: headers.findIndex(h => /^contactad[oa](\/?a)?$/i.test(h)),
                fechaContacto: headers.findIndex(h => /^fecha\s*contacto$/i.test(h)),
                obs: headers.findIndex(h => /^observaciones?$/i.test(h)),
            };

            const advisorData = {
                name: sheetName,
                calls: []
            };

            rows.forEach((row, idx) => {
                if (!row || row.length === 0) return;

                const fecha = colIdx.fecha >= 0 ? row[colIdx.fecha] : null;
                const dateStr = excelDateToJSDate(fecha);
                if (!dateStr) return; // Sin fecha = fila vacía

                const contactedRaw = (colIdx.contactado >= 0 ? String(row[colIdx.contactado] || '') : '').toLowerCase();
                const isContacted = contactedRaw.includes('si') || contactedRaw === 'sí';

                result.summary.totalCalls++;
                if (isContacted) result.summary.contacted++;
                else result.summary.notContacted++;

                const customerName = colIdx.nombre >= 0 ? (row[colIdx.nombre] || 'Sin datos') : 'Sin datos';
                const customerPhone = colIdx.telefono >= 0 ? (row[colIdx.telefono] || 'Sin datos') : 'Sin datos';
                const refValue = row[0] || 'N/A'; // Primera columna SIEMPRE
                const obsValue = colIdx.obs >= 0 ? (row[colIdx.obs] || '') : '';

                advisorData.calls.push({
                    id: `${sheetName}-${idx}`,
                    rowIndex: idx, // Para ordenar por posición de fila
                    customer: String(customerName),
                    phone: String(customerPhone),
                    date: dateStr,
                    dateContact: colIdx.fechaContacto >= 0 ? excelDateToJSDate(row[colIdx.fechaContacto]) : null,
                    contacted: isContacted,
                    obs: String(obsValue),
                    ref: String(refValue)
                });
            });

            if (advisorData.calls.length > 0) {
                result.advisors.push(advisorData);
            }
        });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
    console.log('✅ Datos procesados con éxito.');
    console.log(`   📊 Registros totales: ${result.summary.totalCalls}`);
    console.log(`   👤 Asesores: ${result.advisors.map(a => a.name).join(', ')}`);
    console.log(`   ✅ Contactados: ${result.summary.contacted}`);
    console.log(`   ⏳ Pendientes: ${result.summary.notContacted}`);
} catch (error) {
    console.error('❌ Error al procesar el Excel:', error);
}
