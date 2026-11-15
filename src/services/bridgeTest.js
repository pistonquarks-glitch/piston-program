const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 2013;
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OPENWA_URL = 'http://localhost:2785';
const MODEL = 'qwen2.5-coder:3b'; // Asegúmate de que coincida con tu modelo activo en Ollama
// System prompt del asistente Piston Quarks (Gema 4 - Ingeniería Conversacional)
const DEFAULT_SYSTEM_PROMPT = [
  'Eres el asistente conversacional de Piston Quarks EIRL (Lima, Perú).',
  'Tu misión es atender consultas de potenciales clientes con calidez, claridad y rigor técnico.',
  'Debes responder siempre en español, de forma concisa (estilo WhatsApp) y sin inventar datos.',
  'Cuando respondas, puedes referirte a las 9 Gemas del ecosistema Piston Quarks:',
  '- Gema 1 POS Inventory: control de inventario POS offline-first, recetas, mesas, pedidos, reportes, exportación, alertas de stock. Precio: S/550 (precio regular S/1,100, 50% OFF primeros 10).',
  '- Gema 2 Presencia Digital: web + SEO + dominio propio, pago único. Precio: S/1,200 (S/2,400 reg, 50% OFF primeros 10).',
  '- Gema 3 Viralización: tráfico orgánico multi-canal. Precio: S/1,200.',
  '- Gema 4 Ingeniería Conversacional: chatbots, WhatsApp + IA 24/7, flujos conversacionales, seguimiento. Precio: S/1,200.',
  '- Gema 5 IA Creativa: generación de imágenes, videos, publicaciones con IA. Precio: S/1,200.',
  '- Gema 6 Guionización: storytelling y copy. Precio: S/1,200.',
  '- Gema 7 Digitalización: digitalización de negocios (clientes, inventario, ventas, empleados, docs). Precio: S/1,200.',
  '- Gema 8 Automatización: workflows y agentes IA (facturación, cobros, notificaciones). Precio: S/1,200.',
  '- Gema 9 Piston Commerce: integración total de las 8 gemas. Cotización personalizada.',
  '- Centro Neutrino-Voltaico: transducción de energía neutrinovolcaica (Huánuco), ODS, soberanía industrial.',
  'Reglas: no inventes precios, cupos, plazos o promesas. Si no sabes, indica que lo confirmará con el equipo comercial y solicita datos del cliente (tipo de negocio, volumen, sector). Si la consulta requiere decisiones comerciales o técnicas profundas, sugiere escalar a un humano de Piston Quarks vía WhatsApp (+51 930 640 071).',
  'Responde siempre en español.'
].join('\n');
let SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT;

// Estado editable del bot (palabras/frases de activación + prompt de entrenamiento)
const DEFAULT_KEYWORDS = ['precio', 'catálogo', 'catalogo', 'planes', 'servicios', 'hola', 'información', 'informacion'];
let BOT_STATE_KEYWORDS = [...DEFAULT_KEYWORDS];
const BOT_STATE_FILE = path.join(__dirname, '..', 'bot_state.json');

function loadBotState() {
    try {
        const raw = fs.readFileSync(BOT_STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.keywords) && parsed.keywords.every(k => typeof k === 'string') && typeof parsed.prompt === 'string') {
            BOT_STATE_KEYWORDS = parsed.keywords.map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
            SYSTEM_PROMPT = parsed.prompt;
            return { keywords: BOT_STATE_KEYWORDS, prompt: SYSTEM_PROMPT };
        }
    } catch (e) { /* sin archivo -> defaults */ }
    return { keywords: [...BOT_STATE_KEYWORDS], prompt: SYSTEM_PROMPT };
}

function saveBotState(next) {
    BOT_STATE_KEYWORDS = next.keywords.map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    SYSTEM_PROMPT = next.prompt;
    fs.writeFileSync(BOT_STATE_FILE, JSON.stringify(next, null, 2));
}

function getBotState() {
    return { keywords: [...BOT_STATE_KEYWORDS], prompt: SYSTEM_PROMPT };
}

// Cargar estado persistido (keywords + prompt) al arrancar el puente
loadBotState();

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
<button id="saveBtn">💾 Guardar cambios</button>
<pre id="status">Cargando...</pre>
<script>
async function load() {
    const r = await fetch('/admin/state');
    const d = await r.json();
    document.getElementById('prompt').value = d.prompt;
    document.getElementById('keywords').value = (d.keywords || []).join('\\n');
    document.getElementById('status').textContent = 'Prompt y palabras cargados. Keywords: ' + (d.keywords || []).join(', ');
}
async function save() {
    const keywords = document.getElementById('keywords').value.split('\\n').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
    const prompt = document.getElementById('prompt').value;
    const r = await fetch('/admin/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords, prompt }) });
    const d = await r.json();
    document.getElementById('status').textContent = 'Guardado: ' + JSON.stringify(d.state);
}
document.getElementById('saveBtn').addEventListener('click', save);
window.addEventListener('load', load);
</script>
</body>
</html>`;

const conversationHistory = {};

async function callOllama(prompt, sessionId) {
    if (!conversationHistory[sessionId]) {
        conversationHistory[sessionId] = [];
    }

    const fullPrompt = SYSTEM_PROMPT + '\n' + conversationHistory[sessionId].join('\n') + '\nUser: ' + prompt;

    const data = JSON.stringify({
        model: MODEL,
        prompt: fullPrompt,
        stream: false,
        options: { num_ctx: 4096 }
    });

    return new Promise((resolve, reject) => {
        const req = http.request(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => responseBody += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseBody);
                    conversationHistory[sessionId].push('User: ' + prompt);
                    conversationHistory[sessionId].push('AI: ' + parsed.response);
                    
                    if (conversationHistory[sessionId].length > 10) {
                        conversationHistory[sessionId].shift();
                        conversationHistory[sessionId].shift();
                    }
                    resolve(parsed.response);
                } catch (e) {
                    reject('Error parsing Ollama response: ' + e.message);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
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

                console.log('🧠 Consultando a Ollama (' + MODEL + ')...');
                const aiResponse = await callOllama(msgText, sessionId);
                console.log('AI Respuesta:', aiResponse);

                console.log('📱 Enviando respuesta a WhatsApp (' + remoteJid + ')...');
                await sendToWhatsApp(sessionId, remoteJid, aiResponse);

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
            saveBotState({ keywords, prompt });
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
});