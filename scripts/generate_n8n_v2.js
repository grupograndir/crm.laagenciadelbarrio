const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, 'n8n_dashboard_workflow.json');

const advisors = [
    "Jesus", "Ivan Ortego", "Luis", "Alberto", "Azu",
    "Jorge", "Eugenia", "CarmenPaula", "Cynthia",
    "Isabel  Fernando M.", "Ester", "Paula", "Jose Janeiro",
    "Ana", "Manuel Vi.", "Carolina", "Fran Escobar"
];

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

let prevNodeName = "Webhook GET";
connections["Webhook GET"] = { "main": [[]] };

advisors.forEach((advisor, i) => {
    // Add Google Sheet Node
    const nodeName = `Sheet - ${advisor}`;
    nodes.push({
        "parameters": {
            "operation": "read",
            "documentId": {
                "__rl": true, "mode": "url", "value": ""
            },
            "sheetName": {
                "__rl": true, "mode": "list", "value": ""
            },
            "options": {}
        },
        "id": `gsheet-${i}`,
        "name": nodeName,
        "type": "n8n-nodes-base.googleSheets",
        "typeVersion": 4.5,
        "position": [(i * 400) + 200, 300],
        "alwaysOutputData": true,
        "continueOnFail": true,
        "notes": `Asigna manualmente la hoja de ${advisor}`
    });

    connections[prevNodeName] = {
        "main": [[{ "node": nodeName, "type": "main", "index": 0 }]]
    };

    // Add Reset Node to prevent execution explosion
    const resetName = `Reset - ${advisor}`;
    nodes.push({
        "parameters": {
            "jsCode": "return [{ json: {} }];"
        },
        "id": `reset-${i}`,
        "name": resetName,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [(i * 400) + 400, 300],
        "notes": "Previene Rate Limit de Google"
    });

    connections[nodeName] = {
        "main": [[{ "node": resetName, "type": "main", "index": 0 }]]
    };

    prevNodeName = resetName;
});

// 3. Code Node
const codeStr = `// DASHBOARD LADB - Procesador de Datos Multi-Nodo
const result = {
    summary: { totalCalls: 0, contacted: 0, notContacted: 0 },
    advisors: [],
    lastUpdated: new Date().toISOString()
};

const advisorsMap = {};
const advisorNames = ${JSON.stringify(advisors)};

for (const advisor of advisorNames) {
    const nodeName = "Sheet - " + advisor;
    let items = [];
    try {
        items = $items(nodeName);
        if (items.length === 1 && Object.keys(items[0].json).length === 0) {
            items = []; 
        }
    } catch (e) {
        continue; 
    }

    if (items.length === 0) continue;

    advisorsMap[advisor] = { name: advisor, calls: [] };

    // Find headers based on the first row properties
    const firstRow = items[0].json;
    const headers = Object.keys(firstRow);
    if (headers.length === 0) continue;
    
    let kRef = headers[0]; 
    let kNombre = headers.find(h => /^nombre$/i.test(h));
    if (!kNombre && headers.length > 1) kNombre = headers[1];

    let kTel = headers.find(h => /^tel[eé]fono$/i.test(h));
    if (!kTel && headers.length > 2) kTel = headers[2];

    let kFecha = headers.find(h => /^fecha$/i.test(h));
    if (!kFecha && headers.length > 3) kFecha = headers[3];

    let kContactado = headers.find(h => /^contactad[oa](\\/?a)?$/i.test(h));
    if (!kContactado && headers.length > 4) kContactado = headers[4];

    let kObs = headers.find(h => /^observaciones?$/i.test(h));
    if (!kObs && headers.length > 5) kObs = headers[headers.length - 1];

    items.forEach((item, idx) => {
        const row = item.json;
        if (Object.keys(row).length === 0) return;

        const rawDate = row[kFecha];
        let dateStr = null;
        if (rawDate) {
            if (typeof rawDate === 'number') {
                const date_info = new Date((Math.floor(rawDate - 25569) * 86400) * 1000);
                dateStr = date_info.toISOString().split('T')[0];
            } else if (typeof rawDate === 'string') {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
                else dateStr = rawDate; 
            }
        }
        if (!dateStr) return; 

        const contactedRaw = String(row[kContactado] || '').toLowerCase();
        const isContacted = contactedRaw.includes('si') || contactedRaw === 'sí';

        result.summary.totalCalls++;
        if (isContacted) result.summary.contacted++;
        else result.summary.notContacted++;

        advisorsMap[advisor].calls.push({
            id: advisor + '-' + idx,
            rowIndex: idx,
            customer: String(row[kNombre] || 'Sin datos'),
            phone: String(row[kTel] || 'Sin datos'),
            date: dateStr,
            contacted: isContacted,
            obs: String(row[kObs] || ''),
            ref: String(row[kRef] || 'N/A')
        });
    });
}

result.advisors = Object.values(advisorsMap).filter(a => a.calls.length > 0);
return [{ json: result }];
`;

nodes.push({
    "parameters": {
        "mode": "runOnceForAllItems",
        "jsCode": codeStr
    },
    "id": "code-processor-001",
    "name": "Procesar Datos",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [(advisors.length * 400) + 200, 300]
});

connections[prevNodeName] = { "main": [[{ "node": "Procesar Datos", "type": "main", "index": 0 }]] };

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
    "id": "webhook-response-001",
    "name": "Responder con JSON",
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1.1,
    "position": [(advisors.length * 400) + 400, 300]
});

connections["Procesar Datos"] = { "main": [[{ "node": "Responder con JSON", "type": "main", "index": 0 }]] };

const workflow = {
    "name": "DASHBOARD LADB - Llamadas (Solución Rate Limit)",
    "nodes": nodes,
    "connections": connections,
    "settings": { "executionOrder": "v1" }
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(workflow, null, 2));
console.log('✅ Workflow JSON (Solución Rate Limit) generado.');
