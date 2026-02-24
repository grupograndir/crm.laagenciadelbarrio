const xlsx = require('xlsx');
const fs = require('fs');

const sourceFile = '/Users/rubenbellod/Documents/antigravity-awesome-skills/Llamadas Contactos IA..xlsx';
const targetFile = '/Users/rubenbellod/Documents/antigravity-awesome-skills/LLAMADAS TOTALES MENSUALES LADB.xlsx';

console.log('Leyendo archivo fuente:', sourceFile);
const workbook = xlsx.readFile(sourceFile);

let targetWorkbook;
let targetSheetName = 'Hoja 1';

try {
    if (fs.existsSync(targetFile)) {
        targetWorkbook = xlsx.readFile(targetFile);
        targetSheetName = targetWorkbook.SheetNames[0];
    } else {
        targetWorkbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(targetWorkbook, xlsx.utils.aoa_to_sheet([]), targetSheetName);
    }
} catch (e) {
    targetWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(targetWorkbook, xlsx.utils.aoa_to_sheet([]), targetSheetName);
}

let existingData = [];
// Inicializamos cabeceras
existingData.push(['Asesor', 'Referencia', 'Nombre', 'Teléfono', 'Fecha', 'Contactado']);

let rowCount = 0;

for (const sheetName of workbook.SheetNames) {
    if (sheetName.toLowerCase().includes('plantilla') || sheetName.toLowerCase().includes('etiquetas')) continue;

    console.log(`Procesando hoja: ${sheetName}`);
    const advisorName = sheetName.trim();

    const sheet = workbook.Sheets[sheetName];
    // raw values for easy date detection
    const data = xlsx.utils.sheet_to_json(sheet, { raw: true, defval: '' });

    for (const row of data) {
        if (Object.keys(row).length === 0) continue;

        // Dynamic key matching logic
        const kRef = Object.keys(row).find(k => /^ref/i.test(k));
        const kNombre = Object.keys(row).find(k => /^nombre$|^cliente$/i.test(k)) || Object.keys(row).find(k => k.toLowerCase().includes('nombre'));
        const kTel = Object.keys(row).find(k => /^tel[eé]fono$|^movil$/i.test(k));
        const kFecha = Object.keys(row).find(k => /^fecha/i.test(k));
        const kContactado = Object.keys(row).find(k => /^contactad[oa]|^estado|^visita/i.test(k)) || Object.keys(row).find(k => k.toLowerCase() === 'no' || k.toLowerCase() === 'si');

        let ref = kRef ? row[kRef] : '';
        let nombre = kNombre ? row[kNombre] : '';
        let telefono = kTel ? row[kTel] : '';
        let fecha = kFecha ? row[kFecha] : '';
        let contactado = kContactado ? row[kContactado] : '';

        // Fechas de Excel están en formato serial numérico a veces
        if (typeof fecha === 'number') {
            try {
                const dateObj = xlsx.SSF.parse_date_code(fecha);
                fecha = `${String(dateObj.d).padStart(2, '0')}/${String(dateObj.m).padStart(2, '0')}/${dateObj.y}`;
            } catch (e) {
                // Keep as is
            }
        } else if (typeof fecha === 'string' && fecha.includes('T')) {
            fecha = fecha.split('T')[0]; // simple ISO truncate
        }

        // Limpieza básica
        ref = String(ref).trim();
        nombre = String(nombre).trim();
        telefono = String(telefono).trim();
        fecha = String(fecha).trim();
        contactado = String(contactado).trim();

        if (!nombre && !telefono && !ref) continue; // fila vacía errónea

        existingData.push([advisorName, ref, nombre, telefono, fecha, contactado]);
        rowCount++;
    }
}

const newSheet = xlsx.utils.aoa_to_sheet(existingData);

// Ajustar ancho de columnas para que quede bonito
newSheet['!cols'] = [
    { wch: 15 }, // Asesor
    { wch: 15 }, // Referencia
    { wch: 30 }, // Nombre
    { wch: 15 }, // Teléfono
    { wch: 12 }, // Fecha
    { wch: 10 }  // Contactado
];

targetWorkbook.Sheets[targetSheetName] = newSheet;
xlsx.writeFile(targetWorkbook, targetFile);

console.log(`✅ ¡Misión Cumplida! Se han consolidado ${rowCount} registros en ${targetFile}`);
