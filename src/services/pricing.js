// Catálogo Piston Quarks · Black Friday 2026-11-27
// Promo solo para los 20 primeros clientes; luego vuelven los precios regulares.
const PROMO = {
  active: true,
  name: 'Black Friday',
  date: '2026-11-27',
  seatsTotal: 20,
  seatsUsed: 0,
  logicTreesFreePerClient: 50,
  note: 'Promo de hoy. Después de los 20 primeros vuelven los precios regulares.'
};

const PLANS = {
  automatizadas: {
    id: 'automatizadas',
    label: 'Respuestas Automatizadas',
    kind: 'subscription',
    price: 15,
    regularPrice: 100,
    discountPercent: 85,
    promo: true,
    durationMonths: 1,
    promoMinimumMonths: 1,
    tokensPerMonth: 1000000,
    messagesPerMonth: 1000,
    includedNumbers: 1,
    extraNumberDiscount: 0.10,
    features: [
      'Flujo de respuestas por gatillos',
      'Panel propio + directivas',
      '1 número WhatsApp',
      'Sin OCR ni cerebro'
    ]
  },
  cerebro_sin_ocr: {
    id: 'cerebro_sin_ocr',
    label: 'Cerebro IA sin OCR',
    kind: 'subscription',
    price: 50,
    regularPrice: 400,
    discountPercent: 87.5,
    promo: true,
    durationMonths: 1,
    promoMinimumMonths: 6,
    tokensPerMonth: 2000000,
    messagesPerMonth: 2500,
    includedNumbers: 1,
    extraNumberDiscount: 0.10,
    features: [
      'IA personalizada por conversación',
      '50 árboles de lógica gratis',
      'Panel + directivas + programados',
      'Sin lector de comprobantes'
    ]
  },
  cerebro_ocr: {
    id: 'cerebro_ocr',
    label: 'Cerebro IA con OCR y reportes',
    kind: 'subscription',
    price: 120,
    regularPrice: 600,
    discountPercent: 80,
    promo: true,
    durationMonths: 1,
    promoMinimumMonths: 6,
    tokensPerMonth: 3000000,
    messagesPerMonth: 5000,
    includedNumbers: 1,
    extraNumberDiscount: 0.10,
    features: [
      'Todo lo del cerebro sin OCR',
      'OCR de comprobantes Yape/Plin/banco',
      'Reportes de entrantes y salientes',
      'Dashboard de pagos y consumo'
    ]
  },
  // Legacy: se conservan para no romper pagos anteriores.
  subscription: {
    id: 'subscription',
    label: 'Suscripción mensual (legacy)',
    kind: 'subscription',
    price: 100,
    regularPrice: 100,
    discountPercent: 0,
    promo: false,
    durationMonths: 1,
    tokensPerMonth: 1000000,
    messagesPerMonth: 1000,
    includedNumbers: 1,
    extraNumberDiscount: 0.10,
    features: ['Plan heredado']
  },
  app_web: {
    id: 'app_web',
    label: 'APP / Alquiler (legacy)',
    kind: 'app',
    price: 500,
    regularPrice: 500,
    discountPercent: 0,
    promo: false,
    durationMonths: 6,
    tokensPerMonth: 5000000,
    messagesPerMonth: 5000,
    includedNumbers: 1,
    extraNumberDiscount: 0.10,
    features: ['Plan heredado']
  },
  app_fisico: {
    id: 'app_fisico',
    label: 'APP / Alquiler físico (legacy)',
    kind: 'app',
    price: 700,
    regularPrice: 700,
    discountPercent: 0,
    promo: false,
    durationMonths: 6,
    tokensPerMonth: 5000000,
    messagesPerMonth: 5000,
    includedNumbers: 1,
    extraNumberDiscount: 0.10,
    features: ['Plan heredado']
  }
};

const ADDONS = {
  reportes_graficos: {
    id: 'reportes_graficos',
    label: 'Reportes con gráficos (entrantes/salientes)',
    price: 50,
    regularPrice: 600,
    discountPercent: 91.7,
    promo: true,
    durationMonths: 1,
    features: ['Gráficas de mensajes', 'Entrantes vs salientes', 'Picos por hora']
  },
  crm: {
    id: 'crm',
    label: 'CRM de clientes',
    price: 70,
    regularPrice: 100,
    discountPercent: 30,
    promo: true,
    durationMonths: 1,
    features: ['Clientes y planes', 'Seguimiento comercial', 'Historial por cliente']
  }
};

function money(n) {
  const v = Number(n) || 0;
  return 'S/ ' + v.toFixed(2).replace(/\.00$/, '');
}

function pct(n) { return Number(n || 0).toFixed(Number(n) % 1 ? 1 : 0) + '%'; }

function quote(planId, extraNumbers, addonIds = []) {
  const plan = PLANS[String(planId || '')];
  if (!plan) return null;
  const extras = Math.max(0, Math.min(20, parseInt(extraNumbers, 10) || 0));
  const extraUnit = Math.round(plan.price * (1 - plan.extraNumberDiscount) * 100) / 100;
  const extrasRows = [];
  for (let i = 1; i <= extras; i++) {
    extrasRows.push({ number: plan.includedNumbers + i, label: 'Número ' + (plan.includedNumbers + i), price: extraUnit, discount: plan.extraNumberDiscount });
  }
  const extrasTotal = Math.round(extraUnit * extras * 100) / 100;
  const ids = Array.isArray(addonIds) ? addonIds : [];
  const addons = ids.map(id => ADDONS[String(id)]).filter(Boolean).map(a => ({
    id: a.id, label: a.label, price: a.price, regularPrice: a.regularPrice, discountPercent: a.discountPercent
  }));
  const addonsTotal = addons.reduce((s, a) => s + a.price, 0);
  const base = plan.price;
  const total = Math.round((base + extrasTotal + addonsTotal) * 100) / 100;
  const regularTotal = Math.round((plan.regularPrice + (plan.regularPrice * (1 - plan.extraNumberDiscount) * extras) + addons.reduce((s, a) => s + a.regularPrice, 0)) * 100) / 100;
  return {
    planId: plan.id,
    planLabel: plan.label,
    kind: plan.kind,
    promo: plan.promo,
    discountPercent: plan.discountPercent,
    durationMonths: plan.durationMonths,
    promoMinimumMonths: plan.promoMinimumMonths || null,
    base,
    baseLabel: money(base),
    regularPrice: plan.regularPrice,
    regularPriceLabel: money(plan.regularPrice),
    extraUnit,
    extraUnitLabel: money(extraUnit),
    extras,
    extrasRows,
    extrasTotal,
    extrasTotalLabel: money(extrasTotal),
    addons,
    addonsTotal,
    addonsTotalLabel: money(addonsTotal),
    total,
    totalLabel: money(total),
    regularTotal,
    regularTotalLabel: money(regularTotal),
    totalNumbers: plan.includedNumbers + extras,
    tokensPerMonth: plan.tokensPerMonth * (plan.includedNumbers + extras),
    messagesPerMonth: plan.messagesPerMonth * (plan.includedNumbers + extras),
    logicTreesFree: PROMO.logicTreesFreePerClient,
    features: plan.features,
    note: plan.promo
      ? 'Black Friday: ' + pct(plan.discountPercent) + ' de descuento. Solo ' + PROMO.seatsTotal + ' clientes.'
      : (plan.kind === 'app' ? 'Pago por ' + plan.durationMonths + ' meses.' : 'Cobro mensual recurrente.')
  };
}

function catalog() {
  return {
    promo: { ...PROMO, remaining: Math.max(0, PROMO.seatsTotal - PROMO.seatsUsed) },
    plans: Object.values(PLANS).filter(p => p.promo || p.id === 'subscription').map(p => ({
      id: p.id,
      label: p.label,
      kind: p.kind,
      price: p.price,
      priceLabel: money(p.price),
      regularPrice: p.regularPrice,
      regularPriceLabel: money(p.regularPrice),
      discountPercent: p.discountPercent,
      discountLabel: p.discountPercent ? pct(p.discountPercent) + ' dto.' : '',
      promo: p.promo,
      durationMonths: p.durationMonths,
      promoMinimumMonths: p.promoMinimumMonths || null,
      tokensPerMonth: p.tokensPerMonth,
      messagesPerMonth: p.messagesPerMonth,
      includedNumbers: p.includedNumbers,
      extraNumberDiscount: p.extraNumberDiscount,
      features: p.features
    })),
    addons: Object.values(ADDONS).map(a => ({
      id: a.id, label: a.label, price: a.price, priceLabel: money(a.price),
      regularPrice: a.regularPrice, regularPriceLabel: money(a.regularPrice),
      discountPercent: a.discountPercent, discountLabel: pct(a.discountPercent) + ' dto.',
      features: a.features
    }))
  };
}

function suggestPlanByAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const list = catalog().plans;
  const candidates = list.map(p => ({ planId: p.id, diff: Math.abs(p.price - n), price: p.price }));
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

module.exports = { PLANS, ADDONS, PROMO, quote, catalog, money, suggestPlanByAmount };
