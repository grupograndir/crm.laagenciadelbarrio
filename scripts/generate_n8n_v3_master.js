const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, 'n8n_dashboard_workflow.json');

const nodes = [];
const connections = {};

// 1. Webhook Node
nodes.push({
    "parameters": {
        "httpMethod": "GET",
        "path": "ladb-dashboard-data",
        "responseMode": "responseNode",
        "options": { "allowedOrigins": "*" }
    },
    "id": "webhook-trigger-001",
    "name": "Webhook GET",
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 2,
    "position": [0, 300]
});

// 2. Google Sheets Node (Read Master)
nodes.push({
    "parameters": {
        "operation": "read",
        "documentId": {
            "__rl": true, "mode": "url", "value": ""
        },
        "sheetName": {
            "__rl": true, "mode": "list", "value": "TODAS_LAS_LLAMADAS"
        },
        "options": {
            "returnAllMatches": true
        }
    },
    "id": "gsheet-master",
    "name": "Google Sheets - MASTER",
    "type": "n8n-nodes-base.googleSheets",
    "typeVersion": 4.5,
    "position": [250, 300],
    "alwaysOutputData": true,
    "notes": "Configura tu cuenta y selecciona el documento de Google Sheets (donde esté la pestaña TODAS_LAS_LLAMADAS)"
});

connections["Webhook GET"] = {
    "main": [[{ "node": "Google Sheets - MASTER", "type": "main", "index": 0 }]]
};

// 3. Code Node
const codeStr = `// DASHBOARD LADB - Procesador de Datos de Hoja Maestra centralizada
const items = $input.all();

const result = {
    summary: { totalCalls: 0, contacted: 0, notContacted: 0 },
    advisors: [],
    lastUpdated: new Date().toISOString()
};

const advisorsMap = {};

items.forEach((item, idx) => {
    const row = item.json;
    if (Object.keys(row).length === 0) return;

    // Detect headers based on content or keys
    const kAsesor = Object.keys(row).find(k => /^asesora?$/i.test(k)) || 'Asesor';
    const kRef = Object.keys(row).find(k => /^ref/i.test(k)) || 'Referencia';
    const kNombre = Object.keys(row).find(k => /^nombre$|^cliente$/i.test(k)) || 'Nombre';
    const kTel = Object.keys(row).find(k => /^tel[eé]fono$|^movil$/i.test(k)) || 'Teléfono';
    const kFecha = Object.keys(row).find(k => /^fecha$/i.test(k)) || 'Fecha';
    const kContactado = Object.keys(row).find(k => /^contactad[oa](\\/?a)?$|^estado|^visita/i.test(k)) || 'Contactado';
    const kObs = Object.keys(row).find(k => /^observaciones?$/i.test(k)) || 'Observaciones';

    const advisorName = row[kAsesor] || 'GENERAL';
    if (!advisorsMap[advisorName]) {
        advisorsMap[advisorName] = { name: String(advisorName), calls: [] };
    }

    let dateStr = row[kFecha] || '';
    if (typeof dateStr === 'number') {
        const d = new Date((Math.floor(dateStr - 25569) * 86400) * 1000);
        dateStr = d.toISOString().split('T')[0];
    } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0];
    }

    const contactedRaw = String(row[kContactado] || '').toLowerCase();
    const isContacted = contactedRaw.includes('si') || contactedRaw === 'sí' || contactedRaw.includes('true') || contactedRaw === '1';

    result.summary.totalCalls++;
    if (isContacted) result.summary.contacted++;
    else result.summary.notContacted++;

    advisorsMap[advisorName].calls.push({
        id: advisorName + '-' + idx,
        customer: String(row[kNombre] || 'Sin datos'),
        phone: String(row[kTel] || 'Sin datos'),
        date: dateStr,
        contacted: isContacted,
        obs: String(row[kObs] || ''),
        ref: String(row[kRef] || 'N/A')
    });
});

result.advisors = Object.values(advisorsMap);
return [{ json: result }];
`;

nodes.push({
    "parameters": {
        "mode": "runOnceForAllItems",
        "jsCode": codeStr
    },
    "id": "code-processor-001",
    "name": "Procesar Datos V3",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [500, 300]
});

connections["Google Sheets - MASTER"] = {
    "main": [[{ "node": "Procesar Datos V3", "type": "main", "index": 0 }]]
};

// 4. Webhook Response
nodes.push({
    "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}",
        "options": {
            "responseHeaders": {
                "entries": [
                    { "name": "Access-Control-Allow-Origin", "value": "*" },
                    { "name": "Content-Type", "value": "application/json" }
                ]
            }
        }
    },
    "id": "webhook-response-v3",
    "name": "Responder con JSON",
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1.1,
    "position": [750, 300]
});

connections["Procesar Datos V3"] = {
    "main": [[{ "node": "Responder con JSON", "type": "main", "index": 0 }]]
};

const workflow = {
    "name": "DASHBOARD LADB - Lectura Única Maestra (v3)",
    "nodes": nodes,
    "connections": connections,
    "settings": { "executionOrder": "v1" }
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(workflow, null, 2));
console.log('✅ Workflow JSON (Versión 3 Hoja Maestra) generado en', OUTPUT_PATH);
