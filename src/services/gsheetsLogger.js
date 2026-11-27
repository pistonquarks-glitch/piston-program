// Sincronizador de pagos y escaneos OCR -> Google Sheets.
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

const SA_FILE = process.env.GSHEETS_SA_FILE || 'C:\\Users\\USER\\Downloads\\piston-drive-2000dcbae3a2.json';
const SHEET_ID = process.env.GSHEETS_SHEET_ID || '1JgygSw4k59YiiCc93ACIO02hCdWjvoGPmv4N5UFZP7M';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function b64(b) { return Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

function getAccessToken() {
    const sa = JSON.parse(fs.readFileSync(SA_FILE, 'utf8'));
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = { iss: sa.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
    const unsigned = b64(Buffer.from(JSON.stringify(header))) + '.' + b64(Buffer.from(JSON.stringify(claims)));
    const jwt = unsigned + '.' + b64(crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key));
    const body = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt;
    return request('oauth2.googleapis.com', '/token', 'POST', body, { 'Content-Type': 'application/x-www-form-urlencoded' })
        .then(r => {
            const p = JSON.parse(r.body);
            if (!p.access_token) throw new Error('oauth_fail: ' + r.body.slice(0, 200));
            return p.access_token;
        });
}

function request(host, pathname, method, body, headers) {
    return new Promise((resolve, reject) => {
        const req = https.request({ host, path: pathname, method, headers: headers || {} }, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => resolve({ status: res.statusCode, body: b }));
        });
        req.on('error', reject);
        req.setTimeout(20000, () => { req.destroy(); reject(new Error('request_timeout')); });
        if (body) req.write(body);
        req.end();
    });
}

async function api(pathname, method, body) {
    const token = await getAccessToken();
    return request('sheets.googleapis.com', pathname, method || 'GET', body, {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    });
}

async function ensureTabs() {
    const res = await api('/v4/spreadsheets/' + encodeURIComponent(SHEET_ID), 'GET');
    const meta = JSON.parse(res.body);
    const existing = (meta.sheets || []).map(s => s.properties.title);
    const wanted = [
        { title: 'Payments', headers: ['timestamp', 'chat', 'remitente', 'monto', 'plan', 'estado', 'operacion', 'banco_app'] },
        { title: 'OCR_Scans', headers: ['timestamp', 'chat', 'remitente', 'destinatario', 'monto', 'banco_app', 'operacion', 'clasificacion'] },
        { title: 'Dashboard', headers: ['metrica', 'valor', 'detalle'] }
    ];
    const requests = [];
    for (const w of wanted) {
        if (!existing.includes(w.title)) {
            requests.push({ addSheet: { properties: { title: w.title } } });
        }
    }
    if (requests.length) {
        await api('/v4/spreadsheets/' + encodeURIComponent(SHEET_ID) + ':batchUpdate', 'POST', JSON.stringify({ requests }));
    }
    // Encabezados y formulas del dashboard (idempotente: solo si la fila 1 esta vacia).
    for (const w of wanted) {
        const vals = await api('/v4/spreadsheets/' + encodeURIComponent(SHEET_ID) + '/values/' + encodeURIComponent(w.title + '!A1'), 'GET');
        const cur = JSON.parse(vals.body);
        const got = cur.values && cur.values[0] && cur.values[0][0];
        if (got !== w.headers[0]) {
            await api('/v4/spreadsheets/' + encodeURIComponent(SHEET_ID) + '/values/' + encodeURIComponent(w.title + '!A1') + '?valueInputOption=RAW', 'POST',
                JSON.stringify({ values: [w.headers], majorDimension: 'ROWS' }));
        }
    }
    const dash = await api('/v4/spreadsheets/' + encodeURIComponent(SHEET_ID) + '/values/' + encodeURIComponent('Dashboard!A2'), 'GET');
    const cur = JSON.parse(dash.body);
    if (!cur.values || !cur.values.length || String(cur.values[0][0] || '') !== 'Escaneos OCR totales') {
        const rows = [
            ['Escaneos OCR totales', '=COUNTA(OCR_Scans!A2:A)', ''],
            ['Escaneos a otros destinos', '=COUNTIF(OCR_Scans!H2:H,"otro_destino")', ''],
            ['Pagos aprobados', '=COUNTIF(Payments!F2:F,"aprobado")', ''],
            ['Ingresos aprobados', '=SUMIF(Payments!F2:F,"aprobado",Payments!D2:D)', 'S/'],
            ['Ingresos suscripción', '=SUMIFS(Payments!D2:D,Payments!F2:F,"aprobado",Payments!E2:E,"subscription")', 'S/'],
            ['Ingresos APP web', '=SUMIFS(Payments!D2:D,Payments!F2:F,"aprobado",Payments!E2:E,"app_web")', 'S/'],
            ['Ingresos APP físico', '=SUMIFS(Payments!D2:D,Payments!F2:F,"aprobado",Payments!E2:E,"app_fisico")', 'S/']
        ];
        await api('/v4/spreadsheets/' + encodeURIComponent(SHEET_ID) + '/values/' + encodeURIComponent('Dashboard!A2') + '?valueInputOption=USER_ENTERED', 'POST',
            JSON.stringify({ values: rows, majorDimension: 'ROWS' }));
    }
    return existing;
}

function appendRow(tab, values) {
    const range = encodeURIComponent(tab + '!A:Z');
    const body = JSON.stringify({ values: [values], majorDimension: 'ROWS' });
    return api('/v4/spreadsheets/' + encodeURIComponent(SHEET_ID) + '/values/' + range + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', 'POST', body);
}

async function appendPaymentRow(rec) {
    return appendRow('Payments', [
        String(rec.ts || new Date().toISOString()),
        String(rec.jid || rec.from || ''),
        String(rec.sender || ''),
        rec.amount == null ? '' : String(rec.amount),
        String(rec.planId || ''),
        String(rec.status || ''),
        String(rec.reference || ''),
        String(rec.app || rec.method || '')
    ]);
}

async function appendScanRow(rec) {
    return appendRow('OCR_Scans', [
        String(rec.ts || new Date().toISOString()),
        String(rec.jid || ''),
        String(rec.sender || ''),
        String(rec.receiver || ''),
        rec.amount == null ? '' : String(rec.amount),
        String(rec.app || rec.method || ''),
        String(rec.reference || ''),
        String(rec.status || '')
    ]);
}

module.exports = { appendPaymentRow, appendScanRow, ensureTabs, SHEET_ID };
