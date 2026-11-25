// Disparador "OCR A IMAGEN" para escanear comprobantes desde cualquier número.
// Un mensaje con la clave activa el modo; la imagen siguiente (o la misma con caption) se analiza.
const KEYWORDS = [
  /ocr\s+a?\s+imagen/i,
  /ocr\s+imagen/i,
  /analiza\s+(la\s+)?imagen/i,
  /escanea\s+(la\s+)?imagen/i,
  /leer\s+(la\s+)?imagen/i
];

class OcrTrigger {
  constructor(ttlMs = 15 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.pending = new Map();
  }

  detect(text) {
    const t = String(text || '').trim();
    if (!t) return false;
    return KEYWORDS.some(re => re.test(t));
  }

  arm(jid) {
    const key = String(jid || 'default');
    this.pending.set(key, Date.now() + this.ttlMs);
    return key;
  }

  consume(jid) {
    const key = String(jid || 'default');
    const until = this.pending.get(key);
    if (!until) return false;
    this.pending.delete(key);
    if (Date.now() > until) return false;
    return true;
  }

  peek(jid) {
    const until = this.pending.get(String(jid || 'default'));
    return !!until && Date.now() <= until;
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

module.exports = { OcrTrigger, KEYWORDS };
