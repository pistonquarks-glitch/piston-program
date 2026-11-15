const http = require('http');

const PORT = 2013;
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OPENWA_URL = 'http://localhost:2785';
const MODEL = 'qwen2.5-coder:3b'; // Asegúrate de que coincida con tu modelo activo en Ollama

// System prompt del asistente Piston Quarks (Gema 4 - Ingeniería Conversacional)
const SYSTEM_PROMPT = [
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

                // Filtro de palabras clave de activación
                const KEYWORDS = ['precio', 'catálogo', 'catalogo', 'planes', 'servicios', 'hola', 'información', 'informacion'];
                const lowerMsg = msgText.toLowerCase();
                const matchesKeyword = KEYWORDS.some(k => lowerMsg.includes(k));

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
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Puente Piston Quarks activo en puerto ' + PORT);
    console.log('🌐 Esperando webhooks en http://localhost:' + PORT + '/webhook');
});