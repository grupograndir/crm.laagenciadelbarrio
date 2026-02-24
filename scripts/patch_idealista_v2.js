const fs = require('fs');
const path = require('path');

const inputPath = '/Users/rubenbellod/Documents/antigravity-awesome-skills/MAILS IDEALISTA (24).json';
const outputPath = '/Users/rubenbellod/Documents/antigravity-awesome-skills/MAILS IDEALISTA (24)_mod_FINAL.json';

const raw = fs.readFileSync(inputPath, 'utf8');
const data = JSON.parse(raw);

const masterNode = {
    "parameters": {
        "operation": "append",
        "documentId": {
            "__rl": true,
            "value": "",
            "mode": "list",
            "cachedResultName": "SELECCIONA_EL_NUEVO_DOCUMENTO"
        },
        "sheetName": {
            "__rl": true,
            "value": "Hoja 1",
            "mode": "list"
        },
        "columns": {
            "mappingMode": "defineBelow",
            "value": {
                "Asesor": "={{ $json.Asesor }}",
                "Referencia": "={{ $json.Referencia }}",
                "Nombre": "={{ $json.Nombre }}",
                "Teléfono": "={{ \\n  $json[\\'Teléfono\\']\\n    .replace(/^\\\\+34/, \\'\\')     // quita el prefijo +34\\n    .replace(/(\\\\d{3})(\\\\d{2})(\\\\d{2})(\\\\d{2})/, \\'$1 $2 $3 $4\\') \\n}}\\n",
                "Fecha": "={{ DateTime.fromISO($json.Fecha).toFormat('dd/LL/yyyy') }}\\n"
            },
            "matchingColumns": [],
            "schema": [
                { "id": "Asesor", "displayName": "Asesor", "type": "string" },
                { "id": "Referencia", "displayName": "Referencia", "type": "string" },
                { "id": "Nombre", "displayName": "Nombre", "type": "string" },
                { "id": "Teléfono", "displayName": "Teléfono", "type": "string" },
                { "id": "Fecha", "displayName": "Fecha", "type": "string" },
                { "id": "Contactado", "displayName": "Contactado", "type": "string" },
                { "id": "Fecha contacto", "displayName": "Fecha contacto", "type": "string" },
                { "id": "Visita", "displayName": "Visita", "type": "string" },
                { "id": "Observaciones", "displayName": "Observaciones", "type": "string" }
            ]
        },
        "options": {}
    },
    "type": "n8n-nodes-base.googleSheets",
    "typeVersion": 4.7,
    "position": [
        600,
        2100
    ],
    "id": "1e92d6e0-master-dashboard-5555",
    "name": "AÑADIR A LLAMADAS TOTALES MENSUALES",
    "credentials": {
        "googleSheetsOAuth2Api": {
            "id": "6h2VMI7wdY5B60FQ",
            "name": "LADB"
        }
    },
    "notes": "Escribe en el nuevo documento LLAMADAS TOTALES MENSUALES"
};

data.nodes.push(masterNode);

if (data.connections["Edit Fields"] && data.connections["Edit Fields"].main && data.connections["Edit Fields"].main[0]) {
    data.connections["Edit Fields"].main[0].push({
        "node": "AÑADIR A LLAMADAS TOTALES MENSUALES",
        "type": "main",
        "index": 0
    });
}

data.versionId = "modified-dashboard-master-v2";
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log('✅ MAILS IDEALISTA (24)_mod_FINAL.json generado correctamente.');
