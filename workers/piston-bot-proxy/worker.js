// Proxy de rutas de Piston Bot en el dominio raiz.
// El resto del sitio sigue siendo servido por su origen normal.
const ORIGIN = 'https://wa.pistonquarks.store';
const PREFIXES = [
  '/piston-bot', '/blog', '/piston-bot-sitemap.xml', '/pistonbot-indexnow-', '/panel-plan', '/mi-panel', '/panel-cliente',
  '/instalacion', '/setup', '/public/', '/admin'
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const isPiston = PREFIXES.some(p => url.pathname === p || url.pathname.startsWith(p));
    if (!isPiston) return fetch(request);

    const target = new URL(url.pathname + url.search, ORIGIN);
    const headers = new Headers(request.headers);
    headers.set('Host', 'wa.pistonquarks.store');
    const init = { method: request.method, headers, redirect: 'manual' };
    if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) init.body = request.body;
    try {
      const res = await fetch(target, init);
      const out = new Response(res.body, res);
      out.headers.set('Cache-Control', 'no-store');
      return out;
    } catch (e) {
      return new Response('Piston Bot no disponible: ' + String(e && e.message || e), { status: 502 });
    }
  }
};
