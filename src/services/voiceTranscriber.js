// Transcripción de notas de voz de WhatsApp usando OpenRouter (audio -> texto).
const https = require('https');
const fs = require('fs');
const path = require('path');

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.TRANSCRIBE_MODEL || 'openai/gpt-audio-mini';

function getOpenRouterKey() {
    if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
    for (const f of [
        'C:\\Users\\USER\\Desktop\\HERRAMIENTAS DE IA\\Proyectos\\open piston code\\cuentas\\openrouter-directo\\api-key.txt',
        'C:\\Users\\USER\\openwa-data\\openrouter-key.txt'
    ]) {
        try { const v = fs.readFileSync(f, 'utf8').trim(); if (v) return v; } catch (e) {}
    }
    return '';
}

function mimeFor(mime) {
    const m = String(mime || '').toLowerCase();
    if (/ogg|opus/.test(m)) return 'audio/ogg';
    if (/mp4|m4a/.test(m)) return 'audio/mp4';
    if (/wav/.test(m)) return 'audio/wav';
    if (/mpeg|mp3/.test(m)) return 'audio/mpeg';
    return 'audio/ogg';
}

async function transcribeLocal(buffer, mime) {
    const { execFile } = require('child_process');
    const os = require('os');
    const fsSync = require('fs');
    const ext = /ogg|opus/.test(String(mime || '')) ? 'ogg' : (/mp4|m4a/.test(String(mime || '')) ? 'm4a' : 'wav');
    const tmp = path.join(os.tmpdir(), 'piston_voice_' + Date.now() + '.' + ext);
    try { fsSync.writeFileSync(tmp, buffer); } catch (e) { return { ok: false, error: 'tmp_write_error' }; }
    const script = path.join(__dirname, 'transcribe_local.py');
    return await new Promise((resolve) => {
        execFile('python', [script, tmp, 'es'], { timeout: 120000, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8', windowsHide: true },
            (err, stdout) => {
                try { fsSync.unlinkSync(tmp); } catch (e) {}
                if (err) return resolve({ ok: false, error: String(err.message || err).slice(0, 200) });
                const text = String(stdout || '').trim();
                resolve(text ? { ok: true, text } : { ok: false, error: 'transcripcion_vacia' });
            });
    });
}

async function transcribeAudio(buffer, mime) {
    const local = await transcribeLocal(buffer, mime);
    if (local.ok) return local;
    const key = getOpenRouterKey();
    if (!key) return { ok: false, error: 'sin_api_key' };
    const dataUrl = 'data:' + mimeFor(mime) + ';base64,' + buffer.toString('base64');
    const body = JSON.stringify({
        model: MODEL,
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: 'Transcribe esta nota de voz en español. Devuelve SOLO el texto hablado, sin comentarios.' },
                { type: 'input_audio', input_audio: { data: dataUrl, format: mimeFor(mime).split('/')[1] } }
            ]
        }],
        stream: false,
        max_tokens: 500
    });
    return await new Promise((resolve) => {
        const req = https.request(ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + key,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'HTTP-Referer': 'https://pistonquarks.store',
                'X-Title': 'Piston Bot Voice'
            }
        }, (res) => {
            let out = '';
            res.on('data', (c) => out += c);
            res.on('end', () => {
                try {
                    const p = JSON.parse(out);
                    if (p && p.error) return resolve({ ok: false, error: JSON.stringify(p.error).slice(0, 250) });
                    const msg = p && p.choices && p.choices[0] && p.choices[0].message;
                    let text = (msg && (msg.content || msg.audio && msg.audio.transcript)) || '';
                    text = String(text || '').replace(/^\s*(transcripción|transcript)[:\s]*/i, '').trim();
                    resolve(text ? { ok: true, text } : { ok: false, error: 'transcripcion_vacia' });
                } catch (e) { resolve({ ok: false, error: 'parse_error: ' + e.message + ' | ' + out.slice(0, 120) }); }
            });
        });
        req.on('error', (e) => resolve({ ok: false, error: e.message }));
        req.setTimeout(45000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
        req.write(body);
        req.end();
    });
}

module.exports = { transcribeAudio, getOpenRouterKey };
