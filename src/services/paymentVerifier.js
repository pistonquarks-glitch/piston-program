// Verificador de pagos por OCR (Tesseract local) + analisis con IA (OpenRouter)
// Flujo: imagen -> OCR (spa+eng) -> parseo determinista (YAPE/PLIN/transferencia) ->
//        validacion de consistencia -> verificacion opcional con IA -> respuesta WhatsApp
const { execFile } = require('child_process');
const path = require('path');
const os = require('os');

const TESSERACT_PATH = process.env.TESSERACT_PATH || 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
const TESSDATA_DIR = process.env.TESSERACT_TESSDATA || path.join(os.homedir(), '.tessdata');

// Ejecuta OCR sobre una imagen con Tesseract (spa+eng). Devuelve el texto reconocido.
function ocrImage(imagePath, langs) {
  const language = langs || 'spa+eng';
  return new Promise((resolve, reject) => {
    if (!TESSERACT_PATH || !imagePath) return reject(new Error('tesseract_config_missing'));
    const args = [imagePath, 'stdout', '-l', language, '--tessdata-dir', TESSDATA_DIR, '--psm', '6'];
    execFile(TESSERACT_PATH, args, {
      timeout: 60000,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
      encoding: 'utf8',
    }, (err, stdout) => {
      if (err) return reject(new Error('tesseract_failed: ' + String(err.message || err).slice(0, 200)));
      resolve(String(stdout || ''));
    });
  });
}

function stripAccent(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function cleanSpaces(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function pick(re, t, group = 1) { const m = String(t || '').match(re); return m ? cleanSpaces(m[group]) : null; }

// Parseo determinista de comprobantes (YAPE / PLIN / transferencias / bancos)
function parseReceipt(raw) {
  const original = String(raw || '');
  const t = stripAccent(original);
  const tl = t.toLowerCase();

  let method = null;
  let app = null;
  if (/\bya?pe\b/i.test(tl) || /yapeaste/i.test(tl) || /te\s+yapeo/i.test(tl)) { method = 'YAPE'; app = 'Yape'; }
  else if (/\bplin\b/i.test(tl)) { method = 'PLIN'; app = 'Plin'; }
  else if (/transferencia|\bbcp\b|\bbbva\b|scotiabank|interbank|banco\s+de\s+la\s+nacion|banbif|pichincha|mibanco/i.test(tl)) { method = 'BANCO/TRANSFERENCIA'; }

  if (!app) {
    if (/\bbcp\b/i.test(tl)) app = 'BCP';
    else if (/\bbbva\b/i.test(tl)) app = 'BBVA';
    else if (/interbank/i.test(tl)) app = 'Interbank';
    else if (/scotiabank/i.test(tl)) app = 'Scotiabank';
    else if (/banco\s+de\s+la\s+nacion|nacion/i.test(tl)) app = 'Banco de la Nación';
    else if (/banbif/i.test(tl)) app = 'Banbif';
    else if (/pichincha/i.test(tl)) app = 'Pichincha';
    else if (/mibanco/i.test(tl)) app = 'Mibanco';
  }
  if (!app && method) app = method === 'BANCO/TRANSFERENCIA' ? 'Banco/Transferencia' : method;

  // Monto
  const cleanNum = (s) => {
    const v = String(s || '').replace(/[^\d.,]/g, '').replace(/,/g, '');
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  let amount = null;
  const labeled = t.match(/(?:monto|total|importe|abono|envio|enviado|paga(?:ste|do)?|pagado)\s*[:\-=]?\s*(?:s\/?\.?\s*|soles?\s*|pen\s*|us\$?\s*|\$\s*)?([\d][\d,]*(?:\.\d{1,2})?)/i);
  if (labeled) amount = cleanNum(labeled[1]);
  if (amount == null) {
    const bare = t.match(/s\/?\.?\s*([\d][\d,]*(?:\.\d{1,2})?)/i);
    if (bare) amount = cleanNum(bare[1]);
  }
  if (amount == null) {
    const dollar = t.match(/\$\s*([\d][\d,]*(?:\.\d{1,2})?)/i);
    if (dollar) amount = cleanNum(dollar[1]);
  }
  if (amount === 0) amount = null;

  // Numero de operacion / referencia
  let reference = null;
  const refPats = [
    /(?:n(?:ro|umero|°|º|o)\.?\s*(?:de\s*)?(?:operacion|operación|op\.?|transaccion|transacción|movimiento))\s*[:\-–]?\s*([A-Za-z0-9\-]{4,})/i,
    /(?:codigo|código)\s*(?:de\s*)?(?:operacion|operación|seguridad|transaccion|transacción)?\s*[:\-–]?\s*([A-Za-z0-9\-]{4,})/i,
    /(?:operacion|operación)\s*[:\-–]?\s*([A-Za-z0-9\-]{4,})/i,
    /(?:referencia|ref\.?)\s*[:\-–]?\s*([A-Za-z0-9\-]{4,})/i,
    /(?:n[°ºo]\.?\s*op\.?)\s*[:\-–]?\s*([A-Za-z0-9\-]{4,})/i,
  ];
  for (const re of refPats) { const m = t.match(re); if (m) { reference = cleanSpaces(m[1]); break; } }

  // Fecha y hora
  const date = pick(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/, t);
  const time = pick(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?)/i, t);

  // Destinatario / enviado a / recibido por
  const receiver = pick(/(?:enviado\s+a|para|destinatario|a\s+nombre\s+de|beneficiario|pago\s+a|yapeaste\s+a)\s*[:\-–]?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s\.]{2,40})/i, original)
    || pick(/(?:enviado\s+a|para|destinatario|a\s+nombre\s+de|beneficiario|pago\s+a|yapeaste\s+a)\s*[:\-–]?\s*([A-Za-z][A-Za-z\s\.]{2,40})/i, t);

  // Remitente / de quien / enviado por
  const sender = pick(/(?:te\s+yapeo|te\s+yapeó|te\s+pago|te\s+pagó|enviado\s+por|de|desde|remitente|origen)\s*[:\-–]?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s\.]{2,40})/i, original)
    || pick(/(?:te\s+yapeo|te\s+pago|enviado\s+por|desde|remitente|origen)\s*[:\-–]?\s*([A-Za-z][A-Za-z\s\.]{2,40})/i, t);

  // Teléfono/celular destino o asociado (Perú: 9 dígitos, a veces con máscara)
  const phone = pick(/(?:celular|telefono|tel\.?|numero|número|destino)\s*[:\-–]?\s*(\+?51[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{3}|\d{3}[\s\-\*]{1,3}\d{3}[\s\-\*]{0,3}\d{0,3}|\d{9})/i, t)
    || pick(/(\b9\d{2}[\s\-]?\d{3}[\s\-]?\d{3}\b)/, t);

  // Cuenta/destino bancario si aparece
  const account = pick(/(?:cuenta|cci)\s*(?:destino|de\s*destino)?\s*[:\-–]?\s*([\d\-\s]{8,30})/i, t);

  // Moneda
  const currency = /s\/|soles|\bpen\b/i.test(tl) ? 'PEN (S/)' : (/\$|usd|dolares/i.test(tl) ? 'USD ($)' : null);

  // Marcadores de exito/estado
  const successMarkers = /(exito|exitosa|exitoso|completad[oa]|confirmad[oa]|recibid[oa]|realizad[oa]|aprobad[oa]|v[aá]lid[oa]|comprobante|pago (?:exitoso|confirmado|realizado)|transferencia (?:realizada|exitosa|confirmada)|yapeaste|te yapeo|te pago)/i.test(tl);

  // Mensaje/nota si aparece
  const note = pick(/(?:mensaje|nota|concepto|detalle|glosa)\s*[:\-–]?\s*([^\n\r]{2,80})/i, original);

  return {
    method,
    app,
    amount: (amount && amount > 0) ? amount : null,
    currency,
    reference,
    date,
    time,
    sender: sender || null,
    receiver: receiver || null,
    phone: phone || null,
    account: account ? cleanSpaces(account).replace(/\s+/g, ' ') : null,
    note: note || null,
    successMarkers,
    rawText: original,
  };
}

// Validacion de consistencia (determinista). Devuelve { ok, reasons[], score 0..100 }
function verifyReceiptConsistency(p) {
  const reasons = [];
  if (!p) return { ok: false, reasons: ['No se pudo extraer datos del comprobante'], score: 0 };
  if (!p.method && !p.app) reasons.push('Aplicación/banco no detectado (Yape/Plin/transferencia)');
  if (p.amount == null || !(p.amount > 0)) reasons.push('Monto no detectado o inválido');
  if (!p.reference && !p.successMarkers) reasons.push('Sin número de operación ni marcador de pago confirmado');
  // Puntaje base por campos clave presentes
  let score = 100 - reasons.length * 25;
  if (p.reference) score += 5;
  if (p.date) score += 3;
  if (p.sender || p.receiver) score += 2;
  score = Math.max(0, Math.min(100, score));
  return { ok: reasons.length === 0, reasons, score };
}

// Resumen legible para WhatsApp
function buildReceiptReply(parsed, consistency, aiVerdict) {
  const fmt = (n) => 'S/ ' + (Number(n) || 0).toFixed(2);
  const lines = [];
  lines.push('Comprobante analizado (OCR local).');
  if (consistency.ok) lines.push('Estado: CONSISTENTE (datos clave detectados).');
  else lines.push('Estado: REVISIÓN necesaria — ' + (consistency.reasons.join('; ') || 'datos faltantes'));

  lines.push('Aplicación/Banco: ' + (parsed.app || parsed.method || 'no detectado'));
  lines.push('Monto: ' + (parsed.amount != null ? fmt(parsed.amount) : 'no detectado'));
  lines.push('N° operación: ' + (parsed.reference || 'no detectado'));
  lines.push('De (remitente): ' + (parsed.sender || 'no detectado'));
  lines.push('Para (destinatario): ' + (parsed.receiver || 'no detectado'));
  if (parsed.phone) lines.push('Celular/Cuenta asociada: ' + parsed.phone);
  if (parsed.account) lines.push('Cuenta destino: ' + parsed.account);
  if (parsed.date || parsed.time) lines.push('Fecha/Hora: ' + [parsed.date, parsed.time].filter(Boolean).join(' '));
  if (parsed.currency) lines.push('Moneda: ' + parsed.currency);
  if (parsed.note) lines.push('Concepto/Nota: ' + parsed.note);
  if (aiVerdict) lines.push('Análisis IA: ' + aiVerdict);
  lines.push('Nota: verificación automática de apoyo; no confirma el pago por sí sola. Si algo no cuadra, revisar manualmente.');
  return lines.join('\n');
}

module.exports = { ocrImage, parseReceipt, verifyReceiptConsistency, buildReceiptReply, TESSERACT_PATH, TESSDATA_DIR };
