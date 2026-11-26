// Disparador de escaneo de comprobantes por WhatsApp.
// Claves: "OCR A IMAGEN", "CAPTURA DE ...", "PAGO DE ...".
// Guarda el motivo (plan/producto) declarado por el cliente para poder validar el pago.
const pricing = require('./pricing');

const KEYWORDS = [
  /^ocr$/i,
  /ocr\s+a?\s+imagen/i,
  /ocr\s+imagen/i,
  /analiza\s+(la\s+)?imagen/i,
  /escanea\s+(la\s+)?imagen/i,
  /leer\s+(la\s+)?imagen/i,
  /captura\s+de\b/i,
  /pago\s+de\b/i,
  /pague\s+(de|por)\b/i,
  /comprobante\s+de\s+pago/i
];

const PLAN_WORDS = {
  subscription: /\b(suscripci[oó]n|mensual|plan\s+de\s+100|100\s+soles|1[.,]?000\s+mensajes|1\s+mill[oó]n\s+de\s+tokens)\b/i,
  app_web: /\b(app\s*(web|por\s+web)|licencia\s+web|500\s+soles|5\s+millones|6\s+meses)\b/i,
  app_fisico: /\b(app\s*(f[ií]sico|presencial|tienda)|700\s+soles|compra\s+f[ií]sica)\b/i
};

class OcrTrigger {
  constructor(ttlMs = 15 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.pending = new Map();
    this.lastImage = new Map();
  }

  detect(text) {
    const t = String(text || '').trim();
    if (!t) return false;
    return KEYWORDS.some(re => re.test(t));
  }

  // Extrae el plan/producto del mensaje del cliente.
  extractPlan(text) {
    const t = String(text || '');
    for (const [planId, re] of Object.entries(PLAN_WORDS)) {
      if (re.test(t)) {
        const plan = pricing.PLANS[planId];
        return { planId, label: plan.label, expected: plan.price, declared: true };
      }
    }
    // Si dice un monto exacto, usar la sugerencia por monto (no la marca como declarada).
    const amt = String(t.match(/s\/?\.?\s*([\d][\d,]*(?:\.\d{1,2})?)/i)?.[1] || '').replace(/,/g, '');
    const n = Number(amt);
    if (Number.isFinite(n) && n > 0) {
      const sug = pricing.suggestPlanByAmount(n);
      if (sug && sug.exact) return { planId: sug.planId, label: (pricing.PLANS[sug.planId] || {}).label || sug.planId, expected: sug.expected, declared: false };
    }
    return null;
  }

  arm(jid, intent = null) {
    const key = String(jid || 'default');
    this.pending.set(key, { until: Date.now() + this.ttlMs, intent: intent || null });
    return key;
  }

  get(jid) {
    const st = this.pending.get(String(jid || 'default'));
    if (!st) return null;
    if (Date.now() > st.until) { this.pending.delete(String(jid || 'default')); return null; }
    return st;
  }

  peek(jid) { return !!this.get(jid); }

  consume(jid) {
    const key = String(jid || 'default');
    const st = this.get(key);
    this.pending.delete(key);
    return st || false;
  }

  setIntent(jid, intent) {
    const st = this.get(jid);
    if (!st) return false;
    st.intent = intent;
    return true;
  }

  rememberImage(jid, payload) {
    this.lastImage.set(String(jid || 'default'), { payload, ts: Date.now() });
  }

  takeLastImage(jid, maxAgeMs = 10 * 60 * 1000) {
    const key = String(jid || 'default');
    const rec = this.lastImage.get(key);
    this.lastImage.delete(key);
    if (!rec) return null;
    if (Date.now() - rec.ts > maxAgeMs) return null;
    return rec.payload;
  }

  buildProgressReply() {
    return 'Procesando tu captura, un momento por favor…';
  }

  buildAskIntentReply() {
    return '¿Cuál es el motivo de este pago? Ejemplo: suscripción mensual, APP por web o APP físico. Responde y luego envía la captura.';
  }

  buildAskImageReply(intent) {
    const label = intent && intent.label ? ' (' + intent.label + ')' : '';
    return 'Procesando tu captura' + label + ', un momento por favor… Envía la imagen del comprobante.';
  }

  buildResultReply({ approved, planId, amount, reason, needsReview }) {
    if (approved) {
      const plan = pricing.PLANS[planId];
      return [
        '✅ Pago validado correctamente.',
        'Plan activado: ' + (plan ? plan.label : planId) + '.',
        'Monto detectado: S/ ' + Number(amount || 0).toFixed(2) + '.',
        'Ya puedes usar tu panel y tu bot. ¡Bienvenido a Piston Quarks!'
      ].join('\n');
    }
    if (needsReview) {
      return [
        'Tu pago quedó en revisión. Un supervisor lo verificará y te confirmaremos en breve.',
        'Motivo: ' + (reason || 'no pudimos confirmar los datos del comprobante') + '.',
        'No hace falta que vuelvas a enviarlo.'
      ].join('\n');
    }
    return ['❌ Pago no validado.', 'Motivo: ' + (reason || 'datos del comprobante no conformes') + '.', 'Si crees que es un error, vuelve a enviar la captura o escribe a soporte.'].join('\n');
  }

  buildReply(parsed, consistency) {
    const p = parsed || {};
    const ok = !!(consistency && consistency.ok);
    const money = (n) => (n != null && Number(n) > 0) ? 'S/ ' + Number(n).toFixed(2) : 'no detectado';
    const lines = [];
    lines.push(ok ? 'Imagen analizada: parece un comprobante de pago.' : 'Imagen analizada: datos parciales; revisa la captura.');
    lines.push('Banco/app: ' + (p.app || p.method || 'no detectado'));
    lines.push('Monto: ' + money(p.amount));
    lines.push('Remitente (emisor): ' + (p.sender || 'no detectado'));
    if (p.receiver) lines.push('Destinatario: ' + p.receiver);
    lines.push('N° de operación: ' + (p.reference || 'no detectado'));
    if (p.date || p.time) lines.push('Fecha/hora: ' + [p.date, p.time].filter(Boolean).join(' '));
    lines.push('Nota: análisis de apoyo con OCR; no confirma el pago por sí solo.');
    return lines.join('\n');
  }
}

module.exports = { OcrTrigger, KEYWORDS, PLAN_WORDS };
