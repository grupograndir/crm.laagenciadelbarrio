const fs = require('fs');

const inputPath = '/Users/rubenbellod/Documents/antigravity-awesome-skills/MAILS IDEALISTA (24).json';
const outputPath = '/Users/rubenbellod/Documents/antigravity-awesome-skills/MAILS IDEALISTA (24)_mod.json';

const raw = fs.readFileSync(inputPath, 'utf8');
const data = JSON.parse(raw);

// 1. Create the new DASHBOARD MASTER node
const masterNode = {
    "parameters": {
        "operation": "append",
        "documentId": {
            "__rl": true,
            "value": "1pBklzQ4pRU-JDISvWuz74cykdouhWuq9yroswwrgRvU",
            "mode": "list",
            "cachedResultName": "REGISTRO"
        },
        "sheetName": {
            "__rl": true,
            "value": "TODAS_LAS_LLAMADAS",
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
    "id": "1e92d6e0-master-dashboard-4927",
    "name": "DASHBOARD MASTER",
    "credentials": {
        "googleSheetsOAuth2Api": {
            "id": "6h2VMI7wdY5B60FQ",
            "name": "LADB"
        }
    },
    "notes": "Guarda TODOS los registros centralizados para el Dashboard Web"
};

// Push node
data.nodes.push(masterNode);

// 2. Add connection from 'Edit Fields' to 'DASHBOARD MASTER'
if (data.connections["Edit Fields"] && data.connections["Edit Fields"].main && data.connections["Edit Fields"].main[0]) {
    data.connections["Edit Fields"].main[0].push({
        "node": "DASHBOARD MASTER",
        "type": "main",
        "index": 0
    });
}

// Update the version id so it imports properly if needed
data.versionId = "modified-dashboard-master";

// Write file
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log('✅ MAILS IDEALISTA (24)_mod.json generated successfully. Added DASHBOARD MASTER node.');
