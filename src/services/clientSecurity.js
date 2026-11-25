// Seguridad por conversación de cliente: detecta intentos de inyección/directivas
// desde WhatsApp y los bloquea sin intervenir en respuestas comerciales normales.
const fs = require('fs');
const path = require('path');

const DEFAULT_REPLY = 'Solo soy una IA de atención, no puedo hacer eso. Tu solicitud quedó registrada para revisión.';

const DANGEROUS = [
  { id: 'directive_injection', re: /(?:^|\n)\s*(DIRECTIVA|INSTRUCCION|INSTRUCCIÓN|REGLA|GUIA|GUÍA|APRENDE|SYSTEM|PROMPT)\s*:/i, why: 'intento de fijar directivas/system prompt desde un chat de cliente' },
  { id: 'ignore_instructions', re: /(ignora|olvida|descarta|anula)\s+(las|los|tus|todas?\s+las?)\s+(instrucciones|reglas|directivas|prompts?|limitaciones)/i, why: 'intento de ignorar instrucciones de seguridad' },
  { id: 'reveal_prompt', re: /(muestra|revela|imprime|copia|pasa|envía|envia)\s+(tu\s+)?(prompt|system prompt|instrucciones|directivas secretas|archivos? de configuraci[oó]n)/i, why: 'intento de revelar prompt/configuración interna' },
  { id: 'credentials', re: /(api[ _-]?key|token|secret|password|contraseña|\.env|credenciales?|clave api)/i, why: 'intento de obtener credenciales' },
  { id: 'shell_command', re: /(powershell|cmd\.exe|\bcmd\b|bash|sh\s+-c|terminal|consola|ejecuta(?:r)?\s+(el\s+)?comando|command line|shell|script)/i, why: 'intento de ejecutar comandos del sistema' },
  { id: 'destructive', re: /(borrar|eliminar|remove|rm\s+-rf|delete|drop\s+table|truncate|format\s+c:|reiniciar|apagar|shutdown|matar proceso|kill\s+-9)/i, why: 'intento de ejecutar acción destructiva' },
  { id: 'network_exfil', re: /(curl|wget|nc\s+-|reverse shell|http:\/\/[^ ]+\/api|webhook|exfiltrar|subir\s+a\s+drive|enviar\s+a\s+otro\s+número)/i, why: 'intento de exfiltración o conexión externa' },
  { id: 'jailbreak', re: /(modo dios|developer mode|jailbreak|déjate de ser|actúa como|actua como|simula ser|suplanta|sin restricciones|sin límites| ignorar seguridad)/i, why: 'intento de jailbreak/suplantación' },
  { id: 'identity_escalation', re: /(eres admin|tienes acceso total|modo administrador|permission\s+granted|aprobado por sistema|soy el dueño|soy rony|soy superadmin)/i, why: 'intento de escalada de identidad' }
];

class ClientSecurity {
  constructor(dataDir, boardRoot) {
    this.dataDir = dataDir;
    this.boardRoot = boardRoot || '';
    this.alertsFile = path.join(dataDir, 'client_security_alerts.jsonl');
    this.boardFile = this.boardRoot ? path.join(this.boardRoot, 'PIZARRA_ALERTAS.md') : path.join(dataDir, 'PIZARRA_ALERTAS.md');
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
    try { if (this.boardRoot) fs.mkdirSync(this.boardRoot, { recursive: true }); } catch (e) {}
  }

  inspect(text, { fromSupport = false } = {}) {
    const t = String(text || '');
    if (!t.trim()) return { blocked: false, reasons: [] };
    if (fromSupport) return { blocked: false, reasons: [], note: 'remitente autorizado' };
    const hits = [];
    for (const rule of DANGEROUS) {
      if (rule.re.test(t)) hits.push({ id: rule.id, why: rule.why });
    }
    return { blocked: hits.length > 0, reasons: hits, reply: hits.length ? DEFAULT_REPLY : null };
  }

  alert({ type, jid, client, reason, text, sessionId }) {
    const rec = {
      ts: new Date().toISOString(),
      type: type || 'suspicious_activity',
      jid: String(jid || ''),
      client: String(client || ''),
      sessionId: String(sessionId || ''),
      reason: String(reason || ''),
      text: String(text || '').slice(0, 600)
    };
    try { fs.appendFileSync(this.alertsFile, JSON.stringify(rec) + '\n', 'utf8'); } catch (e) {}
    try {
      const line = `## ${rec.ts} · ${rec.type}\n\n- **Quién:** ${rec.client || rec.jid || 'desconocido'}\n- **Chat:** ${rec.jid || '—'}\n- **Sesión:** ${rec.sessionId || '—'}\n- **Motivo:** ${rec.reason}\n- **Texto:** \`${rec.text.replace(/`/g, "'")}\`\n\n---\n`;
      const prev = fs.existsSync(this.boardFile) ? fs.readFileSync(this.boardFile, 'utf8') : '# Pizarra de alertas — Piston Bot\n\nAgentes: registren aquí avisos, intenciones bloqueadas y consumo agotado.\n\n';
      fs.writeFileSync(this.boardFile, prev + line, 'utf8');
    } catch (e) {}
    return rec;
  }

  listAlerts(limit = 100) {
    try {
      return fs.readFileSync(this.alertsFile, 'utf8').split('\n').filter(Boolean).slice(-limit).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean).reverse();
    } catch (e) { return []; }
  }
}

module.exports = { ClientSecurity, DEFAULT_REPLY, DANGEROUS };
