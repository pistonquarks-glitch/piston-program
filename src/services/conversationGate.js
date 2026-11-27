'use strict';
/**
 * conversationGate.js — Compuerta de conversación de Pistón Bot.
 *
 * Objetivo: que el bot SOLO responda cuando corresponde.
 *  - Número de soporte: siempre responde (uso interno / pruebas).
 *  - Toma de control humano: si el dueño escribe a mano, el bot calla 6 h.
 *  - Respuesta citada al bot: responde (el cliente lo está llamando).
 *  - Trigger fuerte (producto, precio, demo, pago, comprobante…): responde.
 *  - Trigger débil (hola, info, precio suelto…): solo en chat nuevo o
 *    mientras el bot tenga la conversación activa (< 6 h).
 *  - Chat viejo sin trigger: silencio.
 *  - Dedupe: mismo texto del mismo chat en < 8 s se ignora.
 *
 * Estado persistido en src/chat_state.json (por chat).
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'chat_state.json');

const HUMAN_TAKEOVER_MS = 6 * 60 * 60 * 1000;   // 6 h de silencio tras respuesta humana
const BOT_CONTINUATION_MS = 6 * 60 * 60 * 1000; // 6 h de conversación activa del bot
const DEDUPE_MS = 8 * 1000;                     // mismo texto repetido
const BOT_ECHO_MS = 2 * 60 * 1000;              // eco de un mensaje enviado por el bot
const PRUNE_MS = 7 * 24 * 60 * 60 * 1000;       // limpiar chats sin actividad
const MAX_CHATS = 3000;

/* ------------------------------------------------------------------ */
/*  Disparadores                                                       */
/* ------------------------------------------------------------------ */

// Intención comercial explícita: el cliente está llamando al bot / al producto.
const STRONG_TRIGGERS = [
  // Producto/marca Pistón (invocación explícita)
  'piston bot', 'pistón bot', 'pistonbot', 'piston auto', 'pistón auto',
  'piston quarks', 'pistón quarks', 'piston pos', 'pistón pos',
  'pos inventary', 'piston pos inventary', 'pistón pos inventary',
  'pos universal', 'piston commerce', 'pistón commerce',
  'sistemca', 'sistema came',
  'piston music', 'pistón music', 'rompe idiomas', 'rompeidiomas',
  'piston studio', 'pistón studio', 'piston visual', 'pistón visual',
  'guionizador', 'piston guionizador', 'pistón guionizador',
  'opencode', 'cerebro ia', 'piston driver', 'pistón driver',
  // Gemas (invocación explícita)
  'gema 1', 'gema 2', 'gema 3', 'gema 4', 'gema 5', 'gema 6', 'gema 7', 'gema 8', 'gema 9',
  'las 9 gemas', 'nueve gemas', 'gema pos inventory', 'gema presencia digital',
  'gema viralizacion', 'gema viralización', 'gema ingenieria conversacional', 'gema ingeniería conversacional',
  'gema ia creativa', 'gema guionizacion', 'gema guionización', 'gema digitalizacion', 'gema digitalización',
  'gema automatizacion', 'gema automatización',
  // Intención comercial inequívoca sobre nuestros productos
  'quiero piston', 'quiero pistón', 'quiero el bot', 'quiero un bot de piston', 'quiero un bot de pistón',
  'quiero contratar piston', 'quiero contratar pistón', 'quiero comprar piston', 'quiero comprar pistón',
  'precio de piston', 'precio del piston', 'precio de pistón', 'precio del pistón',
  'planes de piston', 'planes de pistón', 'plan de piston', 'plan de pistón',
  'cuanto cuesta piston', 'cuánto cuesta piston', 'cuanto cuesta pistón', 'cuánto cuesta pistón',
  'cuanto cuesta el bot de piston', 'cuánto cuesta el bot de pistón',
  'demo de piston', 'demo de pistón', 'demo del bot', 'quiero una demo de piston', 'quiero una demo de pistón',
  'chatbot de huanuco', 'chatbot de huánuco', 'chatbot desde huanuco', 'chatbot desde huánuco',
  'bot entrenado con mi voz', 'automatizacion de whatsapp', 'automatización de whatsapp',
  'bot para mi negocio en whatsapp', 'chatbot para mi negocio',
  // Páginas/servicios específicos (payloads y CTAs conocidos)
  'demo piston quarks en mi hotel', 'demo sistemca', 'cotizacion del sistema came', 'cotización del sistema came',
  'cotizacion came', 'cotización came', 'demostracion 30 min del sistema came', 'demostración 30 min del sistema came',
  'calculadora de piston', 'calculadora de pistón'
];

// Saludo / interés genérico: solo abre conversación, no confirma intención.
const WEAK_TRIGGERS = [
  'hola', 'hello', 'hey', 'buenas', 'buenos dias', 'buenos días',
  'buenas tardes', 'buenas noches', 'saludos',
  'precio', 'precios', 'informacion', 'información', 'info',
  'consulta', 'consultas', 'ayuda', 'servicio', 'servicios',
  'catalogo', 'catálogo', 'plan', 'planes',
  'cuanto', 'cuánto', 'cuesta', 'costo', 'costos', 'tarifa', 'tarifas',
  'soporte', 'asesoria', 'asesoría', 'asesor', 'disponible', 'horario'
];

// Acciones del manual que NO prueban intención comercial por sí solas:
// saludar o decir "no sé" no autorizan al bot a meterse.
const NEUTRAL_ACTIONS = new Set(['saludo', 'disclaimer_medio', 'defaultResponse']);

const GREETING_WORDS = new Set([
  'hola', 'hello', 'hey', 'buenas', 'buenos', 'buen', 'dias', 'días',
  'tardes', 'noches', 'saludos', 'que', 'qué', 'tal', 'como', 'cómo', 'estas', 'estás'
]);

/* ------------------------------------------------------------------ */
/*  Estado                                                             */
/* ------------------------------------------------------------------ */

let chats = {};
let botSends = []; // { jid, text, at } — para distinguir eco del bot vs. humano
let saveTimer = null;
let loaded = false;
let persistenceEnabled = true;

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const now = Date.now();
      for (const [jid, st] of Object.entries(parsed)) {
        if (!st || typeof st !== 'object') continue;
        if (now - (st.lastSeenAt || st.lastHumanAt || st.lastBotAt || 0) > PRUNE_MS) continue;
        chats[jid] = {
          mode: st.mode === 'human' ? 'human' : 'bot',
          lastHumanAt: Number(st.lastHumanAt) || 0,
          lastBotAt: Number(st.lastBotAt) || 0,
          lastUserAt: Number(st.lastUserAt) || 0,
          lastSeenAt: Number(st.lastSeenAt) || 0,
          lastText: typeof st.lastText === 'string' ? st.lastText : '',
          lastTextAt: Number(st.lastTextAt) || 0,
          lastBotText: typeof st.lastBotText === 'string' ? st.lastBotText : '',
          lastBotTextAt: Number(st.lastBotTextAt) || 0,
          turns: Number(st.turns) || 0,
          greeted: !!st.greeted
        };
      }
    }
  } catch (e) {
    // Estado corrupto: se ignora y se empieza limpio (nunca tumbar el bridge).
    chats = {};
  }
}

function persistNow() {
  if (!persistenceEnabled) return;
  try {
    const tmp = STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(chats, null, 2), 'utf8');
    try {
      fs.renameSync(tmp, STATE_FILE);
    } catch (e) {
      fs.writeFileSync(STATE_FILE, JSON.stringify(chats, null, 2), 'utf8');
      try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
    }
  } catch (e) {
    // Si no se puede escribir, el bot sigue funcionando en memoria.
  }
}

function scheduleSave() {
  if (!persistenceEnabled) return;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistNow();
  }, 250);
  if (saveTimer.unref) saveTimer.unref();
}

function prune() {
  const now = Date.now();
  const entries = Object.entries(chats);
  if (entries.length <= MAX_CHATS) return;
  entries
    .sort((a, b) => (a[1].lastSeenAt || 0) - (b[1].lastSeenAt || 0))
    .slice(0, entries.length - MAX_CHATS)
    .forEach(([jid]) => { delete chats[jid]; });
  scheduleSave();
}

function getChat(jid) {
  load();
  const key = String(jid || '');
  if (!key) return null;
  const defaults = {
    mode: 'bot',
    lastHumanAt: 0,
    lastBotAt: 0,
    lastUserAt: 0,
    lastSeenAt: 0,
    lastText: '',
    lastTextAt: 0,
    lastBotText: '',
    lastBotTextAt: 0,
    turns: 0,
    greeted: false,
    name: '',
    pushname: '',
    number: '',
    isBusiness: false,
    aiSuspected: false,
    aiSuspectedReason: '',
    aiSuspectedAt: 0,
    lastReplyAuthor: 'none',
    lastReplyAt: 0,
    continuityUntil: 0,
    continuityReason: ''
  };
  if (!chats[key]) {
    chats[key] = { ...defaults };
    prune();
  } else {
    for (const [k, v] of Object.entries(defaults)) {
      if (chats[key][k] === undefined) chats[key][k] = v;
    }
  }
  return chats[key];
}

/* ------------------------------------------------------------------ */
/*  Utilidades                                                         */
/* ------------------------------------------------------------------ */

function isBareGreeting(text) {
  const cleaned = norm(text).replace(/[¡!.,;:¿?()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return false;
  const words = cleaned.split(' ').filter(Boolean);
  if (!words.length || words.length > 6) return false;
  return words.every(w => GREETING_WORDS.has(w));
}

function hasAny(text, list) {
  return list.some(k => text.includes(k));
}

function isBotEcho(jid, text) {
  const key = String(jid || '');
  const t = norm(text);
  if (!key || !t) return false;
  const now = Date.now();
  botSends = botSends.filter(s => now - s.at < BOT_ECHO_MS);
  return botSends.some(s => s.jid === key && s.text === t);
}

function noteBotSend(jid, text) {
  const key = String(jid || '');
  const t = norm(text);
  if (!key || !t) return;
  const now = Date.now();
  botSends = botSends.filter(s => now - s.at < BOT_ECHO_MS);
  botSends.push({ jid: key, text: t, at: now });
  if (botSends.length > 200) botSends = botSends.slice(-200);
}

function markHumanTakeover(jid) {
  const st = getChat(jid);
  if (!st) return null;
  const now = Date.now();
  st.mode = 'human';
  st.lastHumanAt = now;
  st.lastSeenAt = now;
  st.lastReplyAuthor = 'humano';
  st.lastReplyAt = now;
  st.continuityUntil = 0;
  st.continuityReason = 'human_takeover';
  scheduleSave();
  return st;
}

function markBotReply(jid, text) {
  const st = getChat(jid);
  if (!st) return null;
  const now = Date.now();
  st.mode = 'bot';
  st.lastBotAt = now;
  st.lastSeenAt = now;
  st.lastReplyAuthor = 'bot';
  st.lastReplyAt = now;
  st.turns = (st.turns || 0) + 1;
  if (text) {
    st.lastBotText = norm(text);
    st.lastBotTextAt = now;
    noteBotSend(jid, text);
  }
  scheduleSave();
  return st;
}

// El eco del propio bot puede llegar tarde (webhook lento). Si el texto coincide
// con la última respuesta del bot en ese chat, NO es una persona: no silenciar.
function isRecentBotText(jid, text, windowMs = 10 * 60 * 1000) {
  const st = getChat(jid);
  if (!st) return false;
  const t = norm(text);
  if (!t || !st.lastBotText) return false;
  return st.lastBotText === t && Date.now() - (st.lastBotTextAt || 0) < windowMs;
}

function updateContact(jid, info = {}) {
  const st = getChat(jid);
  if (!st) return null;
  let changed = false;
  const set = (k, v) => {
    if (v === undefined || v === null) return;
    const val = typeof v === 'string' ? v.trim() : v;
    if (val === '' && st[k]) return;
    if (st[k] !== val) { st[k] = val; changed = true; }
  };
  set('name', info.name);
  set('pushname', info.pushname);
  set('number', info.number);
  if (typeof info.isBusiness === 'boolean') { if (st.isBusiness !== info.isBusiness) { st.isBusiness = info.isBusiness; changed = true; } }
  if (info.aiSuspected === true) {
    if (!st.aiSuspected) { st.aiSuspected = true; changed = true; }
    if (info.aiSuspectedReason) { st.aiSuspectedReason = String(info.aiSuspectedReason).slice(0, 200); }
    st.aiSuspectedAt = st.aiSuspectedAt || Date.now();
  }
  if (changed) scheduleSave();
  return st;
}

/* ------------------------------------------------------------------ */
/*  Decisión                                                           */
/* ------------------------------------------------------------------ */

/**
 * @param {object} input
 * @param {string} input.jid          Chat (remoteJid)
 * @param {string} input.text         Texto entrante
 * @param {boolean} [input.isSupport] Número de soporte / interno
 * @param {boolean} [input.quotedToBot] El mensaje cita/responda a un mensaje del bot
 * @param {boolean} [input.isPrivate] Solo conversaciones privadas (no grupos/estados/canales)
 * @param {boolean} [input.isAuthorized] Remitente autorizado (dueño o cliente con plan)
 * @param {boolean} [input.forceStrong] Payload explícito (calculadora, página)
 * @param {string} [input.actionId] Acción comercial detectada en el manual
 * @param {boolean} [input.actionOpensNewChat] La acción detectada puede abrir un chat nuevo/frío
 * @returns {{respond:boolean, reason:string, mode?:string, strong?:boolean, weak?:boolean}}
 */
function evaluate(input) {
  load();
  const jid = String((input && input.jid) || '');
  const text = norm(input && input.text);
  const isSupport = !!(input && input.isSupport);
  const quotedToBot = !!(input && input.quotedToBot);
  const forceStrong = !!(input && input.forceStrong);
  const isPrivate = input && input.isPrivate !== false;
  const isAuthorized = !!(input && input.isAuthorized);
  const actionId = String((input && input.actionId) || '');
  const now = Date.now();

  if (isSupport) {
    return { respond: true, reason: 'support_number', mode: 'bot' };
  }
  if (!isPrivate) {
    return { respond: false, reason: 'private_only', strong: false, weak: false };
  }
  if (!jid) {
    return { respond: false, reason: 'no_jid' };
  }
  if (!text) {
    return { respond: false, reason: 'empty' };
  }

  const st = getChat(jid);

  // Comando de salida: desactiva la continuidad y fuerza silencio hasta nuevo gatillo.
  if (/^(stop|pausa|detente|basta|gracias por ahora)\b/i.test(text)) {
    st.lastBotAt = 0;
    st.turns = 0;
    st.greeted = false;
    scheduleSave();
    return { respond: false, reason: 'stop_command', strong: false, weak: false };
  }

  // Dedupe: el mismo texto en menos de 8 s (reintentos de Open-WA, doble envío).
  if (st.lastText === text && now - (st.lastTextAt || 0) < DEDUPE_MS) {
    return { respond: false, reason: 'duplicate' };
  }

  // Intención fuerte por texto (producto/servicio explícito) o payload forzado.
  const textStrong = forceStrong || hasAny(text, STRONG_TRIGGERS);
  // Acción que puede abrir/retomar conversación por sí sola (marcada en bot_actions).
  // Pedir humano también merece respuesta en chat nuevo, pero NO rompe un takeover humano.
  const actionOpensNewChat = !!(input && input.actionOpensNewChat);
  const actionStrong = !!actionId && (actionOpensNewChat || actionId === 'escalamiento') && !NEUTRAL_ACTIONS.has(actionId);
  // "Comercial" = llamada explícita al producto/servicio (puede romper takeover humano).
  const commercialStrong = textStrong || (actionStrong && actionId !== 'escalamiento');
  const strong = commercialStrong || actionStrong;
  const weak = hasAny(text, WEAK_TRIGGERS);
  const greeting = isBareGreeting(text);

  // Registrar la entrada (también cuando se calla, para el dedupe).
  st.lastText = text;
  st.lastTextAt = now;
  st.lastUserAt = now;
  st.lastSeenAt = now;

  // 1) Toma de control humano vigente.
  if (st.mode === 'human' && now - (st.lastHumanAt || 0) < HUMAN_TAKEOVER_MS) {
    if (quotedToBot) {
      st.mode = 'bot';
      scheduleSave();
      return { respond: true, reason: 'quoted_to_bot_after_human', mode: 'bot', strong, weak };
    }
    if (commercialStrong) {
      // El cliente llamó explícitamente al producto: el bot puede retomar.
      st.mode = 'bot';
      scheduleSave();
      return { respond: true, reason: 'strong_trigger_after_human', mode: 'bot', strong, weak };
    }
    scheduleSave();
    return { respond: false, reason: 'human_takeover', strong, weak };
  }

  // Toma de control vencida: vuelve a modo bot.
  if (st.mode === 'human') st.mode = 'bot';

  // 2) Chat nuevo (sin historial del bot).
  // Solo responde si hay invocación clara: producto/servicio explícito,
  // acción marcada para abrir chat, cita al bot o saludo de apertura (filtro).
  // Palabras genéricas sueltas NO abren conversación (evita meterse donde no lo llaman).
  if (!st.lastBotAt && !st.turns) {
    if (strong) {
      scheduleSave();
      return { respond: true, reason: 'strong_trigger_new_chat', mode: 'bot', strong, weak };
    }
    if (quotedToBot) {
      scheduleSave();
      return { respond: true, reason: 'quoted_to_bot_new_chat', mode: 'bot', strong, weak };
    }
    scheduleSave();
    if (greeting) {
      st.greeted = true;
      scheduleSave();
      return { respond: true, reason: 'greeting_new_chat', mode: 'bot', strong, weak };
    }
    return { respond: false, reason: 'new_chat_no_trigger', strong, weak };
  }

  // 3) Continuación de una conversación que el bot tiene abierta (< 6 h).
  if (now - (st.lastBotAt || 0) < BOT_CONTINUATION_MS) {
    scheduleSave();
    return {
      respond: true,
      reason: quotedToBot ? 'quoted_to_bot' : 'bot_continuation',
      mode: 'bot',
      strong,
      weak
    };
  }

  // 4) Chat con historial pero conversación fría: solo si lo llaman de verdad.
  if (quotedToBot) {
    scheduleSave();
    return { respond: true, reason: 'quoted_to_bot', mode: 'bot', strong, weak };
  }
  if (strong) {
    scheduleSave();
    return { respond: true, reason: 'strong_trigger', mode: 'bot', strong, weak };
  }
  if (greeting && !st.greeted) {
    st.greeted = true;
    scheduleSave();
    return { respond: true, reason: 'greeting_reopen', mode: 'bot', strong, weak };
  }
  scheduleSave();
  return { respond: false, reason: 'no_trigger', strong, weak };
}

function resetChat(jid) {
  load();
  const key = String(jid || '');
  if (key && chats[key]) {
    delete chats[key];
    scheduleSave();
    return true;
  }
  return false;
}

function snapshot() {
  load();
  return JSON.parse(JSON.stringify(chats));
}

module.exports = {
  evaluate,
  markHumanTakeover,
  markBotReply,
  noteBotSend,
  isBotEcho,
  isRecentBotText,
  updateContact,
  resetChat,
  snapshot,
  // exportados para pruebas / panel
  STRONG_TRIGGERS,
  WEAK_TRIGGERS,
  HUMAN_TAKEOVER_MS,
  BOT_CONTINUATION_MS,
  DEDUPE_MS,
  STATE_FILE
};

/* ------------------------------------------------------------------ */
/*  Autoprueba:  node src/services/conversationGate.js                 */
/* ------------------------------------------------------------------ */
if (require.main === module) {
  const assert = require('assert');
  loaded = true;              // no leer el estado real
  persistenceEnabled = false; // no escribir chat_state.json durante la prueba
  let passed = 0;
  const ok = (cond, msg) => { assert.equal(cond, true, msg); passed++; };

  const base = { lastBotAt: 0, turns: 0 };
  const mk = (over) => Object.assign({ mode: 'bot', lastHumanAt: 0, lastBotAt: 0, lastUserAt: 0, lastSeenAt: 0, lastText: '', lastTextAt: 0, lastBotText: '', lastBotTextAt: 0, turns: 0, greeted: false }, base, over || {});

  // 1) Chat nuevo: saludo abre con filtro
  chats = {};
  chats['nuevo@c.us'] = mk();
  let r = evaluate({ jid: 'nuevo@c.us', text: 'hola' });
  ok(r.respond === true && r.reason === 'greeting_new_chat', 'saludo en chat nuevo debe abrir con filtro');

  // 2) Chat nuevo: texto sin intención no responde
  chats['nuevo2@c.us'] = mk();
  r = evaluate({ jid: 'nuevo2@c.us', text: 'jajaja' });
  ok(r.respond === false, 'texto sin intención no debe responder');

  // 3) Chat nuevo: invocación explícita de producto responde
  chats['nuevo3@c.us'] = mk();
  r = evaluate({ jid: 'nuevo3@c.us', text: 'quiero un bot de pistón para mi restaurante' });
  ok(r.respond === true, 'invocación explícita de Pistón debe responder');

  // 4) Falso positivo: "pago formal" genérico NO debe abrir chat nuevo
  chats['fp1@c.us'] = mk();
  r = evaluate({ jid: 'fp1@c.us', text: 'necesito que me hagas un pago formal por la Ley N 30947' });
  ok(r.respond === false, 'texto con "pago" genérico no debe abrir chat nuevo');

  // 5) Falso positivo: "comprarle galletas" NO debe abrir chat nuevo
  chats['fp2@c.us'] = mk();
  r = evaluate({ jid: 'fp2@c.us', text: 'Solo envía algo para comprarle, ya le compré galletas' });
  ok(r.respond === false, 'texto casual con "comprar/comprarle" no debe abrir chat nuevo');

  // 6) Falso positivo: "quiero información" genérico NO debe abrir chat nuevo
  chats['fp3@c.us'] = mk();
  r = evaluate({ jid: 'fp3@c.us', text: 'quiero información' });
  ok(r.respond === false, 'interés genérico sin producto no debe abrir chat nuevo');

  // 7) Toma de control humano: calla 6 h
  chats['cliente@c.us'] = mk({ lastBotAt: Date.now() - 1000, turns: 2 });
  markHumanTakeover('cliente@c.us');
  r = evaluate({ jid: 'cliente@c.us', text: 'hola, sigo esperando' });
  ok(r.respond === false, 'con takeover humano el bot debe callar');

  // 8) Invocación comercial explícita rompe el silencio humano
  r = evaluate({ jid: 'cliente@c.us', text: 'cuánto cuesta pistón bot' });
  ok(r.respond === true, 'invocación explícita de Pistón rompe el silencio humano');

  // 9) Cita al bot responde aunque haya takeover
  chats['cita@c.us'] = mk({ mode: 'human', lastHumanAt: Date.now() - 1000, lastBotAt: Date.now() - 2000, turns: 1 });
  r = evaluate({ jid: 'cita@c.us', text: 'si', quotedToBot: true });
  ok(r.respond === true, 'cita al bot debe responder');

  // 10) Chat frío sin trigger calla
  chats['frio@c.us'] = mk({ lastBotAt: Date.now() - 7 * 60 * 60 * 1000, turns: 3, greeted: true });
  r = evaluate({ jid: 'frio@c.us', text: 'ok' });
  ok(r.respond === false, 'chat frío sin trigger debe callar');

  // 11) Dedupe
  chats['dup@c.us'] = mk({ lastBotAt: Date.now() - 1000, turns: 1 });
  r = evaluate({ jid: 'dup@c.us', text: 'si' });
  ok(r.respond === true, 'primer mensaje debe pasar');
  r = evaluate({ jid: 'dup@c.us', text: 'si' });
  ok(r.respond === false, 'dedupe debe ignorar el mismo texto en 8 s');

  // 12) Eco del bot no es takeover humano
  noteBotSend('eco@c.us', 'Hola, soy Pistón Bot');
  ok(isBotEcho('eco@c.us', 'Hola, soy Pistón Bot') === true, 'eco inmediato debe reconocerse');
  ok(isBotEcho('eco@c.us', 'otra cosa') === false, 'texto distinto no es eco');

  // 13) Eco tardío reconocido
  chats['eco2@c.us'] = mk();
  markBotReply('eco2@c.us', 'Hola, soy Pistón Bot');
  ok(isRecentBotText('eco2@c.us', 'hola,  soy pistón bot') === true, 'eco tardío debe reconocerse');
  ok(isRecentBotText('eco2@c.us', 'hola, quiero precios') === false, 'texto distinto no es eco tardío');

  // 14) Soporte siempre responde
  r = evaluate({ jid: 'x@c.us', text: 'cualquier cosa', isSupport: true });
  ok(r.respond === true, 'soporte siempre responde');

  // 15) Acción comercial marcada para abrir chat responde
  chats['accion@c.us'] = mk();
  r = evaluate({ jid: 'accion@c.us', text: 'es caro', actionId: 'piston_bot_objecion_precio', actionOpensNewChat: true });
  ok(r.respond === true, 'acción invocacional marcada debe responder');

  // 16) Acción NO marcada para abrir chat no abre chat nuevo
  chats['accion-no@c.us'] = mk();
  r = evaluate({ jid: 'accion-no@c.us', text: 'ya te hice el pago', actionId: 'pedido_seguimiento', actionOpensNewChat: false });
  ok(r.respond === false, 'acción no invocacional no debe abrir chat nuevo');

  // 17) Acción neutra no autoriza respuesta
  chats['accion2@c.us'] = mk();
  r = evaluate({ jid: 'accion2@c.us', text: 'no se', actionId: 'disclaimer_medio' });
  ok(r.respond === false, 'acción neutra no autoriza respuesta');

  // 18) Pedir humano en chat nuevo responde
  chats['accion3@c.us'] = mk();
  r = evaluate({ jid: 'accion3@c.us', text: 'quiero hablar con una persona', actionId: 'escalamiento', actionOpensNewChat: true });
  ok(r.respond === true, 'pedir humano en chat nuevo debe responderse');

  // 19) Pedir humano no rompe conversación ya atendida
  chats['accion4@c.us'] = mk({ mode: 'human', lastHumanAt: Date.now() - 1000, lastBotAt: Date.now() - 2000, turns: 1 });
  r = evaluate({ jid: 'accion4@c.us', text: 'quiero hablar con una persona', actionId: 'escalamiento', actionOpensNewChat: true });
  ok(r.respond === false, 'pedir humano no debe romper conversación ya atendida');

  // 20) Cita al bot en chat sin estado responde
  chats['cita-nueva@c.us'] = mk();
  r = evaluate({ jid: 'cita-nueva@c.us', text: 'si', quotedToBot: true });
  ok(r.respond === true, 'cita al bot en chat sin estado debe responder');

  // 21) Continuación: bot activo responde seguimiento sin trigger fuerte
  chats['cont@c.us'] = mk({ lastBotAt: Date.now() - 60 * 1000, turns: 2 });
  r = evaluate({ jid: 'cont@c.us', text: 'ya te envié el comprobante', actionId: 'pedido_seguimiento', actionOpensNewChat: false });
  ok(r.respond === true, 'en conversación activa el bot debe seguir atendiendo');

  console.log('✓ conversationGate: ' + passed + '/' + passed + ' pruebas OK');
}

