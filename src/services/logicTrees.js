// Generador de árboles de lógica comercial para Piston Quarks / INKA BOT.
// Cada cliente recibe 50 árboles gratis. Flujo horizontal: gatillo -> atención -> interés -> deseo -> acción.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'logic_trees.json');

const PRODUCTS = {
  'respuestas-automatizadas': {
    label: 'Respuestas Automatizadas',
    triggers: ['automatizadas', 'respuestas automaticas', 'bot de respuestas', 'sistema de respuestas'],
    pain: 'pierdes tiempo respondiendo lo mismo',
    promise: 'responder al instante sin contratar más personal',
    cta: 'Solicitar demo'
  },
  'cerebro-ia': {
    label: 'Cerebro IA',
    triggers: ['cerebro ia', 'ia personalizada', 'cerebro', 'agente ia'],
    pain: 'tu negocio no piensa por ti en cada chat',
    promise: 'una IA entrenada con tu negocio que guía la venta',
    cta: 'Activar cerebro'
  },
  'ocr-pagos': {
    label: 'OCR y reportes',
    triggers: ['ocr', 'comprobante', 'yape', 'plin', 'reportes', 'dashboard'],
    pain: 'no sabes cuánto entró ni de quién',
    promise: 'leer comprobantes y ver entrantes, salientes y montos',
    cta: 'Ver reporte'
  },
  'crm': {
    label: 'CRM',
    triggers: ['crm', 'clientes', 'seguimiento', 'ventas'],
    pain: 'se te escapan clientes por falta de seguimiento',
    promise: 'tener cada cliente, plan y conversación en un solo lugar',
    cta: 'Abrir CRM'
  },
  'inka-bot': {
    label: 'INKA BOT',
    triggers: ['inka', 'inka bot', 'jarvis', 'piston corpus'],
    pain: 'hablas con una IA que no entiende tu negocio',
    promise: 'un asistente con voz, memoria y árboles de conversación propios',
    cta: 'Probar INKA BOT'
  }
};

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return { clients: {} }; }
}
function write(data) {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, FILE);
}

function buildTree(clientId, productKey, n) {
  const p = PRODUCTS[productKey];
  const trigger = p.triggers[n % p.triggers.length];
  return {
    id: `${clientId}_${productKey}_${n + 1}`,
    clientId,
    product: productKey,
    productLabel: p.label,
    trigger,
    orientation: 'horizontal',
    stages: [
      {
        order: 1,
        name: 'atencion',
        goal: 'Captar atención con el problema real del cliente',
        keywords: [p.pain, trigger, 'problema', 'tiempo'],
        question: '¿Qué parte de tu día se te va respondiendo WhatsApp?',
        say: `Detecté que ${p.pain}. ¿Quieres que te muestre cómo se resuelve?`,
        advanceWhen: 'El cliente reconoce el problema'
      },
      {
        order: 2,
        name: 'interes',
        goal: 'Generar interés con datos concretos y consecuencias',
        keywords: ['lo que se pierde', 'error', 'no sabe', 'demora', 'pierde'],
        question: '¿Cuánto pierdes cada día por no responder o no saber quién pagó?',
        say: `Hoy ${p.pain} y eso cuesta ventas. Con ${p.label} evitas perder chances.`,
        advanceWhen: 'El cliente cuantifica o acepta la pérdida'
      },
      {
        order: 3,
        name: 'deseo',
        goal: 'Crear deseo con la promesa de beneficio',
        keywords: ['beneficio', 'ahorro', 'crecer', 'fácil', 'rápido'],
        question: '¿Te gustaría que eso quedara resuelto automáticamente?',
        say: `La idea es ${p.promise}. Así tu equipo se enfoca en vender.`,
        advanceWhen: 'El cliente dice sí o pide detalles'
      },
      {
        order: 4,
        name: 'accion',
        goal: 'Cerrar con una acción concreta',
        keywords: ['demo', 'activar', 'comprar', 'empezar', 'plan'],
        question: '¿Lo activamos hoy o prefieres verlo primero?',
        say: `Perfecto. ${p.cta} y lo dejamos funcionando contigo.`,
        advanceWhen: 'El cliente acepta o agenda'
      }
    ],
    compass: 'Si el cliente aún no reconoce el problema, vuelve a atención; si ya lo acepta, avanza a interés; si pregunta beneficios, está en deseo; si pregunta precio o demo, está en acción.'
  };
}

function generate(clientId, count = 50) {
  const data = read();
  data.clients[clientId] = data.clients[clientId] || {};
  const existing = data.clients[clientId].trees || [];
  if (existing.length >= count) return { created: 0, total: existing.length };
  const keys = Object.keys(PRODUCTS);
  const created = [];
  for (let i = existing.length; i < count; i++) {
    created.push(buildTree(clientId, keys[i % keys.length], i));
  }
  data.clients[clientId].trees = existing.concat(created);
  data.clients[clientId].generatedAt = new Date().toISOString();
  write(data);
  return { created: created.length, total: count };
}

function list(clientId) {
  const data = read();
  return (data.clients[clientId] && data.clients[clientId].trees) || [];
}

function classifyStage(text) {
  const t = String(text || '').toLowerCase();
  if (/precio|cuanto|demo|activar|comprar|plan|empezar/.test(t)) return 'accion';
  if (/beneficio|ahorro|crecer|facil|rapido|gustaria/.test(t)) return 'deseo';
  if (/pierdo|pierdes|error|no se|demora|cuanto pierde/.test(t)) return 'interes';
  return 'atencion';
}

module.exports = { generate, list, classifyStage, PRODUCTS };
