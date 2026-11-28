// Piston Bot en el dominio raiz: paginas estaticas 24/7, proxy al puente local
// solo para面板/paneles dinamicos, y simulador con IA real sin depender de la PC.
const ORIGIN_FALLBACK = 'https://wa.pistonquarks.store';
const STATIC_EXACT = ['/piston-bot-sitemap.xml'];
const REMOTE_PREFIXES = [
  '/panel-plan', '/panel-cliente', '/instalacion', '/setup', '/public/', '/admin', '/public/setup'
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function asset(env, request, pathname) {
  const u = new URL(request.url);
  u.pathname = pathname;
  return env.ASSETS.fetch(new Request(u.toString(), request));
}

async function proxy(env, request) {
  const url = new URL(request.url);
  const origin = env.ORIGIN || ORIGIN_FALLBACK;
  const target = new URL(url.pathname + url.search, origin);
  const headers = new Headers(request.headers);
  headers.set('Host', new URL(origin).host);
  const init = { method: request.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) init.body = request.body;
  const res = await fetch(target, init);
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'no-store');
  return out;
}

function systemPrompt(cfg) {
  return [
    'Eres el bot de prueba de Piston Bot, un asistente de WhatsApp para una empresa real.',
    'Responde siempre en español, máximo 3 frases, estilo WhatsApp, sin listas ni markdown.',
    'Nunca digas que eres una IA de prueba ni menciones este simulador; actúa como el bot real del negocio.',
    'Usa SOLO los datos del negocio que te dieron. Si no sabes algo, pregunta o di que lo confirmarán.',
    'No inventes precios, horarios ni promociones fuera de los datos proporcionados.',
    '',
    'Nombre del negocio: ' + (cfg.business || 'Sin nombre'),
    'Rubro: ' + (cfg.rubro || 'General'),
    'Tono: ' + (cfg.tone || 'Amigable'),
    'Descripción: ' + (cfg.description || 'Sin descripción adicional')
  ].join('\n');
}

async function callAI(env, cfg, messages) {
  const key = env.OPENROUTER_API_KEY;
  if (!key) return 'Lo siento, el simulador no está disponible en este momento. Intenta más tarde.';
  const body = {
    model: env.MODEL || 'baidu/ernie-5.5-flash-preview:free',
    messages: [{ role: 'system', content: systemPrompt(cfg) }].concat(
      (messages || []).slice(-12).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content || '').slice(0, 1200) }))
    ),
    max_tokens: 400,
    temperature: 0.7
  };
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) return 'No pude responder ahora. Vuelve a intentarlo en unos segundos.';
  const d = await r.json();
  return String((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '').trim()
    || 'Cuéntame un poco más y te ayudo con gusto.';
}

function configKey(email, code) {
  return String(email || '').trim().toLowerCase() + '|' + String(code || '').trim().toUpperCase();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    try {
      // --- Simulador con IA ---
      if (p === '/api/simulator/chat' && request.method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const reply = await callAI(env, b.config || {}, b.messages || []);
        return json({ ok: true, reply });
      }
      if (p === '/api/simulator/save' && request.method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const email = String(b.email || '').trim(), code = String(b.code || '').trim();
        if (!email || !code) return json({ ok: false, error: 'faltan_credenciales' }, 400);
        const rec = {
          business: b.business || '', rubro: b.rubro || '', tone: b.tone || '',
          description: b.description || '', transcript: (b.transcript || []).slice(-20),
          updatedAt: new Date().toISOString()
        };
        await env.PISTON_SIM.put(configKey(email, code), JSON.stringify(rec));
        return json({ ok: true });
      }
      if (p === '/api/simulator/config' && request.method === 'GET') {
        const email = url.searchParams.get('email') || '', code = url.searchParams.get('code') || '';
        const raw = await env.PISTON_SIM.get(configKey(email, code));
        return json(raw ? { ok: true, config: JSON.parse(raw) } : { ok: false, error: 'sin_config' });
      }

      // --- Mi panel: enruta al panel del plan pagado ---
      if (p === '/mi-panel' || p === '/panel-cliente') {
        const email = url.searchParams.get('email') || '';
        const code = url.searchParams.get('code') || '';
        if (!email || !code) return asset(env, request, '/mi-panel-login.html');
        const bootUrl = new URL('/public/plan/bootstrap?email=' + encodeURIComponent(email) + '&code=' + encodeURIComponent(code), env.ORIGIN || ORIGIN_FALLBACK);
        const bootRes = await fetch(bootUrl, { headers: { 'Accept': 'application/json' } });
        const boot = await bootRes.json().catch(() => ({}));
        if (!boot.ok) return asset(env, request, '/mi-panel-login.html');
        const dest = new URL('/panel-plan' + (boot.planNumber || 1), url.origin);
        dest.searchParams.set('email', email);
        dest.searchParams.set('code', code);
        return Response.redirect(dest.toString(), 302);
      }

      // --- Paginas estaticas (no dependen de la laptop) ---
      if (p === '/piston-bot') return asset(env, request, '/piston-bot.html');
      if (p === '/piston-bot-simulator') return asset(env, request, '/piston-bot-simulator.html');
      if (p === '/blog' || p === '/blog/') return asset(env, request, '/blog/index.html');
      if (p.startsWith('/blog/') || STATIC_EXACT.includes(p) || p.startsWith('/pistonbot-indexnow-')) {
        return asset(env, request, p);
      }

      // --- Partes dinamicas: si la PC esta apagada, aviso claro ---
      if (REMOTE_PREFIXES.some(x => p === x || p.startsWith(x))) {
        try { return await proxy(env, request); }
        catch (e) {
          if (p.startsWith('/public/setup') || p.startsWith('/setup')) {
            return new Response('El puente WhatsApp está apagado. Enciende la PC y vuelve a abrir este enlace.', {
              status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          }
          return json({ ok: false, error: 'puente_apagado' }, 503);
        }
      }

      return asset(env, request, p);
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e).slice(0, 200) }, 502);
    }
  }
};
