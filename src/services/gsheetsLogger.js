// Sincronizador de pagos verificados -> Google Sheets
// Usa la Service Account (SA) en JSON + Sheets API v4 (JWT bearer grant, sin dependencias externas).
// Se activa SOLO con GSHEETS_SYNC=1 y GSHEETS_SHEET_ID (por defecto la hoja Logs).
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SA_FILE = process.env.GSHEETS_SA_FILE || 'C:\\Users\\USER\\Downloads\\piston-drive-2000dcbae3a2.json';
const SHEET_ID = process.env.GSHEETS_SHEET_ID || '1JgygSw4k59YiiCc93ACIO02hCdWjvoGPmv4N5UFZP7M';
const SHEET_TAB = process.env.GSHEETS_SHEET_TAB || 'Logs';
const RANGE = `${SHEET_TAB}!A:I`;
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getAccessToken() {
  const sa = JSON.parse(fs.readFileSync(SA_FILE, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = base64url(Buffer.from(JSON.stringify(header))) + '.' + base64url(Buffer.from(JSON.stringify(claims)));
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key);
  const jwt = unsigned + '.' + base64url(signature);
  const body = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt;
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(b);
          if (p.access_token) resolve(p.access_token);
          else reject(new Error('oauth_fail: ' + String(b).slice(0, 300)));
        } catch (e) { reject(new Error('oauth_parse: ' + String(b).slice(0, 300))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('oauth_timeout')); });
    req.write(body);
    req.end();
  });
}

// Aprende una fila con los datos del comprobante. Fire-and-forget desde el bridge.
async function appendPaymentRow(rec) {
  const token = await getAccessToken();
  const values = [[
    String(rec.ts || new Date().toISOString()),
    String(rec.from || ''),
    String(rec.messageId || ''),
    String(rec.status || ''),
    String(rec.method || ''),
    rec.amount == null ? '' : String(rec.amount),
    String(rec.reference || ''),
    rec.consistencyScore == null ? '' : String(rec.consistencyScore),
    String(rec.aiVerdict || '').slice(0, 300),
  ]];
  const body = JSON.stringify({ values, majorDimension: 'ROWS' });
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: 'sheets.googleapis.com',
      path: '/v4/spreadsheets/' + encodeURIComponent(SHEET_ID) + '/values/' + encodeURIComponent(RANGE) + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve({ ok: true, status: res.statusCode });
        else reject(new Error('sheets_http_' + res.statusCode + ': ' + String(b).slice(0, 300)));
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('sheets_timeout')); });
    req.write(body);
    req.end();
  });
}

module.exports = { appendPaymentRow, SHEET_ID, SHEET_TAB };
