// Catalogo de planes y calculo de precios - Piston Quarks / Piston Bot
// Reglas confirmadas por el usuario (2026-11-25):
//  - Suscripcion: S/100/mes, 1M tokens/mes, 1000 mensajes/mes, 1 numero.
//  - APP/Alquiler: S/500 web o S/700 fisico, 6 meses, 5M tokens/mes, 5000 mensajes/mes, 1 numero.
//  - Numeros adicionales: 10% FIJO de descuento sobre la base, por cada numero extra.
//  - Cada numero adicional suma su propia cuota de tokens/mensajes.

const PLANS = {
  subscription: {
    id: 'subscription',
    label: 'Suscripción mensual',
    kind: 'subscription',
    price: 100,
    currency: 'PEN',
    durationMonths: 1,
    tokensPerMonth: 1000000,
    messagesPerMonth: 1000,
    includedNumbers: 1,
    extraNumberDiscount: 0.10,
    features: [
      'Panel propio + directivas + programados',
      '1 número WhatsApp (sesión aislada)',
      'Sin OCR, sin voz, sin integraciones externas',
      'Tope anti-baneo: 20 mensajes/minuto'
    ]
  },
  app_web: {
    id: 'app_web',
    label: 'APP / Alquiler (compra por web)',
    kind: 'app',
    price: 500,
    currency: 'PEN',
    durationMonths: 6,
    tokensPerMonth: 5000000,
    messagesPerMonth: 5000,
    includedNumbers: 1,
    extraNumberDiscount: 0.10,
    features: [
      'Licencia por 6 meses instalada en tu PC',
      '5,000,000 tokens/mes · 5,000 mensajes/mes',
      '1 número WhatsApp incluido',
      'Sin depender del PC de Piston Quarks'
    ]
  },
  app_fisico: {
    id: 'app_fisico',
    label: 'APP / Alquiler (compra física)',
    kind: 'app',
    price: 700,
    currency: 'PEN',
    durationMonths: 6,
    tokensPerMonth: 5000000,
    messagesPerMonth: 5000,
    includedNumbers: 1,
    extraNumberDiscount: 0.10,
    features: [
      'Licencia por 6 meses instalada en tu PC',
      '5,000,000 tokens/mes · 5,000 mensajes/mes',
      '1 número WhatsApp incluido',
      'Adquirido físicamente (tienda/presencial)'
    ]
  }
};

function money(n) {
  const v = Number(n) || 0;
  return 'S/ ' + v.toFixed(2).replace(/\.00$/, '');
}

// Calcula cotizacion. extraNumbers = cantidad de numeros ADICIONALES (0..N).
function quote(planId, extraNumbers) {
  const plan = PLANS[String(planId || '')];
  if (!plan) return null;
  const extras = Math.max(0, Math.min(20, parseInt(extraNumbers, 10) || 0));
  const extraUnit = Math.round(plan.price * (1 - plan.extraNumberDiscount) * 100) / 100;
  const extrasRows = [];
  for (let i = 1; i <= extras; i++) {
    extrasRows.push({ number: plan.includedNumbers + i, label: 'Número ' + (plan.includedNumbers + i), price: extraUnit, discount: plan.extraNumberDiscount });
  }
  const base = plan.price;
  const extrasTotal = Math.round(extraUnit * extras * 100) / 100;
  const total = Math.round((base + extrasTotal) * 100) / 100;
  return {
    planId: plan.id,
    planLabel: plan.label,
    kind: plan.kind,
    durationMonths: plan.durationMonths,
    base,
    baseLabel: money(base),
    extraUnit,
    extraUnitLabel: money(extraUnit),
    extras,
    extrasRows,
    extrasTotal,
    extrasTotalLabel: money(extrasTotal),
    total,
    totalLabel: money(total),
    totalNumbers: plan.includedNumbers + extras,
    tokensPerMonth: plan.tokensPerMonth * (plan.includedNumbers + extras),
    messagesPerMonth: plan.messagesPerMonth * (plan.includedNumbers + extras),
    features: plan.features,
    note: plan.kind === 'app'
      ? 'Pago único por ' + plan.durationMonths + ' meses. Se renueva al vencimiento.'
      : 'Cobro mensual recurrente.'
  };
}

function catalog() {
  return Object.values(PLANS).map(p => ({
    id: p.id,
    label: p.label,
    kind: p.kind,
    price: p.price,
    priceLabel: money(p.price),
    durationMonths: p.durationMonths,
    tokensPerMonth: p.tokensPerMonth,
    messagesPerMonth: p.messagesPerMonth,
    includedNumbers: p.includedNumbers,
    extraNumberDiscount: p.extraNumberDiscount,
    features: p.features
  }));
}

// Sugiere plan a partir de un monto detectado en un comprobante.
function suggestPlanByAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const candidates = catalog().map(p => ({ planId: p.id, diff: Math.abs(p.price - n), price: p.price }));
  candidates.sort((a, b) => a.diff - b.diff);
  const best = candidates[0];
  const tolerance = 0.02;
  return {
    planId: best.planId,
    expected: best.price,
    detected: n,
    diff: best.diff,
    exact: best.diff <= tolerance,
    tolerance
  };
}

module.exports = { PLANS, quote, catalog, money, suggestPlanByAmount };
