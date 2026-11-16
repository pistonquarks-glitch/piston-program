const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 2013;
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OPENWA_URL = 'http://localhost:2785';
const DEFAULT_MODEL = 'qwen2.5-coder:3b'; // Modelo local (Ollama) o remoto (OpenRouter) segun BOT_PROVIDER
const DEFAULT_PROVIDER = 'ollama'; // 'ollama' | 'openrouter'
let BOT_PROVIDER = DEFAULT_PROVIDER;
let BOT_MODEL = DEFAULT_MODEL;
// System prompt del asistente Piston Quarks (Gema 4 - Ingeniería Conversacional)
// OPTIMIZADO con metodología Prompt Master (github.com/nidhinjs/prompt-master) para Qwen2.5 via Ollama
const DEFAULT_SYSTEM_PROMPT = [
  'Eres el asistente conversacional de Piston Quarks EIRL (Lima, Perú). Eres la Gema 4 (Ingeniería Conversacional) del ecosistema Piston Quarks.',
  'OBJETIVO: Atender consultas de potenciales clientes sobre los servicios y precios de las 9 Gemas de Piston Quarks en WhatsApp. Ser directo, cálido y conciso.',
  'CONTEXTO: Servicios y precios: Gema 1 POS Inventory S/550 (reg S/1,100, 50% OFF primeros 10); Gema 2 Presencia Digital S/1,200 (reg S/2,400, 50% OFF primeros 10); Gema 3 Viralización S/1,200; Gema 4 Ingeniería Conversacional S/1,200; Gema 5 IA Creativa S/1,200; Gema 6 Guionización S/1,200; Gema 7 Digitalización S/1,200; Gema 8 Automatización S/1,200; Gema 9 Piston Commerce: cotización personalizada; Centro Neutrino-Voltaico: transducción de energía neutrinovolcaica (Huánuco), ODS, soberanía industrial.',
  'RESTRICCIONES: Responde SIEMPRE en español, máximo 3 frases por respuesta (estilo WhatsApp). NO inventes precios, cupos, plazos o promesas. Si no sabes, indica que lo confirmará con el equipo comercial y solicita datos del cliente (tipo de negocio, volumen, sector). Si requiere decisiones comerciales o técnicas profundas, sugiere escalar a un humano de Piston Quarks (+51 930 640 071).',
  'SALIDA: Respuesta directa, sin preámbulos ni listas. Incluye datos de contacto cuando aplique.',
  'ANTI-HALLUCINACIÓN: Responde solo con la información del ecosistema. Si hay incertidumbre, escribe "no lo tengo claro" en lugar de adivinar.',
  'MEMORIA: Mantén el hilo de la conversación según el historial.'
].join('\n');
let SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT;

// Estado editable del bot (palabras/frases de activación + prompt de entrenamiento)
const DEFAULT_KEYWORDS = ['precio', 'catálogo', 'catalogo', 'planes', 'servicios', 'hola', 'información', 'informacion'];
let BOT_STATE_KEYWORDS = [...DEFAULT_KEYWORDS];
const BOT_STATE_FILE = path.join(__dirname, '..', 'bot_state.json');
const ACTIONS_FILE = path.join(__dirname, '..', 'bot_actions.json');
let BOT_ACTIONS = [];

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
    } catch (e) { /* sin archivo -> defaults */ }
    return { keywords: [...BOT_STATE_KEYWORDS], prompt: SYSTEM_PROMPT, provider: BOT_PROVIDER, model: BOT_MODEL };
}

function saveBotState(next) {
    if (Array.isArray(next.keywords)) BOT_STATE_KEYWORDS = next.keywords.map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    if (typeof next.prompt === 'string') SYSTEM_PROMPT = next.prompt;
    if (typeof next.provider === 'string') BOT_PROVIDER = next.provider;
    if (typeof next.model === 'string') BOT_MODEL = next.model;
    fs.writeFileSync(BOT_STATE_FILE, JSON.stringify({ keywords: BOT_STATE_KEYWORDS, prompt: SYSTEM_PROMPT, provider: BOT_PROVIDER, model: BOT_MODEL }, null, 2));
}

function getBotState() {
    return { keywords: [...BOT_STATE_KEYWORDS], prompt: SYSTEM_PROMPT, provider: BOT_PROVIDER, model: BOT_MODEL };
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

// Buscar una accion predefinida cuyo trigger matchee el mensaje entrante
function findAction(text) {
    const lowerMsg = (text || '').toLowerCase();
    for (const action of BOT_ACTIONS) {
        const triggers = action.triggers || [];
        for (const t of triggers) {
            const tl = (t || '').toLowerCase();
            if (tl && lowerMsg.includes(tl)) {
                return action;
            }
        }
    }
    return null;
}

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Piston Quarks - Panel del Bot</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; color: #222; background: #fafafa; }
  h1 { font-size: 22px; }
  label { display: block; margin: 18px 0 6px; font-weight: bold; font-size: 14px; }
  textarea { width: 100%; box-sizing: border-box; font-family: Consolas, monospace; font-size: 13px; padding: 10px; border: 1px solid #ccc; border-radius: 6px; min-height: 140px; }
  textarea#keywords { min-height: 120px; white-space: pre; }
  button { margin-top: 14px; padding: 10px 18px; font-size: 14px; border: none; border-radius: 6px; background: #0b6bcb; color: #fff; cursor: pointer; }
  button:hover { background: #095aa5; }
  #status { margin-top: 16px; padding: 10px; background: #eee; border-radius: 6px; font-size: 13px; white-space: pre-wrap; }
</style>
</head>
<body>
<h1>🤖 Piston Quarks - Panel del Bot</h1>
<p>Configura las palabras/frases que activan a la IA y el prompt de entrenamiento del asistente.</p>
<label for="prompt">Prompt de entrenamiento (system prompt):
  <textarea id="prompt"></textarea>
</label>
<label for="keywords">Palabras / frases de activación (una por línea):
  <textarea id="keywords"></textarea>
</label>
<label for="provider">Proveedor de IA:
    <select id="provider">
      <option value="ollama">Ollama (local - Qwen2.5)</option>
      <option value="openrouter">OpenRouter (Claude / GPT)</option>
    </select>
</label>
<label for="model">Modelo IA:
    <input id="model" type="text" placeholder="qwen2.5-coder:3b" />
</label>
<button id="saveBtn">💾 Guardar cambios</button>
<pre id="status">Cargando...</pre>
<script>
async function load() {
    const r = await fetch('/admin/state');
    const d = await r.json();
    document.getElementById('prompt').value = d.prompt;
    document.getElementById('keywords').value = (d.keywords || []).join('\\n');
    document.getElementById('provider').value = d.provider || 'ollama';
    document.getElementById('model').value = d.model || 'qwen2.5-coder:3b';
    document.getElementById('status').textContent = 'Prompt y palabras cargados. Keywords: ' + (d.keywords || []).join(', ');
}
async function save() {
    const keywords = document.getElementById('keywords').value.split('\\n').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
    const prompt = document.getElementById('prompt').value;
    const provider = document.getElementById('provider').value;
    const model = document.getElementById('model').value;
    const r = await fetch('/admin/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords, prompt, provider, model }) });
    const d = await r.json();
    document.getElementById('status').textContent = 'Guardado: ' + JSON.stringify(d.state);
}
document.getElementById('saveBtn').addEventListener('click', save);
window.addEventListener('load', load);
</script>
</body>
</html>`;

const conversationHistory = {};

async function callAI(prompt, sessionId) {
    if (!conversationHistory[sessionId]) {
        conversationHistory[sessionId] = [];
    }

    const fullPrompt = SYSTEM_PROMPT + '\n' + conversationHistory[sessionId].join('\n') + '\nUser: ' + prompt;

    const data = JSON.stringify({
        model: BOT_MODEL,
        prompt: fullPrompt,
        stream: false,
        options: { num_ctx: 4096 }
    });

    const isOpenRouter = (BOT_PROVIDER === 'openrouter');
    const target = isOpenRouter
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : OLLAMA_URL;
    const requestData = isOpenRouter
        ? JSON.stringify({
              model: BOT_MODEL,
              messages: [
                  { role: 'system', content: SYSTEM_PROMPT },
                  { role: 'user', content: prompt }
              ],
              stream: false
          })
        : data;
    const requestHeaders = isOpenRouter
        ? {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + (process.env.OPENROUTER_API_KEY || ''),
              'HTTP-Referer': 'https://pistonquarks.store',
              'X-Title': 'Piston Quarks Bot'
          }
        : { 'Content-Type': 'application/json' };

    return new Promise((resolve, reject) => {
        const req = http.request(target, {
            method: 'POST',
            headers: requestHeaders
        }, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => responseBody += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseBody);
                    conversationHistory[sessionId].push('User: ' + prompt);
                    conversationHistory[sessionId].push('AI: ' + (isOpenRouter ? ((parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content) || '') : ((parsed && parsed.response) || '')));
                    
                    if (conversationHistory[sessionId].length > 10) {
                        conversationHistory[sessionId].shift();
                        conversationHistory[sessionId].shift();
                    }
                    resolve(isOpenRouter ? ((parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content) || '') : ((parsed && parsed.response) || ''));
                } catch (e) {
                    reject('Error parsing Ollama response: ' + e.message);
                }
            });
        });
        req.on('error', reject);
        req.write(requestData);
        req.end();
    });
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
                'X-API-Key': 'owa_k1_ebc6f4496448cbfd9bbcef5c1d29495e3917413ca92cf44a8b14089be28e239e'
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => { console.log('📲 Respuesta Open-WA (' + sessionId + ' -> ' + chatId + '): ' + body); resolve(body); });
        });
        req.on('error', reject);
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
                console.log('📥 Evento recibido de Open-WA');
                
                const msgText = data.payload?.body || data.body || 'Sin texto';
                const sessionId = data.session || 'default';
                const remoteJid = data.payload?.from || 'unknown';

                console.log('Sesión:', sessionId);
                console.log('De:', remoteJid);
                console.log('Mensaje:', msgText);

                // Si es un evento vacío de prueba de la interfaz, no llamar a Ollama
                if (msgText === 'Sin texto') return;

                // Filtro de palabras clave de activación (configurable desde el panel)
                const lowerMsg = msgText.toLowerCase();
                const matchesKeyword = BOT_STATE_KEYWORDS.some(k => lowerMsg.includes(k));

                if (!matchesKeyword) {
                    console.log('⏩ [FILTRO ACTIVO] Mensaje ignorado: No contiene palabras clave autorizadas.');
                    return;
                }

                // Manual de acciones: respuesta predefinida por intento (evita improvisacion de la IA local)
                const action = findAction(msgText);
                if (action) {
                    console.log('🎯 Accion predefinida detectada: ' + action.id);
                    console.log('📱 Enviando respuesta (accion: ' + action.id + ') a WhatsApp (' + remoteJid + ')...');
                    await sendToWhatsApp(sessionId, remoteJid, (action.response || '').trim());
                    console.log('✅ Ciclo completado con exito (accion predefinida: ' + action.id + ')');
                    console.log('='.repeat(30) + '\n');
                    return;
                }

                console.log('🧠 Consultando a IA (' + BOT_MODEL + ' via ' + BOT_PROVIDER + ')...');
                const aiResponse = await callAI(msgText, sessionId);
                console.log('AI Respuesta:', aiResponse);

                const finalResponse = (aiResponse && aiResponse.trim()) ? aiResponse : 'Gracias por tu consulta. Te estoy pasando con un asistente especializado de Piston Quarks para darte una respuesta detallada. Un momento.';

                console.log('📱 Enviando respuesta a WhatsApp (' + remoteJid + ')...');
                await sendToWhatsApp(sessionId, remoteJid, finalResponse);

                console.log('✅ Ciclo completado con éxito');
                console.log('='.repeat(30) + '\n');

            } catch (error) {
                console.error('❌ Error procesando webhook:', error);
            }
        });
    } else if (pathname === '/admin' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(ADMIN_HTML);
        return;
    } else if (pathname === '/admin/state' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getBotState()));
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
                model: typeof parsed.model === 'string' ? parsed.model : BOT_MODEL
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

server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Puente Piston Quarks activo en puerto ' + PORT);
    console.log('🌐 Esperando webhooks en http://localhost:' + PORT + '/webhook');
    console.log('🔑 Keywords activas: ' + BOT_STATE_KEYWORDS.join(', '));
    console.log('🤖 IA configurada: ' + BOT_PROVIDER + ' / ' + BOT_MODEL);
    console.log('🎯 Acciones predefinidas cargadas: ' + BOT_ACTIONS.length);
    console.log('🔑 OPENROUTER_API_KEY configurada: ' + (process.env.OPENROUTER_API_KEY ? 'SI' : 'NO'));
});