const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const paymentVerifier = require('./paymentVerifier');
const conversationGate = require('./conversationGate');

const PORT = parseInt(process.env.PORT || '2013', 10);
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OPENWA_URL = 'http://127.0.0.1:2785';
// API key del cliente Open-WA (usada en send-text y para descargar medios)
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || '';
const DATA_DIR = process.env.SESSION_DATA_DIR ? path.resolve(process.env.SESSION_DATA_DIR) : path.join(__dirname, '..');
const SESSION_NAME = process.env.SESSION_NAME || 'Principal';
const SESSION_SLUG = process.env.SESSION_SLUG || 'principal';
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.jsonl');
const MEDIA_TMP_DIR = path.join(DATA_DIR, 'payments');
const DEFAULT_MODEL = 'qwen2.5-coder:3b'; // Modelo local (Ollama) o remoto (OpenRouter) segun BOT_PROVIDER
const DEFAULT_PROVIDER = 'ollama'; // 'ollama' | 'openrouter'
let BOT_PROVIDER = DEFAULT_PROVIDER;
let BOT_MODEL = DEFAULT_MODEL;
// System prompt del asistente Piston Quarks (Gema 4 - IngenierÃ­a Conversacional)
// OPTIMIZADO con metodologÃ­a Prompt Master (github.com/nidhinjs/prompt-master) para Qwen2.5 via Ollama
const DEFAULT_SYSTEM_PROMPT = [
  'Eres el asistente conversacional de Piston Quarks EIRL (Lima, PerÃº). Eres la Gema 4 (IngenierÃ­a Conversacional) del ecosistema Piston Quarks.',
  'OBJETIVO: Atender consultas de potenciales clientes sobre los servicios y precios de las 9 Gemas de Piston Quarks en WhatsApp. Ser directo, cÃ¡lido y conciso.',
  'CONTEXTO: Servicios y precios: Gema 1 POS Inventory S/550 (reg S/1,100, 50% OFF primeros 10); Gema 2 Presencia Digital S/1,200 (reg S/2,400, 50% OFF primeros 10); Gema 3 ViralizaciÃ³n S/1,200; Gema 4 IngenierÃ­a Conversacional S/1,200; Gema 5 IA Creativa S/1,200; Gema 6 GuionizaciÃ³n S/1,200; Gema 7 DigitalizaciÃ³n S/1,200; Gema 8 AutomatizaciÃ³n S/1,200; Gema 9 Piston Commerce: cotizaciÃ³n personalizada; Centro Neutrino-Voltaico: transducciÃ³n de energÃ­a neutrinovolcaica (HuÃ¡nuco), ODS, soberanÃ­a industrial.',
  'RESTRICCIONES: Responde SIEMPRE en espaÃ±ol, mÃ¡ximo 3 frases por respuesta (estilo WhatsApp). NO inventes precios, cupos, plazos o promesas. Si no sabes, indica que lo confirmarÃ¡ con el equipo comercial y solicita datos del cliente (tipo de negocio, volumen, sector). Si requiere decisiones comerciales o tÃ©cnicas profundas, sugiere escalar a un humano de Piston Quarks (+51 930 640 071).',
  'SALIDA: Respuesta directa, sin preÃ¡mbulos ni listas. Incluye datos de contacto cuando aplique.',
  'ANTI-HALLUCINACIÃ“N: Responde solo con la informaciÃ³n del ecosistema. Si hay incertidumbre, escribe "no lo tengo claro" en lugar de adivinar.',
  'MEMORIA: MantÃ©n el hilo de la conversaciÃ³n segÃºn el historial.'
].join('\n');
let SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT;

// Estado editable del bot (palabras/frases de activaciÃ³n + prompt de entrenamiento)
const DEFAULT_KEYWORDS = ['precio', 'catÃ¡logo', 'catalogo', 'planes', 'servicios', 'hola', 'informaciÃ³n', 'informacion'];
let BOT_STATE_KEYWORDS = [...DEFAULT_KEYWORDS];
const BOT_STATE_FILE = path.join(DATA_DIR, 'bot_state.json');
const ACTIONS_FILE = path.join(DATA_DIR, 'bot_actions.json');
const DIRECTIVES_FILE = path.join(DATA_DIR, 'bot_directives.json');
const LOG_FILE = path.join(DATA_DIR, 'bot_events.log');
// Operadores de pagos autorizados (OCR): por defecto el numero de soporte principal.
// Editable desde el panel admin (/admin/state, campo paymentOperators).
const DEFAULT_PAYMENT_OPERATORS = []; // fail-closed: ningun numero autorizado por defecto; agregar desde /admin
let PAYMENT_OPERATORS = [...DEFAULT_PAYMENT_OPERATORS];
let BOT_ACTIONS = [];
let BOT_DIRECTIVES = [];
let LAST_SESSION_ID = process.env.OPENWA_SESSION || 'b1ff3640-6e6e-44bb-a601-42d5c605ceea';

function logEvent(level, msg, data) {
    try {
        const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(data || {}) }) + '\n';
        fs.appendFileSync(LOG_FILE, line, 'utf8');
    } catch (e) { /* ignore log errors */ }
}

function loadBotState() {
    try {
        const raw = fs.readFileSync(BOT_STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.keywords) && parsed.keywords.every(k => typeof k === 'string') && typeof parsed.prompt === 'string') {
            BOT_STATE_KEYWORDS = parsed.keywords.map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
            SYSTEM_PROMPT = parsed.prompt;
        }
        if (typeof parsed.provider === 'string' && parsed.provider) BOT_PROVIDER = parsed.provider;
        if (typeof parsed.model === 'string' && parsed.model) BOT_MODEL = parsed.model;
        if (Array.isArray(parsed.paymentOperators) && parsed.paymentOperators.every(k => typeof k === 'string') && parsed.paymentOperators.length) {
            PAYMENT_OPERATORS = parsed.paymentOperators.map(s => String(s).trim()).filter(Boolean);
        }
    } catch (e) { /* sin archivo -> defaults */ }
    return { keywords: [...BOT_STATE_KEYWORDS], prompt: SYSTEM_PROMPT, provider: BOT_PROVIDER, model: BOT_MODEL, paymentOperators: [...PAYMENT_OPERATORS] };
}

function saveBotState(next) {
    if (Array.isArray(next.keywords)) BOT_STATE_KEYWORDS = next.keywords.map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    if (typeof next.prompt === 'string') SYSTEM_PROMPT = next.prompt;
    if (typeof next.provider === 'string') BOT_PROVIDER = next.provider;
    if (typeof next.model === 'string') BOT_MODEL = next.model;
    if (Array.isArray(next.paymentOperators) && next.paymentOperators.length) PAYMENT_OPERATORS = next.paymentOperators.map(s => String(s).trim()).filter(Boolean);
    fs.writeFileSync(BOT_STATE_FILE, JSON.stringify({ keywords: BOT_STATE_KEYWORDS, prompt: SYSTEM_PROMPT, provider: BOT_PROVIDER, model: BOT_MODEL, paymentOperators: PAYMENT_OPERATORS }, null, 2));
}

function getBotState() {
    return { keywords: [...BOT_STATE_KEYWORDS], prompt: SYSTEM_PROMPT, provider: BOT_PROVIDER, model: BOT_MODEL, paymentOperators: [...PAYMENT_OPERATORS] };
}

// Operador de pagos autorizado (OCR). SOLO la lista paymentOperators (configurable en /admin).
// fail-closed: con lista vacia nadie puede verificar pagos hasta agregar numeros propios.
function isPaymentOperator(...ids) {
    for (const raw of ids) {
        const s = String(raw || '');
        if (!s) continue;
        const digits = s.replace(/\D/g, '');
        for (const op of PAYMENT_OPERATORS) {
            const od = String(op || '').replace(/\D/g, '');
            if (od && (digits.includes(od) || s.includes(op))) return true;
        }
    }
    return false;
}

// --- Pagos por OCR (Tesseract local + IA) ---
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Descarga el media adjunto de un mensaje (imagen) desde Open-WA. Devuelve Buffer o null.
function downloadMediaBuffer(sessionId, chatId, messageId) {
    return new Promise((resolve) => {
        const target = `${OPENWA_URL}/api/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}/media`;
        const chunks = [];
        const req = http.request(target, {
            method: 'GET',
            headers: { 'X-API-Key': OPENWA_API_KEY }
        }, (res) => {
            if (res.statusCode !== 200) {
                let b = '';
                res.on('data', (c) => b += c);
                res.on('end', () => { logEvent('warn', 'payment_media_http_' + res.statusCode, { sessionId, chatId, messageId, body: String(b).slice(0, 300) }); resolve(null); });
                return;
            }
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', (e) => { logEvent('error', 'payment_media_req_error', { sessionId, error: e.message }); resolve(null); });
        req.setTimeout(30000, () => { req.destroy(); logEvent('error', 'payment_media_timeout', { sessionId, chatId, messageId }); resolve(null); });
        req.end();
    });
}

// Verificacion de consistencia IA (OpenRouter / ernies). Un intento; el wrapper reintenta una vez.
function _aiVerifyOnce(ocrText, parsed) {
    if (!process.env.OPENROUTER_API_KEY) return Promise.resolve('');
    const body = JSON.stringify({
        model: BOT_PROVIDER === 'openrouter' ? BOT_MODEL : 'baidu/ernie-5.5-flash-preview:free',
        messages: [
            { role: 'system', content: 'Eres verificador de comprobantes (Yape/Plin/transferencia bancaria) para Piston Quarks. Analiza el OCR y los datos extraídos. Identifica si es posible: aplicación/banco, de quién es/remitente, para quién/destinatario, monto, número de operación, fecha/hora y celular/cuenta. Responde SOLO: "VÁLIDO" o "SOSPECHOSO" seguido de una frase corta que mencione los datos clave detectados o faltantes/inconsistentes. No pienses en voz alta.' },
            { role: 'user', content: 'Hoy es ' + new Date().toLocaleDateString('es-PE') + '. Texto OCR del comprobante:\n"""\n' + String(ocrText || '').slice(0, 1800) + '\n"""\nDatos extraídos: ' + JSON.stringify({ app: parsed.app, method: parsed.method, amount: parsed.amount, currency: parsed.currency, reference: parsed.reference, date: parsed.date, time: parsed.time, sender: parsed.sender, receiver: parsed.receiver, phone: parsed.phone, account: parsed.account, successMarkers: parsed.successMarkers }) + '\nVeredicto:' }
        ],
        stream: false,
        max_tokens: 700
    });
    return new Promise((resolve) => {
        const req = https.request(OPENROUTER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
                'HTTP-Referer': 'https://pistonquarks.store',
                'X-Title': 'Piston Quarks Bot'
            }
        }, (res) => {
            let b = '';
            res.on('data', (c) => b += c);
            res.on('end', () => {
                try {
                    const p = JSON.parse(b);
                    if (p && p.error) { logEvent('error', 'payment_ai_error', { error: JSON.stringify(p.error).slice(0, 300) }); resolve(''); return; }
                    const msg = p && p.choices && p.choices[0] && p.choices[0].message;
                    const raw = (msg && (msg.content || msg.reasoning || msg.reasoning_content || '')) || '';
                    const m2 = String(raw).match(/(V[ÃA]LIDO(?:A)?|SOSPECHOSO)\b[^\n\r]{0,180}/i);
                    const verdict = m2 ? m2[0].trim().replace(/\s+/g, ' ') : (String(raw).trim().length <= 120 && !/thinking|need answer|razon/i.test(raw) ? String(raw).trim() : '');
                    resolve(verdict);
                } catch (e) { logEvent('error', 'payment_ai_parse_error', { error: e.message, raw: String(b).slice(0, 300) }); resolve(''); }
            });
        });
        req.on('error', (e) => { logEvent('error', 'payment_ai_req_error', { error: e.message }); resolve(''); });
        req.setTimeout(25000, () => { req.destroy(); logEvent('error', 'payment_ai_timeout', {}); resolve(''); });
        req.write(body);
        req.end();
    });
}

// Wrapper: 1 reintento si el pool gratis responde vacio/429 (free tier inestable)
async function aiVerifyReceipt(ocrText, parsed) {
    let v = await _aiVerifyOnce(ocrText, parsed);
    if (!v) { await new Promise(r => setTimeout(r, 1500)); v = await _aiVerifyOnce(ocrText, parsed); }
    return v;
}

// Registro local de pagos verificados/rechazados (payments.jsonl)
function savePaymentRecord(rec) {
    try { fs.appendFileSync(PAYMENTS_FILE, JSON.stringify(rec) + '\n', 'utf8'); } catch (e) { /* ignore */ }
}

// Maneja mensajes con imagen: descarga -> OCR -> parseo -> IA -> responde + registra
async function handlePaymentImage(sessionId, remoteJid, altIds, payload) {
    // Shape real de Open-WA (message.received): { id, type:'image', chatId, from, mimetype: media.mimetype, media:{mimetype, data, omitted} }
    const messageId = String(payload?.id || payload?.messageId || payload?.key?.id || payload?._data?.id || payload?._data?.id?._serialized || '').trim();
    const chatId = String(payload?.chatId || payload?.from || remoteJid || 'unknown');
    const typo = String(payload?.type || payload?._data?.type || payload?.media?.mimetype || '').toLowerCase();
    const mediaInfo = (payload && payload.media) || payload?._data?.media || null;
    const mime = String((mediaInfo && mediaInfo.mimetype) || payload?.mimetype || payload?._data?.mimetype || '').toLowerCase();
    const isImage = typo === 'image' || typo === 'photo' || /image/.test(typo) || /image/.test(mime) || !!(payload?.hasMedia && /image|photo|media/.test(typo + ' ' + mime));
    if (!isImage) { logEvent('info', 'payment_skip_non_image', { sessionId, from: remoteJid, type: typo, mime }); return; }
    if (!messageId) { logEvent('warn', 'payment_missing_messageid', { sessionId, from: remoteJid, keys: Object.keys(payload || {}).slice(0, 10) }); return; }

    if (!isPaymentOperator(...altIds)) {
        logEvent('info', 'payment_ignored_unauthorized', { sessionId, from: remoteJid });
        await sendToWhatsApp(sessionId, remoteJid, 'Solo el equipo autorizado de Piston Quarks puede verificar comprobantes de pago. Para consultas, escrÃ­benos.');
        return;
    }

    logEvent('info', 'payment_image_received', { sessionId, from: remoteJid, messageId, type: typo || null, chatId });

    // Prioridad: media embebido en el webhook (base64); si viene omitido/ausente, descargar por API
    let media = null;
    const embedded = mediaInfo && typeof mediaInfo.data === 'string' && mediaInfo.data.length > 0;
    if (embedded) {
        try { media = Buffer.from(mediaInfo.data, 'base64'); logEvent('info', 'payment_media_embedded', { sessionId, sizeBytes: media.length }); }
        catch (e) { logEvent('error', 'payment_media_b64_error', { error: e.message }); }
    }
    if (!media) media = await downloadMediaBuffer(sessionId, chatId, messageId);
    if (!media) {
        await sendToWhatsApp(sessionId, remoteJid, 'No pude descargar la imagen del comprobante. Verifica que llegÃ³ como imagen y reenvÃ­ala.');
        return;
    }

    try { fs.mkdirSync(MEDIA_TMP_DIR, { recursive: true }); } catch (e) { /* ignore */ }
    const tmpName = 'payment_' + Date.now() + '_' + String(messageId).replace(/[^A-Za-z0-9_-]/g, '') + '.bin';
    const tmpPath = path.join(MEDIA_TMP_DIR, tmpName);
    try { fs.writeFileSync(tmpPath, media); } catch (e) { logEvent('error', 'payment_tmp_write_error', { error: e.message }); }

    const ext = (mime.includes('png')) ? '.png' : (mime.includes('webp') ? '.webp' : (mime.includes('tif') ? '.tif' : '.jpg'));
    const finalPath = tmpPath.replace(path.extname(tmpName), ext);
    try { if (path.normalize(finalPath) !== path.normalize(tmpPath)) fs.renameSync(tmpPath, finalPath); }
    catch (e) { logEvent('error', 'payment_rename_error', { error: e.message }); return; }

    let ocr = '';
    try { ocr = await paymentVerifier.ocrImage(finalPath, 'spa+eng'); }
    catch (e) { logEvent('error', 'payment_ocr_error', { error: e.message }); }

    const parsed = paymentVerifier.parseReceipt(ocr);
    const consistency = paymentVerifier.verifyReceiptConsistency(parsed);
    const aiVerdict = await aiVerifyReceipt(ocr, parsed);
    const reply = paymentVerifier.buildReceiptReply(parsed, consistency, aiVerdict || null);

    const status = consistency.ok ? 'verificado' : 'revision';
    const record = {
        ts: new Date().toISOString(),
        from: remoteJid,
        messageId,
        status,
        app: parsed.app || null,
        method: parsed.method || null,
        amount: parsed.amount,
        currency: parsed.currency || null,
        reference: parsed.reference || null,
        date: parsed.date || null,
        time: parsed.time || null,
        sender: parsed.sender || null,
        receiver: parsed.receiver || null,
        phone: parsed.phone || null,
        account: parsed.account || null,
        note: parsed.note || null,
        consistencyScore: consistency.score,
        consistencyReasons: consistency.reasons,
        aiVerdict,
        imagePath: finalPath,
        rawText: String(ocr || '').slice(0, 2000)
    };
    savePaymentRecord(record);
    if (process.env.GSHEETS_SYNC === '1') {
        try {
            require('./gsheetsLogger').appendPaymentRow(record)
                .then(() => logEvent('info', 'payment_gsheets_ok', { sessionId, messageId }))
                .catch(e => logEvent('error', 'payment_gsheets_error', { sessionId, messageId, error: String((e && e.message) || e).slice(0, 300) }));
        } catch (e) { logEvent('error', 'payment_gsheets_error', { sessionId, messageId, error: String((e && e.message) || e).slice(0, 300) }); }
    }
    logEvent('info', status === 'verificado' ? 'payment_verified' : 'payment_needs_review', { sessionId, from: remoteJid, messageId, amount: parsed.amount, method: parsed.method, score: consistency.score });

    if (process.env.PAYMENTS_DRY_RUN === '1') {
        logEvent('info', 'payment_dry_run_reply', { sessionId, from: remoteJid, reply });
        try { fs.unlinkSync(finalPath); } catch (e) { /* ignore */ }
        return;
    }
    await sendToWhatsApp(sessionId, remoteJid, reply);
    try { fs.unlinkSync(finalPath); } catch (e) { /* conservar copia si falla el borrado */ }
    return;
}

// Cargar estado persistido (keywords + prompt + provider/model) al arrancar el puente
loadBotState();

// Cargar manual de acciones (respuestas predefinidas por intento)
function loadBotActions() {
    try {
        const raw = fs.readFileSync(ACTIONS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.actions)) BOT_ACTIONS = parsed.actions;
    } catch (e) { /* sin archivo -> sin acciones predefinidas */ }
}
loadBotActions();

// Directivas de comunicacion/aprendizaje (agregadas por apoyo principal)
function loadDirectives() {
    try {
        const raw = fs.readFileSync(DIRECTIVES_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.directives)) BOT_DIRECTIVES = parsed.directives.filter(d => d && typeof d.text === 'string' && d.text.trim());
    } catch (e) { BOT_DIRECTIVES = []; }
    return BOT_DIRECTIVES;
}
function saveDirectives() {
    fs.writeFileSync(DIRECTIVES_FILE, JSON.stringify({ directives: BOT_DIRECTIVES }, null, 2), 'utf8');
}
function getDirectivesPromptText() {
    if (!BOT_DIRECTIVES.length) return '';
    const lines = BOT_DIRECTIVES.map((d, i) => `${i + 1}. ${d.text}`).join('\n');
    return '\n\nDIRECTIVAS DE COMUNICACION Y MEJORA (definidas por apoyo principal, aplicar en respuestas cuando corresponda, sin salir del alcance):\n' + lines;
}
function addDirective(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    BOT_DIRECTIVES.push({ text: t, addedAt: new Date().toISOString(), from: 'support' });
    saveDirectives();
    return t;
}
function clearDirectives() {
    BOT_DIRECTIVES = [];
    saveDirectives();
}
loadDirectives();

// Numero de apoyo principal (interno): responde a todo desde este numero, con conocimiento completo del ecosistema
const SUPPORT_NUMBER_DIGITS = '51928059006';
const SUPPORT_NUMBER_LOCAL = '928059006';
// LIDs/IDs conocidos del numero de apoyo (WhatsApp multi-device puede enviar @lid en vez de @c.us)
const SUPPORT_KNOWN_IDS = ['173929649971325']; // soporte principal observado en logs
// (Operadores de pagos: definido arriba junto con la inicializacion de estado)
function isSupportNumber(...ids) {
    for (const raw of ids) {
        const s = String(raw || '');
        const digits = s.replace(/\D/g, '');
        if (!digits) continue;
        if (digits.includes(SUPPORT_NUMBER_DIGITS) || digits.includes(SUPPORT_NUMBER_LOCAL)) return true;
        for (const kid of SUPPORT_KNOWN_IDS) {
            if (s.includes(kid) || digits.includes(kid)) return true;
        }
    }
    return false;
}

// Buscar una accion predefinida cuyo trigger matchee el mensaje entrante (prefiere match mas especifico/largo)
function findAction(text) {
    const lowerMsg = (text || '').toLowerCase();
    let best = null;
    let bestLen = -1;
    for (const action of BOT_ACTIONS) {
        const triggers = action.triggers || [];
        for (const t of triggers) {
            const tl = (t || '').toLowerCase();
            if (tl && lowerMsg.includes(tl)) {
                if (tl.length > bestLen) {
                    best = action;
                    bestLen = tl.length;
                }
            }
        }
    }
    return best;
}

// Extrae campos del mensaje enviado por la Calculadora ROI (Huanuco)
function parseHuanucoCalculator(text) {
    const t = text || '';
    const get = (labelRe) => {
        const m = t.match(labelRe);
        return m ? m[1].trim().replace(/^\*+|\*+$/g, '').trim() : '';
    };
    const isCalc = /calculadora\s+de\s+pist/i.test(t) || /p[eÃ©.]rdida\s+mensual\s+total\s+estimada/i.test(t) || /plan\s+sugerido/i.test(t);
    if (!isCalc) return null;
    const negocio = get(/\*?Negocio\*?\s*[:\-]?\s*([^\n\r]+)/i);
    const sector = get(/\*?Sector\*?\s*[:\-]?\s*([^\n\r]+)/i);
    const problemas = get(/\*?Problemas\*?\s*[:\-]?\s*([^\n\r]+)/i);
    const ticket = get(/\*?Ticket\s*Promedio\*?\s*[:\-]?\s*([^\n\r]+)/i);
    const clientes = get(/\*?Clientes\s*Perdidos\s*al\s*Mes\*?\s*[:\-]?\s*([^\n\r]+)/i);
    const fuga = get(/\*?Fuga\s*de\s*Inventario\*?\s*[:\-]?\s*([^\n\r]+)/i);
    const horas = get(/\*?Horas\s*Perdidas\s*al\s*Mes\*?\s*[:\-]?\s*([^\n\r]+)/i);
    const perdida = get(/\*?P[eÃ©.\uFFFD]rdida\s*mensual\s+total\s+estimada\*?\s*[:\-]?\s*([^\n\r]+)/i) || get(/P[eÃ©.\uFFFD]?rdida\s*mensual\s+total\s+estimada\*?\s*[:\-]?\s*([^\n\r]+)/i);
    const plan = get(/\*?Plan\s*Sugerido\*?\s*[:\-]?\s*([^\n\r]+)/i);
    const nombreM = t.match(/Mi\s+nombre\s+es\s+([^,\n\r\.]+)/i);
    const nombre = nombreM ? nombreM[1].trim() : '';
    return { negocio, sector, problemas, ticket, clientes, fuga, horas, perdida, plan, nombre, raw: t };
}

function buildHuanucoCalculatorResponse(data) {
    const nombre = data.nombre || 'hola';
    const negocio = data.negocio && data.negocio !== 'No indicado' ? data.negocio : 'tu negocio';
    const sector = data.sector && data.sector !== 'No indicado' ? data.sector : 'tu sector';
    const perdida = data.perdida || 'la estimada';
    const plan = data.plan || 'el plan sugerido';
    const planLower = (plan || '').toLowerCase();
    let solucion = 'SEO local/Google Maps, web o catalogo y automatizacion por WhatsApp para recuperar clientes';
    if (planLower.includes('enterprise')) solucion = 'estrategia integral: posicionamiento, captacion multicanal y automatizacion (WhatsApp/web) para escalar ventas';
    else if (planLower.includes('pro')) solucion = 'Google Maps optimizado, campanas locales y automatizacion WhatsApp para captar leads rapido';
    else if (planLower.includes('basic')) solucion = 'SEO local y automatizacion basica para dejar de perder clientes y ordenar consultas';
    const problemas = data.problemas && data.problemas !== 'Ninguno indicado' ? ` Problemas: ${data.problemas}.` : '';
    return `Hola ${nombre}, recibi tu diagnostico de la calculadora para ${negocio} (${sector}). Perdida estimada ${perdida}, recomiendo ${plan} (ROI 150-200%, recuperas inversion con primeros clientes).${problemas} Te propongo ${solucion}. Coordinemos diagnostico/llamada con Rony: +51 930 640 071. Que dia te viene bien?`;
}

function isPagePayload(text) {
    const t = (text || '').toLowerCase();
    if (/calculadora\s+de\s+pist|p[eÃ©.\uFFFD]rdida\s+mensual\s+total\s+estimada|plan\s+sugerido/i.test(t)) return true;
    const hints = [
        'quiero una demo piston quarks', 'agendar una demo piston quarks', 'visite mi hotel',
        'demostracion 30 min del sistema came', 'cotizacion del sistema came', 'hola came',
        'quiero una web para mi negocio', 'quiero subtitular un video', 'prueba de un minuto de subtitulado',
        'cotizar marketing y video publicitario', 'quiero informacion de piston quarks', 'quiero informaciÃ³n de piston quarks',
        'solicitar demo', 'sistemca', 'agendar una demostracion'
    ];
    return hints.some(h => t.includes(h));
}

// Â¿El mensaje entrante cita/responda a un mensaje del bot? (el cliente lo estÃ¡ llamando)
function isQuotedToBot(payload) {
    if (!payload || typeof payload !== 'object') return false;
    const candidates = [
        payload.quotedMsg, payload.quoted, payload.quotedMessage,
        payload._data && payload._data.quotedMsg,
        payload._data && payload._data.quoted,
        payload.contextInfo, payload._data && payload._data.contextInfo
    ].filter(Boolean);
    for (const q of candidates) {
        if (q.fromMe === true) return true;
        const inner = q.quotedMessage || q.message || null;
        if (inner && inner.fromMe === true) return true;
        const author = String(q.participant || q.author || (inner && inner.participant) || '');
        const d = author.replace(/\D/g, '');
        if (d && d.includes('51930640071')) return true;
    }
    return false;
}

function readRecentEvents(limit = 200) {
    try {
        if (!fs.existsSync(LOG_FILE)) return [];
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        const slice = lines.slice(-Math.max(1, Math.min(limit, 1000)));
        const events = [];
        for (const line of slice) {
            try { events.push(JSON.parse(line)); } catch (e) { /* skip */ }
        }
        return events.reverse();
    } catch (e) {
        return [];
    }
}

function readChatState() {
    try {
        const chatFile = path.join(DATA_DIR, 'chat_state.json');
        if (!fs.existsSync(chatFile)) return {};
        const parsed = JSON.parse(fs.readFileSync(chatFile, 'utf8'));
        return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch (e) {
        return {};
    }
}

function summarizeChats(limit = 80) {
    const state = readChatState();
    const events = readRecentEvents(500);
    const lastByChat = {};
    for (const ev of events) {
        const jid = String(ev.from || ev.chat || ev.jid || '');
        if (!jid || lastByChat[jid]) continue;
        lastByChat[jid] = ev;
    }
    const rows = Object.entries(state).map(([jid, st]) => {
        const botIntervened = !!(st.lastBotAt || st.turns);
        const humanIntervened = !!(st.lastHumanAt);
        const aiSuspected = !!(st.aiSuspected);
        let intervention = 'none';
        if (aiSuspected) intervention = 'ai_detected';
        else if (botIntervened && humanIntervened) intervention = 'both';
        else if (humanIntervened) intervention = 'human_only';
        else if (botIntervened) intervention = 'bot_only';
        return {
            jid,
            name: st.name || st.pushname || '',
            pushname: st.pushname || '',
            number: st.number || String(jid || '').replace(/@.*$/, '').replace(/\D/g, ''),
            isBusiness: !!st.isBusiness,
            aiSuspected,
            aiSuspectedReason: st.aiSuspectedReason || '',
            mode: st.mode || 'bot',
            lastHumanAt: st.lastHumanAt || 0,
            lastBotAt: st.lastBotAt || 0,
            lastUserAt: st.lastUserAt || 0,
            lastSeenAt: st.lastSeenAt || st.lastUserAt || st.lastBotAt || st.lastHumanAt || 0,
            lastText: st.lastText || '',
            lastBotText: st.lastBotText || '',
            turns: st.turns || 0,
            greeted: !!st.greeted,
            botIntervened,
            humanIntervened,
            intervention,
            lastEvent: lastByChat[jid] || null
        };
    });
    rows.sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0));
    return rows.slice(0, limit);
}

function chatEvents(jid, limit = 120) {
    const key = String(jid || '').trim();
    if (!key) return [];
    const events = readRecentEvents(1200);
    const out = [];
    for (const ev of events) {
        const ej = String(ev.from || ev.chat || ev.jid || '');
        if (ej === key) out.push(ev);
        if (out.length >= limit) break;
    }
    return out.reverse();
}

function extractContactInfo(payload, remoteJid) {
    const p = payload || {};
    const sender = p.sender || p.contact || p._data?.sender || {};
    const name = String(
        sender.pushname || sender.name || sender.shortName || sender.verifiedName || sender.formattedName ||
        p.notifyName || p.pushname || p._data?.notifyName || p._data?.pushname || ''
    ).trim();
    const number = String(sender.id || remoteJid || '').replace(/@.*$/, '').replace(/\D/g, '');
    const isBusiness = !!(sender.isBusiness || sender.isEnterprise || p.isBusiness);
    return { name, pushname: String(sender.pushname || p.notifyName || p._data?.notifyName || '').trim(), number, isBusiness };
}

function detectAiSuspected(text, fromMe) {
    if (fromMe) return null;
    const t = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!t) return null;
    const patterns = [
        /\bsoy (una?|el) (ia|inteligencia artificial|bot|asistente virtual|asistente de ia|modelo de lenguaje)\b/,
        /\bcomo (ia|inteligencia artificial|bot|asistente virtual|modelo de lenguaje)\b/,
        /\bfui cread[oa] por\b/,
        /\bsoy chatgpt\b/, /\bsoy gemini\b/, /\bsoy claude\b/, /\bsoy copilot\b/,
        /\blanguage model\b/, /\bi am an ai\b/, /\bas an ai\b/, /\bi'm an ai\b/
    ];
    for (const re of patterns) {
        if (re.test(t)) return 'Mensaje con autoidentificación de IA/bot';
    }
    return null;
}

const PANEL_FILE = path.join(__dirname, '..', 'panel.html');
function getAdminHtml() {
    try {
        return fs.readFileSync(PANEL_FILE, 'utf8');
    } catch (e) {
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pistón Panel</title></head><body style="font-family:Arial;padding:24px;background:#0b1220;color:#fff"><h1>Pistón Panel</h1><p>No se pudo cargar panel.html: ${String(e.message || e)}</p><p>Ruta esperada: ${PANEL_FILE}</p></body></html>`;
    }
}

const conversationHistory = {};

function historyToMessages(hKey) {
    const hist = conversationHistory[hKey] || [];
    const out = [];
    for (const line of hist) {
        if (line.startsWith('User: ')) out.push({ role: 'user', content: line.slice(6) });
        else if (line.startsWith('AI: ')) out.push({ role: 'assistant', content: line.slice(4) });
    }
    return out;
}

function rememberTurn(hKey, prompt, aiText) {
    if (!conversationHistory[hKey]) conversationHistory[hKey] = [];
    if (prompt) conversationHistory[hKey].push('User: ' + prompt);
    if (aiText && String(aiText).trim()) conversationHistory[hKey].push('AI: ' + String(aiText).trim());
    while (conversationHistory[hKey].length > 12) conversationHistory[hKey].shift();
}

async function callAI(prompt, historyKey, contextNote) {
    const hKey = String(historyKey || 'default');
    if (!conversationHistory[hKey]) {
        conversationHistory[hKey] = [];
    }
    const userContent = contextNote ? (String(contextNote) + '\n\n' + String(prompt || '')) : String(prompt || '');

    const effectivePrompt = SYSTEM_PROMPT + getDirectivesPromptText();
    const isOpenRouter = (BOT_PROVIDER === 'openrouter');
    const target = isOpenRouter ? OPENROUTER_ENDPOINT : OLLAMA_URL;

    const requestHeaders = isOpenRouter
        ? {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + (process.env.OPENROUTER_API_KEY || ''),
              'HTTP-Referer': 'https://pistonquarks.store',
              'X-Title': 'Piston Bot'
          }
        : { 'Content-Type': 'application/json' };

    const buildBody = () => {
        if (isOpenRouter) {
            // Historial real: el guion de 5 fases necesita memoria del hilo.
            return JSON.stringify({
                model: BOT_MODEL,
                messages: [
                    { role: 'system', content: effectivePrompt },
                    ...historyToMessages(hKey),
                    { role: 'user', content: userContent }
                ],
                stream: false,
                max_tokens: 600,
                temperature: 0.5
            });
        }
        const fullPrompt = effectivePrompt + '\n' + (conversationHistory[hKey] || []).join('\n') + '\nUser: ' + userContent;
        return JSON.stringify({
            model: BOT_MODEL,
            prompt: fullPrompt,
            stream: false,
            options: { num_ctx: 4096, num_predict: 400, temperature: 0.5 }
        });
    };

    const attempt = () => new Promise((resolve) => {
        const reqMod = target.startsWith('https://') ? https : http;
        const req = reqMod.request(target, {
            method: 'POST',
            headers: requestHeaders
        }, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => responseBody += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseBody);
                    if (parsed && parsed.error) {
                        logEvent('error', 'ai_api_error', { chat: hKey, provider: BOT_PROVIDER, model: BOT_MODEL, status: res.statusCode, error: JSON.stringify(parsed.error).slice(0, 500) });
                    }
                    let aiText = '';
                    if (isOpenRouter) {
                        const msg = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message;
                        aiText = (msg && (msg.content || msg.reasoning || msg.reasoning_content || msg.text)) || '';
                    } else {
                        aiText = (parsed && (parsed.response || (parsed.message && parsed.message.content) || '')) || '';
                    }
                    aiText = String(aiText || '').replace(/^\s*(AI|Asistente|Assistant)\s*:\s*/i, '').trim();
                    if (!aiText) {
                        logEvent('warn', 'ai_empty_response', { chat: hKey, provider: BOT_PROVIDER, model: BOT_MODEL, status: res.statusCode, raw: String(responseBody || '').slice(0, 500) });
                    }
                    resolve({ text: aiText, status: res.statusCode });
                } catch (e) {
                    logEvent('error', 'ai_parse_error', { chat: hKey, provider: BOT_PROVIDER, model: BOT_MODEL, error: e.message, raw: String(responseBody || '').slice(0, 500) });
                    resolve({ text: '', status: res.statusCode });
                }
            });
        });
        req.on('error', (e) => {
            logEvent('error', 'ai_request_error', { chat: hKey, provider: BOT_PROVIDER, model: BOT_MODEL, error: e.message });
            resolve({ text: '', status: 0 });
        });
        req.setTimeout(45000, () => {
            req.destroy();
            logEvent('error', 'ai_timeout', { chat: hKey, provider: BOT_PROVIDER, model: BOT_MODEL });
            resolve({ text: '', status: 0 });
        });
        req.write(buildBody());
        req.end();
    });

    let result = await attempt();
    // Reintento Ãºnico: 429 / 5xx / vacÃ­o (el modelo gratis falla de vez en cuando).
    if (!result.text || result.status === 429 || result.status >= 500) {
        await new Promise(r => setTimeout(r, 1500));
        const retry = await attempt();
        if (retry.text) result = retry;
    }

    if (result.text) {
        rememberTurn(hKey, prompt, result.text);
    } else {
        logEvent('warn', 'ai_no_text_after_retry', { chat: hKey, provider: BOT_PROVIDER, model: BOT_MODEL, status: result.status });
    }
    return result.text || '';
}

function isSendOk(sendResult) {
    try {
        const parsed = JSON.parse(String(sendResult || ''));
        if (parsed && (parsed.error || parsed.statusCode >= 400)) return false;
        return true;
    } catch (e) {
        return false;
    }
}

// Asistente IA del panel (no usa historial del bot cliente; usa contexto de chats para análisis).
async function callAssistantAI(systemPrompt, userPrompt) {
    const isOpenRouter = (BOT_PROVIDER === 'openrouter');
    const target = isOpenRouter ? OPENROUTER_ENDPOINT : OLLAMA_URL;
    const requestHeaders = isOpenRouter
        ? {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (process.env.OPENROUTER_API_KEY || ''),
            'HTTP-Referer': 'https://pistonquarks.store',
            'X-Title': 'Piston Panel Assistant'
        }
        : { 'Content-Type': 'application/json' };
    const body = isOpenRouter
        ? JSON.stringify({ model: BOT_MODEL, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], stream: false, max_tokens: 900, temperature: 0.4 })
        : JSON.stringify({ model: BOT_MODEL, prompt: systemPrompt + '\n\n' + userPrompt, stream: false, options: { num_ctx: 4096, num_predict: 700, temperature: 0.4 } });
    const reqMod = target.startsWith('https://') ? https : http;
    return await new Promise((resolve) => {
        const req = reqMod.request(target, { method: 'POST', headers: requestHeaders }, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => responseBody += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseBody);
                    let aiText = '';
                    if (isOpenRouter) {
                        const msg = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message;
                        aiText = (msg && (msg.content || msg.reasoning || msg.reasoning_content || msg.text)) || '';
                    } else {
                        aiText = (parsed && (parsed.response || (parsed.message && parsed.message.content) || '')) || '';
                    }
                    resolve(String(aiText || '').trim());
                } catch (e) { resolve(''); }
            });
        });
        req.on('error', () => resolve(''));
        req.setTimeout(60000, () => { req.destroy(); resolve(''); });
        req.write(body);
        req.end();
    });
}

function buildChatTranscript(jid, limit = 80) {
    const events = chatEvents(jid, limit);
    const lines = [];
    for (const ev of events) {
        if (ev.msg === 'webhook_received' && ev.text) lines.push(`[CLIENTE ${ev.ts || ''}] ${String(ev.text).replace(/\s+/g, ' ').slice(0, 500)}`);
        if ((ev.msg === 'ai_sent' || ev.msg === 'action_sent' || ev.msg === 'calc_huanuco_sent' || ev.msg === 'panel_send') && (ev.reply || ev.text)) {
            lines.push(`[BOT/HUMANO ${ev.ts || ''} ${ev.msg}] ${String(ev.reply || ev.text).replace(/\s+/g, ' ').slice(0, 500)}`);
        }
    }
    return lines.slice(-limit).join('\n');
}

function collectOwnerStyleSample(maxChats = 25, perChat = 20) {
    const chats = summarizeChats(maxChats);
    const samples = [];
    for (const c of chats) {
        const events = chatEvents(c.jid, perChat);
        for (const ev of events) {
            if ((ev.msg === 'panel_send' || ev.msg === 'human_alert_sent') && (ev.text || ev.reply)) {
                samples.push(String(ev.text || ev.reply).replace(/\s+/g, ' ').slice(0, 280));
            }
        }
    }
    return samples.slice(-120);
}

const SCHEDULED_FILE = path.join(DATA_DIR, 'scheduled_messages.json');
function readScheduled() { try { if (fs.existsSync(SCHEDULED_FILE)) return JSON.parse(fs.readFileSync(SCHEDULED_FILE, 'utf8')); } catch (e) {} return []; }
function writeScheduled(items) { try { fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(items, null, 2), 'utf8'); } catch (e) {} }

const ASSIST_HISTORY_FILE = path.join(DATA_DIR, 'assistant_history.json');
function readAssistHistory() { try { if (fs.existsSync(ASSIST_HISTORY_FILE)) return JSON.parse(fs.readFileSync(ASSIST_HISTORY_FILE, 'utf8')); } catch (e) {} return { messages: [], plans: [] }; }
function writeAssistHistory(data) { try { fs.writeFileSync(ASSIST_HISTORY_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch (e) {} }
function pushAssistHistory(entry) {
    const data = readAssistHistory();
    data.messages = Array.isArray(data.messages) ? data.messages : [];
    data.messages.push(entry);
    if (data.messages.length > 200) data.messages = data.messages.slice(-200);
    writeAssistHistory(data);
    return data;
}

const SESSIONS_REGISTRY = path.join(__dirname, '..', 'sessions_registry.json');
function readSessionsRegistry() { try { if (fs.existsSync(SESSIONS_REGISTRY)) return JSON.parse(fs.readFileSync(SESSIONS_REGISTRY, 'utf8')); } catch (e) {} return []; }
function writeSessionsRegistry(items) { try { fs.writeFileSync(SESSIONS_REGISTRY, JSON.stringify(items, null, 2), 'utf8'); } catch (e) {} }
function slugify(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40) || ('session-'+Date.now()); }
function ensureSessionFiles(dir, cfg) {
    fs.mkdirSync(dir, { recursive: true });
    const defaults = {
        'bot_state.json': JSON.stringify({ keywords: cfg.keywords||[], prompt: cfg.prompt||SYSTEM_PROMPT, provider: cfg.provider||BOT_PROVIDER, model: cfg.model||BOT_MODEL, paymentOperators: cfg.paymentOperators||PAYMENT_OPERATORS }, null, 2),
        'bot_directives.json': JSON.stringify({ directives: cfg.directives||[] }, null, 2),
        'bot_actions.json': fs.existsSync(path.join(__dirname,'..','bot_actions.json')) ? fs.readFileSync(path.join(__dirname,'..','bot_actions.json'),'utf8') : JSON.stringify({actions:[]},null,2),
        'chat_state.json': '{}',
        'payments.jsonl': '',
        'scheduled_messages.json': '[]',
        'assistant_history.json': JSON.stringify({messages:[],plans:[]},null,2)
    };
    for (const [name, content] of Object.entries(defaults)) {
        const p = path.join(dir,name);
        if (!fs.existsSync(p)) fs.writeFileSync(p, content, 'utf8');
    }
}
function sessionRuntimeStatus(item) {
    const st = { ...item, running: false };
    try { if (item.pid) { process.kill(Number(item.pid), 0); st.running = true; } } catch (e) { st.running = false; }
    return st;
}

// Aviso interno a Rony cuando el bot no puede resolver algo (relevo real a humano).
const ALERT_NUMBER = '51930640071@c.us';
const ALERT_THROTTLE_MS = 30 * 60 * 1000;
const alertSentAt = new Map();

async function alertHuman(sessionId, remoteJid, reason, userText, botText) {
    try {
        const key = String(remoteJid || '');
        const now = Date.now();
        const last = alertSentAt.get(key) || 0;
        if (now - last < ALERT_THROTTLE_MS) return false;
        alertSentAt.set(key, now);
        if (alertSentAt.size > 500) {
            for (const [k, v] of alertSentAt) {
                if (now - v >= ALERT_THROTTLE_MS) alertSentAt.delete(k);
            }
        }
        const msg = [
            'PistÃ³n Bot necesita tu ojo (' + reason + ').',
            'Chat: ' + key,
            'Cliente: "' + String(userText || '').slice(0, 200) + '"',
            'RespondiÃ³: "' + String(botText || '').slice(0, 300) + '"',
            'Entra a ese chat y responde tÃº.'
        ].join('\n');
        const result = await sendToWhatsApp(sessionId, ALERT_NUMBER, msg);
        logEvent(isSendOk(result) ? 'info' : 'warn', 'human_alert', { sessionId, chat: key, reason, ok: isSendOk(result), sendResult: String(result || '').slice(0, 200) });
        return isSendOk(result);
    } catch (e) {
        logEvent('warn', 'human_alert_error', { error: String(e && e.message || e) });
        return false;
    }
}

async function sendToWhatsApp(sessionId, chatId, message) {
    // Endpoint correcto de Open-WA: /api/sessions/{sessionId}/messages/send-text
    // Body requerido: { "chatId": "<numero>@c.us", "text": "..." }
    // El sessionId va en la RUTA (no en el body); el chatId es el remoteJid del remitente.
    const payload = JSON.stringify({
        chatId: chatId,
        text: message
    });

    const target = `${OPENWA_URL}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;

    return new Promise((resolve, reject) => {
        const req = http.request(target, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': OPENWA_API_KEY
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                const ok = res.statusCode >= 200 && res.statusCode < 300;
                if (ok) {
                    try { conversationGate.markBotReply(chatId, message); } catch (e) { /* no tumbar el envio */ }
                } else {
                    logEvent('warn', 'send_failed', { sessionId, chatId, status: res.statusCode, body: String(body || '').slice(0, 300) });
                }
                console.log('ðŸ“² Respuesta Open-WA (' + sessionId + ' -> ' + chatId + '): ' + body);
                resolve(body);
            });
        });
        req.on('error', (e) => {
            logEvent('warn', 'send_error', { sessionId, chatId, error: String(e && e.message || e) });
            resolve('{"error":"' + String(e && e.code || 'send_error') + '"}');
        });
        // Sin timeout, un Open-WA colgado dejaba el webhook esperando para siempre.
        req.setTimeout(20000, () => {
            logEvent('warn', 'send_timeout', { sessionId, chatId });
            try { req.destroy(); } catch (e) { /* ignore */ }
            resolve('{"error":"timeout"}');
        });
        req.write(payload);
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    // Cloudflare Tunnel puede reenviar en absolute-form ("POST https://host/webhook")
    // en lugar de origin-form ("POST /webhook"). Normalizamos el path siempre:
    let pathname = req.url || '/';
    if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
        try { pathname = new URL(pathname).pathname; } catch (e) { /* conservar req.url crudo */ }
    } else if (pathname.includes('?')) {
        pathname = pathname.split('?')[0];
    }

    if (pathname === '/webhook' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                // Responder de inmediato a Open-WA para evitar el timeout (Error 400 / Abortado)
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success' }));

                const data = JSON.parse(body);
                console.log('\n' + '='.repeat(30));
                console.log('ðŸ“¥ Evento recibido de Open-WA');
                
                const payload = data.payload || data.data || data;
                const msgText = payload?.body || payload?.text || payload?.content || payload?.message || data.body || data.text || data.message || '';
                const sessionId = data.session || data.sessionId || payload?.session || payload?.sessionId || LAST_SESSION_ID || 'default';
                LAST_SESSION_ID = sessionId;
                const remoteJid = payload?.from || payload?.chatId || payload?.sender?.id || payload?.author || data.from || data.chatId || 'unknown';
                const fromMe = !!(payload?.fromMe || data.fromMe || payload?.isFromMe);
                const altIds = [remoteJid, payload?.from, payload?.chatId, payload?.sender?.id, payload?.author, payload?.participant, payload?._data?.from, payload?._data?.author, payload?._data?.participant, data.from, data.chatId];
                const contactInfo = extractContactInfo(payload, remoteJid);
                try { conversationGate.updateContact(remoteJid, contactInfo); } catch (e) { /* ignore */ }
                const aiReason = detectAiSuspected(msgText, fromMe);
                if (aiReason) { try { conversationGate.updateContact(remoteJid, { aiSuspected: true, aiSuspectedReason: aiReason }); } catch (e) { /* ignore */ } }

                console.log('SesiÃ³n:', sessionId);
                console.log('De:', remoteJid);
                console.log('Mensaje:', msgText);
                logEvent('info', 'webhook_received', { sessionId, from: remoteJid, text: msgText, fromMe, event: data.event || data.type || null, ids: altIds.filter(Boolean).slice(0, 8) });

                // Evitar bucles: ignorar mensajes enviados por el propio bot/sesion
                // Excepcion: imagenes de un operador de pagos autorizado (self-chat de prueba del OCR)
                // (solo imagenes; la respuesta del bot es texto y queda ignorada -> sin bucle)
                if (fromMe) {
                    const typoStr = String((payload && (payload.type || (payload._data && payload._data.type))) || '').toLowerCase();
                    const _mi = (payload && payload.media) || (payload && payload._data && payload._data.media) || null;
                    const mediaMime = String((_mi && _mi.mimetype) || (payload && (payload.mimetype || (payload._data && payload._data.mimetype))) || '').toLowerCase();
                    const isImg = typoStr === 'image' || /image/.test(typoStr) || /image/.test(mediaMime);
                    if (isImg && isPaymentOperator(remoteJid, ...altIds)) {
                        logEvent('info', 'from_me_image_authorized', { sessionId, from: remoteJid });
                    } else {
                        // Distinguir el eco del propio bot de una respuesta escrita a mano.
                        // Si es eco, NO se marca takeover humano (romperÃ­a el bot 6 h).
                        const botEcho = conversationGate.isBotEcho(remoteJid, msgText)
                            || conversationGate.isRecentBotText(remoteJid, msgText);
                        if (!botEcho) {
                            conversationGate.markHumanTakeover(remoteJid);
                            console.log('ðŸ‘¤ [GATE] Toma de control humano: el bot calla 6 h en este chat.');
                            logEvent('info', 'human_takeover', { sessionId, from: remoteJid, text: String(msgText || '').slice(0, 120) });
                        }
                        console.log('â© [FILTRO] Mensaje propio ignorado (fromMe' + (botEcho ? ', eco del bot' : ', humano') + ').');
                        logEvent('info', 'ignored_from_me', { sessionId, from: remoteJid, botEcho });
                        return;
                    }
                }

                // No responder en grupos (restringido)
                const jidStr = String(remoteJid || '');
                const isGroup = jidStr.endsWith('@g.us') || !!(payload && (payload.isGroup || payload.isGroupMsg || payload.chat?.isGroup));
                if (isGroup) {
                    console.log('â© [FILTRO] Mensaje de grupo ignorado (restringido): ' + jidStr);
                    logEvent('info', 'ignored_group', { sessionId, from: remoteJid });
                    return;
                }

                // Mensajes con imagen: OCR -> verificacion de pagos (Yape/PLIN/transferencia)
                // Nota: msgText puede venir vacio en mensajes solo-media; se procesan igual.
                {
                    const captionLower = String(msgText || '').toLowerCase();
                    const mediaInfo = (payload && (payload.media || (payload._data && payload._data.media))) || null;
                    const mediaMime = String((mediaInfo && mediaInfo.mimetype) || (payload && (payload.mimetype || (payload._data && payload._data.mimetype))) || '').toLowerCase();
                    const msgTypeStr = String((payload && (payload.type || (payload._data && payload._data.type))) || '').toLowerCase();
                    const isImageMsg = msgTypeStr === 'image' || msgTypeStr === 'photo' || /image/.test(msgTypeStr) || /image/.test(mediaMime) || (!!(payload && payload.hasMedia) && (/image|photo|media/.test(msgTypeStr) || /image/.test(mediaMime)));
                    if (isImageMsg) {
                        // Seguridad: SOLO numeros propios autorizados para OCR de pagos
                        const authorized = isPaymentOperator(...altIds);
                        if (authorized) {
                            console.log('ðŸ§¾ [PAGO/OCR] Imagen recibida de soporte/operador: procesando OCR...');
                            await handlePaymentImage(sessionId, remoteJid, altIds, payload || {});
                            console.log('='.repeat(30) + '\n');
                            return;
                        }
                        console.log('â© [OCR] Imagen ignorada (emisor no autorizado): ' + String(remoteJid || ''));
                        logEvent('info', 'payment_media_ignored_unauthorized', { sessionId, from: remoteJid });
                        return;
                    }
                }

                // Si es un evento vacÃ­o de prueba de la interfaz, no llamar a Ollama
                if (!msgText || msgText === 'Sin texto') {
                    logEvent('info', 'ignored_empty', { sessionId, from: remoteJid });
                    return;
                }

                // Compuerta de conversaciÃ³n: decide si el bot fue llamado o no.
                // Reglas: soporte siempre; takeover humano calla 6 h; cita al bot responde;
                // trigger fuerte responde; trigger dÃ©bil solo en chat nuevo o conversaciÃ³n activa.
                const calcData = parseHuanucoCalculator(msgText);
                const actionCandidate = findAction(msgText);
                const fromSupport = isSupportNumber(...altIds);
                const quotedToBot = isQuotedToBot(payload);
                const gateDecision = conversationGate.evaluate({
                    jid: String(remoteJid || ''),
                    text: msgText,
                    isSupport: fromSupport,
                    quotedToBot,
                    forceStrong: isPagePayload(msgText) || !!calcData,
                    actionId: actionCandidate ? actionCandidate.id : '',
                    actionOpensNewChat: !!(actionCandidate && actionCandidate.opensNewChat === true)
                });
                logEvent('info', 'gate_decision', {
                    sessionId,
                    from: remoteJid,
                    respond: gateDecision.respond,
                    reason: gateDecision.reason,
                    mode: gateDecision.mode || null,
                    strong: !!gateDecision.strong,
                    weak: !!gateDecision.weak
                });

                if (fromSupport) {
                    console.log('ðŸ›Ÿ Mensaje desde numero de apoyo principal - modo respuesta completa habilitado.');
                    logEvent('info', 'support_number_detected', { sessionId, from: remoteJid, ids: altIds.filter(Boolean).slice(0, 8) });
                }

                if (!gateDecision.respond) {
                    console.log('ðŸ¤« [GATE] Silencio (' + gateDecision.reason + '). El bot no fue llamado.');
                    logEvent('info', 'gate_silent', {
                        sessionId,
                        from: remoteJid,
                        reason: gateDecision.reason,
                        text: String(msgText || '').slice(0, 200)
                    });
                    return;
                }

                // Payload estructurado: Calculadora ROI Huanuco -> respuesta personalizada con datos
                if (calcData) {
                    console.log('ðŸ§® Payload de calculadora Huanuco detectado. Generando respuesta personalizada...');
                    const calcResponse = buildHuanucoCalculatorResponse(calcData);
                    console.log('ðŸ“± Enviando respuesta (calculadora huanuco) a WhatsApp (' + remoteJid + ')...');
                    const sendResult = await sendToWhatsApp(sessionId, remoteJid, calcResponse);
                    logEvent('info', isSendOk(sendResult) ? 'calc_huanuco_sent' : 'calc_huanuco_failed', { sessionId, from: remoteJid, plan: calcData.plan || null, perdida: calcData.perdida || null, sector: calcData.sector || null, support: fromSupport, sendResult: String(sendResult || '').slice(0, 300) });
                    console.log('âœ… Ciclo completado con exito (calculadora huanuco)');
                    console.log('='.repeat(30) + '\n');
                    return;
                }

                // Para numero de apoyo principal: gestionar directivas o priorizar IA con conocimiento completo
                if (fromSupport) {
                    const trimmed = (msgText || '').trim();
                    const lowerTrim = trimmed.toLowerCase();
                    // Comandos de gestion de directivas de comunicacion
                    if (/^(listar directivas|ver directivas|directivas\??)$/i.test(lowerTrim)) {
                        const txt = BOT_DIRECTIVES.length
                            ? ('Directivas actuales (' + BOT_DIRECTIVES.length + '):\n' + BOT_DIRECTIVES.map((d, i) => (i + 1) + '. ' + d.text).join('\n'))
                            : 'No hay directivas guardadas aun. Puedes agregar con: DIRECTIVA: ...';
                        await sendToWhatsApp(sessionId, remoteJid, txt);
                        logEvent('info', 'directives_listed', { sessionId, from: remoteJid, count: BOT_DIRECTIVES.length });
                        return;
                    }
                    if (/^(borrar directivas|limpiar directivas|eliminar directivas)$/i.test(lowerTrim)) {
                        clearDirectives();
                        await sendToWhatsApp(sessionId, remoteJid, 'Listo, se borraron todas las directivas. Puedes agregar nuevas con: DIRECTIVA: ...');
                        logEvent('info', 'directives_cleared', { sessionId, from: remoteJid });
                        return;
                    }
                    const dirMatch = trimmed.match(/^(DIRECTIVA|INSTRUCCION|INSTRUCCI[ÓO]N|REGLA|GUIA|GU[ÍI]A|APRENDE)\s*:\s*([\s\S]+)$/i);
                    if (dirMatch && dirMatch[2] && dirMatch[2].trim()) {
                        const saved = addDirective(dirMatch[2].trim());
                        await sendToWhatsApp(sessionId, remoteJid, 'Directiva guardada (' + BOT_DIRECTIVES.length + '): "' + saved + '". La aplicare cuando corresponda, sin contradecir seguridad ni inventar datos.');
                        logEvent('info', 'directive_added', { sessionId, from: remoteJid, text: saved });
                        return;
                    }

                    console.log('[APOYO] Consultando a IA con conocimiento completo (' + BOT_MODEL + ' via ' + BOT_PROVIDER + ')...');
                    const supportPrompt = [
                        '[MODO APOYO INTERNO - REMITENTE AUTORIZADO]',
                        'Remitente/chat: ' + String(remoteJid || ''),
                        'Responde con conocimiento del ecosistema Piston Quarks. Sé preciso y útil.',
                        'Límites: no inventes datos/precios no confirmados; no afirmes ser Rony humano; no recomiendes suplantar identidad ni ocultar que es bot si un cliente lo pregunta; no expongas credenciales o infraestructura sensible; usa solo contexto de esta conversación.',
                        'Si te piden fijar una conducta, indica que la envíen como "DIRECTIVA: ..." (solo apoyo autorizado).',
                        '',
                        'Mensaje:',
                        msgText
                    ].join('\n');
                    const aiResponse = await callAI(supportPrompt, 'support_' + String(remoteJid || sessionId));
                    console.log('AI Respuesta (apoyo):', aiResponse);
                    const finalResponse = (aiResponse && aiResponse.trim()) ? aiResponse : 'No pude generar respuesta en este momento. Indica qué necesitas y te apoyo con el contexto disponible.';
                    console.log('Enviando respuesta (apoyo/IA) a WhatsApp (' + remoteJid + ')...');
                    const sendResult = await sendToWhatsApp(sessionId, remoteJid, finalResponse);
                    logEvent('info', isSendOk(sendResult) ? 'ai_sent_support' : 'ai_failed_support', { sessionId, from: remoteJid, provider: BOT_PROVIDER, model: BOT_MODEL, sendResult: String(sendResult || '').slice(0, 300) });
                    console.log('Ciclo completado con exito (apoyo/IA)');
                    console.log('='.repeat(30) + '\n');
                    return;
                }

                // Manual de acciones: respuesta predefinida por intento
                const action = actionCandidate;
                if (action) {
                    console.log('Accion predefinida detectada: ' + action.id);
                    // Identidad: NO responder al cliente. Avisar a Rony con quién y contexto, y quedar en silencio.
                    if (action.id === 'identidad_bot' || action.silentToUser) {
                        const alertMsg = [
                            'ALERTA: pregunta de identidad (bot en silencio).',
                            'Chat/ID: ' + String(remoteJid || ''),
                            'IDs: ' + (altIds || []).filter(Boolean).slice(0,6).join(' | '),
                            'Mensaje: "' + String(msgText || '').slice(0, 300) + '"',
                            'Acción: responde tú directamente en ese chat o indícame por el medio de supervisión (928059006) usando DIRECTIVA: ... qué responder. No se envió respuesta al cliente.'
                        ].join('\n');
                        try {
                            const ar = await sendToWhatsApp(sessionId, ALERT_NUMBER, alertMsg);
                            logEvent(isSendOk(ar) ? 'info' : 'warn', 'identity_alert', { sessionId, from: remoteJid, chat: String(remoteJid || ''), ok: isSendOk(ar), msg: String(msgText||'').slice(0,200) });
                        } catch (e) {
                            logEvent('warn', 'identity_alert_error', { sessionId, from: remoteJid, error: String(e && e.message || e) });
                        }
                        // Intento adicional al número de supervisión/apoyo si es distinto
                        try {
                            const supJid = SUPPORT_NUMBER_DIGITS + '@c.us';
                            if (supJid !== String(ALERT_NUMBER)) {
                                await sendToWhatsApp(sessionId, supJid, alertMsg);
                            }
                        } catch (e) { /* ignore */ }
                        logEvent('info', 'action_silent_identity', { sessionId, from: remoteJid, action: action.id });
                        console.log('Identidad: silencio al cliente y alerta enviada a Rony.');
                        console.log('='.repeat(30) + '\n');
                        return;
                    }
                    console.log('Enviando respuesta (accion: ' + action.id + ') a WhatsApp (' + remoteJid + ')...');
                    const sendResult = await sendToWhatsApp(sessionId, remoteJid, (action.response || '').trim());
                    logEvent('info', isSendOk(sendResult) ? 'action_sent' : 'action_failed', { sessionId, from: remoteJid, action: action.id, sendResult: String(sendResult || '').slice(0, 300) });
                    if (action.id === 'escalamiento' && !fromSupport) {
                        await alertHuman(sessionId, remoteJid, 'escalamiento', msgText, action.response);
                    }
                    console.log('Ciclo completado con exito (accion predefinida: ' + action.id + ')');
                    console.log('='.repeat(30) + '\n');
                    return;
                }

                console.log('Consultando a IA (' + BOT_MODEL + ' via ' + BOT_PROVIDER + ')...');
                const isNewConv = String(gateDecision.reason || '').includes('new_chat');
                const chatCtx = '[Contexto de conversación] chat=' + String(remoteJid || '') + ' | estado=' + (isNewConv ? 'primer_contacto' : 'conversacion_activa') + ' | usa solo historial de este chat, no inventes datos ni mezcles clientes.';
                const aiResponse = await callAI(msgText, String(remoteJid || sessionId), chatCtx);
                console.log('AI Respuesta:', aiResponse);

                const finalResponse = (aiResponse && aiResponse.trim()) ? aiResponse : 'No quiero inventarte una respuesta y ahora mismo no puedo confirmarla. EscrÃ­bele directo a Rony, de PistÃ³n Quarks: +51 930 640 071. Ã‰l ve tu caso y te responde.';

                console.log('ðŸ“± Enviando respuesta a WhatsApp (' + remoteJid + ')...');
                const sendResult = await sendToWhatsApp(sessionId, remoteJid, finalResponse);
                logEvent('info', isSendOk(sendResult) ? 'ai_sent' : 'ai_failed', { sessionId, from: remoteJid, provider: BOT_PROVIDER, model: BOT_MODEL, reply: String(finalResponse || '').slice(0, 500), sendResult: String(sendResult || '').slice(0, 300) });

                // Relevo real: si la IA no respondiÃ³ o derivÃ³ a Rony, avisarle.
                if (!fromSupport) {
                    const derivo = /930\s*640\s*071/.test(finalResponse || '');
                    if (!aiResponse || derivo) {
                        await alertHuman(sessionId, remoteJid, aiResponse ? 'derivo_a_rony' : 'ia_sin_respuesta', msgText, finalResponse);
                    }
                }

                console.log('âœ… Ciclo completado con Ã©xito');
                console.log('='.repeat(30) + '\n');

            } catch (error) {
                console.error('âŒ Error procesando webhook:', error);
                try { logEvent('error', 'webhook_error', { error: String(error && error.message || error) }); } catch (e) {}
            }
        });
    } else if (pathname === '/admin/manifest.webmanifest' && req.method === 'GET') {
        try { const p = path.join(__dirname, '..', 'manifest.webmanifest'); res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8' }); res.end(fs.readFileSync(p)); } catch(e){ res.writeHead(404); res.end(); }
        return;
    } else if (pathname === '/admin/sw.js' && req.method === 'GET') {
        try { const p = path.join(__dirname, '..', 'sw.js'); res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Service-Worker-Allowed': '/admin/' }); res.end(fs.readFileSync(p)); } catch(e){ res.writeHead(404); res.end(); }
        return;
    } else if (pathname === '/admin/icon-192.png' && req.method === 'GET') {
        try { const p = path.join(__dirname, '..', 'icon-192.png'); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(fs.readFileSync(p)); } catch(e){ res.writeHead(404); res.end(); }
        return;
    } else if (pathname === '/admin/icon-512.png' && req.method === 'GET') {
        try { const p = path.join(__dirname, '..', 'icon-512.png'); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(fs.readFileSync(p)); } catch(e){ res.writeHead(404); res.end(); }
        return;
    } else if (pathname === '/admin' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getAdminHtml());
        return;
    } else if (pathname === '/admin/events' && req.method === 'GET') {
        const u = new URL(req.url, 'http://localhost');
        const limit = Math.max(1, Math.min(1000, Number(u.searchParams.get('limit') || 200)));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ events: readRecentEvents(limit) }));
        return;
    } else if (pathname === '/admin/chats' && req.method === 'GET') {
        const u = new URL(req.url, 'http://localhost');
        const limit = Math.max(1, Math.min(300, Number(u.searchParams.get('limit') || 80)));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ chats: summarizeChats(limit), sessionId: LAST_SESSION_ID }));
        return;
    } else if (pathname === '/admin/chat' && req.method === 'GET') {
        const u = new URL(req.url, 'http://localhost');
        const jid = String(u.searchParams.get('jid') || '').trim();
        const limit = Math.max(1, Math.min(500, Number(u.searchParams.get('limit') || 120)));
        const raw = readChatState()[jid] || null;
        let state = raw;
        if (raw && typeof raw === 'object') {
            const botIntervened = !!(raw.lastBotAt || raw.turns);
            const humanIntervened = !!(raw.lastHumanAt);
            const aiSuspected = !!(raw.aiSuspected);
            let intervention = 'none';
            if (aiSuspected) intervention = 'ai_detected';
            else if (botIntervened && humanIntervened) intervention = 'both';
            else if (humanIntervened) intervention = 'human_only';
            else if (botIntervened) intervention = 'bot_only';
            state = { name: '', pushname: '', number: String(jid || '').replace(/@.*$/, '').replace(/\D/g, ''), isBusiness: false, aiSuspected: false, aiSuspectedReason: '', botIntervened, humanIntervened, intervention, ...raw, botIntervened, humanIntervened, intervention };
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jid, events: chatEvents(jid, limit), state }));
        return;
    } else if (pathname === '/admin/directives' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ directives: BOT_DIRECTIVES }));
        return;
    } else if (pathname === '/admin/directives' && req.method === 'POST') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            let parsed = {};
            try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON inválido' })); return; }
            const text = String(parsed.text || '').trim();
            if (!text) { res.writeHead(400); res.end(JSON.stringify({ error: 'text requerido' })); return; }
            const saved = addDirective(text);
            logEvent('info', 'directive_added_panel', { text: saved });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, text: saved, directives: BOT_DIRECTIVES }));
        });
        return;
    } else if (pathname === '/admin/directives/clear' && req.method === 'POST') {
        clearDirectives();
        logEvent('info', 'directives_cleared_panel', {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, directives: BOT_DIRECTIVES }));
        return;
    } else if (pathname === '/admin/send' && req.method === 'POST') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', async () => {
            let parsed = {};
            try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON inválido' })); return; }
            const chatId = String(parsed.chatId || parsed.jid || '').trim();
            const text = String(parsed.text || '').trim();
            const sessionId = String(parsed.sessionId || LAST_SESSION_ID || '').trim();
            if (!chatId || !text) { res.writeHead(400); res.end(JSON.stringify({ error: 'chatId y text requeridos' })); return; }
            try {
                const result = await sendToWhatsApp(sessionId, chatId, text);
                const ok = isSendOk(result);
                if (ok) {
                    try { conversationGate.noteBotSend(chatId, text); } catch (e) { /* ignore */ }
                }
                logEvent(ok ? 'info' : 'warn', 'panel_send', { sessionId, chat: chatId, text: text.slice(0, 500), ok, result: String(result || '').slice(0, 300) });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok, sessionId, chatId, result: String(result || '').slice(0, 300) }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
            }
        });
        return;
    } else if (pathname === '/admin/ai-assist' && req.method === 'POST') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', async () => {
            let parsed = {};
            try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON inválido' })); return; }
            const message = String(parsed.message || '').trim();
            const jid = String(parsed.jid || '').trim();
            const mode = String(parsed.mode || 'chat').trim();
            const objective = String(parsed.objective || '').trim();
            const assistantMode = String(parsed.assistantMode || 'plan').trim().toLowerCase() === 'execute' ? 'execute' : 'plan';
            const confirm = !!parsed.confirm;
            if (!message && !mode) { res.writeHead(400); res.end(JSON.stringify({ error: 'message requerido' })); return; }

            const chatState = jid ? (readChatState()[jid] || {}) : {};
            const transcript = jid ? buildChatTranscript(jid, 120) : '';
            const styleSample = (mode === 'style_massive' || mode === 'style_one') ? collectOwnerStyleSample(mode === 'style_massive' ? 40 : 10, 25) : [];
            const caps = {
                puede: ['Analizar conversaciones seleccionadas o en muestra masiva', 'Resumir contexto, intención, objeciones y etapa', 'Sugerir respuestas con variantes', 'Extraer estilo de comunicación del dueño', 'Preparar borradores y programaciones locales', 'Guardar historial del asistente en el panel'],
                no_puede_sin_confirmacion: ['Enviar mensajes al cliente por sí mismo en modo plan', 'Cambiar configuración crítica sin revisión', 'Prometer pagos/acciones externas no verificadas'],
                modo: assistantMode
            };
            const system = [
                'Eres Piston Bot Assistant: asesor especializado en comunicación y ventas por WhatsApp para el dueño del negocio.',
                'Tu enfoque: entender contexto, intención, objeciones, etapa del embudo y objetivo comercial; responder con claridad, empatía y orientación a conversión sin presión.',
                'Primero confirma que entendiste en una línea: "Entendido: ..."',
                'Luego responde con estructura: 1) Entendido 2) Análisis de venta/contexto 3) Plan o Ejecución 4) Respuesta sugerida 5) Variante corta 6) Siguiente paso.',
                'Si assistantMode=plan: NO ejecutes acciones; solo diagnostica, propone estrategia y pide confirmación antes de ejecutar.',
                'Si assistantMode=execute: prepara borradores listos para usar; si hay acción sensible (enviar, programar, cambiar config) márcala como "ACCIÓN PENDIENTE DE CONFIRMACIÓN" salvo confirm=true.',
                'Adapta tono al estilo del dueño cuando haya muestra. No inventes datos, precios no autorizados ni promesas imposibles.',
                'Si conviene programar seguimiento, sugiere fecha/hora, objetivo y texto propuesto.'
            ].join(' ');
            let userPrompt = `assistantMode=${assistantMode}\nconfirm=${confirm}\nMODO=${mode}\nOBJETIVO=${objective || '(no especificado)'}\nJID=${jid || '(ninguno)'}\nCAPACIDADES=${JSON.stringify(caps)}\nESTADO_CHAT=${JSON.stringify(chatState).slice(0, 2000)}\n`;
            if (transcript) userPrompt += `\nTRANSCRIPCION_RECIENTE:\n${transcript}\n`;
            if (styleSample.length) userPrompt += `\nMUESTRA_ESTILO_HUMANO_DUENO:\n- ${styleSample.join('\n- ')}\n`;
            userPrompt += `\nSOLICITUD_DEL_OPERADOR:\n${message || 'Analiza y responde.'}`;

            const reply = await callAssistantAI(system, userPrompt);
            const entry = { ts: new Date().toISOString(), role: 'exchange', jid, mode, assistantMode, objective, message, reply: reply || '', confirm };
            pushAssistHistory(entry);
            logEvent('info', 'panel_ai_assist', { mode, assistantMode, jid, objective: objective.slice(0, 120), ok: !!reply });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: !!reply, reply: reply || 'No pude generar respuesta con el modelo actual. Verifica OPENROUTER_API_KEY/modelo.', mode, assistantMode, jid, caps }));
        });
        return;
    } else if (pathname === '/admin/ai-history' && req.method === 'GET') {
        const data = readAssistHistory();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
    } else if (pathname === '/admin/ai-history/clear' && req.method === 'POST') {
        writeAssistHistory({ messages: [], plans: [] });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    } else if (pathname === '/admin/scheduled' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ items: readScheduled() }));
        return;
    } else if (pathname === '/admin/scheduled' && req.method === 'POST') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            let parsed = {};
            try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON inválido' })); return; }
            const jid = String(parsed.jid || parsed.chatId || '').trim();
            const text = String(parsed.text || '').trim();
            const sendAt = String(parsed.sendAt || '').trim();
            if (!jid || !text || !sendAt) { res.writeHead(400); res.end(JSON.stringify({ error: 'jid, text, sendAt requeridos' })); return; }
            const items = readScheduled();
            const item = { id: 'sch_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), jid, text, sendAt, createdAt: new Date().toISOString(), status: 'pending' };
            items.push(item); writeScheduled(items);
            logEvent('info', 'panel_schedule_created', { jid, sendAt });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, item, items }));
        });
        return;
    } else if (pathname === '/admin/scheduled/cancel' && req.method === 'POST') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            let parsed = {};
            try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON inválido' })); return; }
            const id = String(parsed.id || '').trim();
            const items = readScheduled();
            const item = items.find(x => x.id === id);
            if (item) { item.status = 'cancelled'; item.cancelledAt = new Date().toISOString(); writeScheduled(items); }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: !!item, items }));
        });
        return;
    } else if (pathname === '/admin/scheduled/delete' && req.method === 'POST') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            let parsed = {};
            try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON inválido' })); return; }
            const id = String(parsed.id || '').trim();
            const items = readScheduled().filter(x => x.id !== id);
            writeScheduled(items);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, items }));
        });
        return;
    } else if (pathname === '/admin/sessions' && req.method === 'GET') {
        const items = readSessionsRegistry().map(sessionRuntimeStatus);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, current: { port: PORT, sessionName: SESSION_NAME, sessionSlug: SESSION_SLUG, dataDir: DATA_DIR }, items }));
        return;
    } else if (pathname === '/admin/sessions/create' && req.method === 'POST') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            let parsed = {};
            try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON inválido' })); return; }
            const name = String(parsed.name || '').trim() || ('Sesión ' + (readSessionsRegistry().length + 1));
            const slug = slugify(parsed.slug || name);
            const port = Number(parsed.port || 0) || (2013 + readSessionsRegistry().length + 1);
            const waUrl = String(parsed.waUrl || process.env.OPENWA_URL || 'http://127.0.0.1:2785').trim();
            const waSession = String(parsed.waSession || '').trim();
            const provider = String(parsed.provider || BOT_PROVIDER || 'openrouter').trim();
            const model = String(parsed.model || BOT_MODEL || '').trim();
            const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.map(x=>String(x).trim()).filter(Boolean) : (String(parsed.keywords||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean));
            const prompt = String(parsed.prompt || SYSTEM_PROMPT || '').trim();
            const businessInfo = String(parsed.businessInfo || '').trim();
            const dir = path.join(__dirname, '..', 'sessions', slug);
            ensureSessionFiles(dir, { keywords, prompt, provider, model, paymentOperators: PAYMENT_OPERATORS, directives: businessInfo ? [{ text: 'INFORMACIÓN DEL NEGOCIO: ' + businessInfo, addedAt: new Date().toISOString() }] : [] });
            const items = readSessionsRegistry();
            if (items.some(x => x.slug === slug || Number(x.port) === Number(port))) { res.writeHead(400); res.end(JSON.stringify({ error: 'slug o puerto ya existe' })); return; }
            const item = { id: 'ses_' + Date.now(), slug, name, port, waUrl, waSession, provider, model, keywords, businessInfo, dataDir: dir, createdAt: new Date().toISOString(), status: 'stopped', pid: null };
            items.push(item); writeSessionsRegistry(items);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, item, panelUrl: 'http://127.0.0.1:' + port + '/admin' }));
        });
        return;
    } else if (pathname === '/admin/sessions/start' && req.method === 'POST') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            let parsed = {};
            try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON inválido' })); return; }
            const slug = String(parsed.slug || '').trim();
            const items = readSessionsRegistry();
            const item = items.find(x => x.slug === slug);
            if (!item) { res.writeHead(404); res.end(JSON.stringify({ error: 'sesión no encontrada' })); return; }
            const st = sessionRuntimeStatus(item);
            if (st.running) { res.writeHead(200); res.end(JSON.stringify({ ok: true, item: st, alreadyRunning: true })); return; }
            const projectRoot = path.join(__dirname, '..', '..');
            const env = { ...process.env, PORT: String(item.port), SESSION_DATA_DIR: item.dataDir, SESSION_NAME: item.name, SESSION_SLUG: item.slug, OPENWA_URL: item.waUrl || process.env.OPENWA_URL || '', OPENWA_SESSION: item.waSession || process.env.OPENWA_SESSION || '' };
            try {
                const child = spawn(process.execPath, [path.join(projectRoot, 'src', 'services', 'bridgeTest.js')], { cwd: projectRoot, env, detached: true, stdio: 'ignore', windowsHide: true });
                child.unref();
                item.pid = child.pid; item.status = 'running'; item.startedAt = new Date().toISOString();
                writeSessionsRegistry(items);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, item, panelUrl: 'http://127.0.0.1:' + item.port + '/admin' }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
            }
        });
        return;
    } else if (pathname === '/admin/sessions/stop' && req.method === 'POST') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            let parsed = {};
            try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON inválido' })); return; }
            const slug = String(parsed.slug || '').trim();
            const items = readSessionsRegistry();
            const item = items.find(x => x.slug === slug);
            if (!item) { res.writeHead(404); res.end(JSON.stringify({ error: 'sesión no encontrada' })); return; }
            try { if (item.pid) process.kill(Number(item.pid)); } catch (e) {}
            item.status = 'stopped'; item.stoppedAt = new Date().toISOString();
            writeSessionsRegistry(items);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, item }));
        });
        return;
    } else if (pathname === '/admin/actions' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ actions: BOT_ACTIONS }));
        return;
    } else if (pathname === '/admin/gate' && req.method === 'GET') {
        const snap = conversationGate.snapshot();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            chats: Object.keys(snap).length,
            humanTakeoverHours: conversationGate.HUMAN_TAKEOVER_MS / 3600000,
            dedupeSeconds: conversationGate.DEDUPE_MS / 1000,
            strongTriggers: conversationGate.STRONG_TRIGGERS.length,
            weakTriggers: conversationGate.WEAK_TRIGGERS.length,
            state: snap
        }));
        return;
    } else if (pathname === '/admin/gate/reset' && req.method === 'POST') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            let jid = '';
            try { jid = String(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}').jid || '').trim(); } catch (e) { /* body vacío */ }
            const ok = jid ? conversationGate.resetChat(jid) : false;
            logEvent('info', 'gate_reset', { jid, ok });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok, jid }));
        });
        return;
    } else if (pathname === '/admin/state' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...getBotState(), sessionId: LAST_SESSION_ID, sessionName: SESSION_NAME, sessionSlug: SESSION_SLUG, port: PORT, dataDir: DATA_DIR, actionsCount: BOT_ACTIONS.length, directivesCount: BOT_DIRECTIVES.length }));
        return;
    } else if (pathname === '/admin/payments' && req.method === 'GET') {
        let recent = [];
        try {
            if (fs.existsSync(PAYMENTS_FILE)) {
                const content = fs.readFileSync(PAYMENTS_FILE, 'utf8');
                recent = content.split('\n').filter(Boolean).slice(-20).map(line => { try { return JSON.parse(line); } catch (e) { return null; } }).filter(Boolean).reverse();
            }
        } catch (e) { /* hoja vacia */ }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ recent, total: recent.length }));
        return;
    } else if (pathname === '/admin/payments/clear' && req.method === 'POST') {
        try { fs.writeFileSync(PAYMENTS_FILE, '', 'utf8'); } catch (e) { /* ignore */ }
        logEvent('info', 'payments_cleared', {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    } else if (pathname === '/admin/state' && req.method === 'PUT') {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            let parsed = {};
            try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'JSON inválido' })); return; }
            const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.map(k => String(k).trim().toLowerCase()).filter(k => k.length > 0) : [...BOT_STATE_KEYWORDS];
            const prompt = typeof parsed.prompt === 'string' ? parsed.prompt : SYSTEM_PROMPT;
            saveBotState({
                keywords,
                prompt,
                provider: typeof parsed.provider === 'string' ? parsed.provider : BOT_PROVIDER,
                model: typeof parsed.model === 'string' ? parsed.model : BOT_MODEL,
                paymentOperators: Array.isArray(parsed.paymentOperators) ? parsed.paymentOperators.map(s => String(s).trim()).filter(Boolean) : PAYMENT_OPERATORS
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, state: getBotState() }));
        });
        return;
    } else {
        res.writeHead(404);
        res.end();
    }
});

async function tickScheduledMessages() {
    const items = readScheduled();
    const now = Date.now();
    let changed = false;
    for (const item of items) {
        if (!item || item.status !== 'pending') continue;
        const due = Date.parse(item.sendAt);
        if (!due || due > now) continue;
        try {
            const result = await sendToWhatsApp(LAST_SESSION_ID, item.jid, item.text);
            const ok = isSendOk(result);
            item.status = ok ? 'sent' : 'error';
            item.sentAt = new Date().toISOString();
            item.result = String(result || '').slice(0, 300);
            changed = true;
            logEvent(ok ? 'info' : 'warn', 'scheduled_send', { id: item.id, jid: item.jid, ok });
        } catch (e) {
            item.status = 'error';
            item.error = String(e && e.message || e).slice(0, 300);
            changed = true;
        }
    }
    if (changed) writeScheduled(items);
}

server.listen(PORT, '0.0.0.0', () => {
    console.log('ðŸš€ Puente Piston Quarks activo en puerto ' + PORT);
    console.log('ðŸŒ Esperando webhooks en http://localhost:' + PORT + '/webhook');
    console.log('ðŸšª Compuerta de conversaciÃ³n activa: takeover humano 6 h Â· dedupe 8 s Â· silencio si no lo llaman');
    console.log('ðŸ”‘ Keywords de referencia: ' + BOT_STATE_KEYWORDS.length);
    console.log('ðŸ¤– IA configurada: ' + BOT_PROVIDER + ' / ' + BOT_MODEL);
    console.log('ðŸŽ¯ Acciones predefinidas cargadas: ' + BOT_ACTIONS.length);
    console.log('ðŸ”‘ OPENROUTER_API_KEY configurada: ' + (process.env.OPENROUTER_API_KEY ? 'SI' : 'NO'));
    setInterval(() => { tickScheduledMessages().catch(() => {}); }, 30000);
});