# 🎯 Manual de Acciones — Bot WhatsApp Piston Quarks (Gema 4)

## Objetivo
Dar al asistente conversacional una **base de respuestas predefinidas por intento** (action playbook),
para que la IA local (Qwen2.5 vía Ollama) no improvise y responda con precisión cuando el caso es conocido.

## Archivo fuente
`src/bot_actions.json`

```json
{
  "version": 1,
  "description": "Manual de acciones del asistente Piston Quarks (Gema 4 - Ingeniería Conversacional). Define respuestas predefinidas por intento para que la IA local (Qwen2.5 via Ollama) responda con precision y no improvise.",
  "escalation": {
    "humanPhone": "+51 930 640 071",
    "humanName": "Equipo Piston Quarks",
    "context": "Escalar cuando la consulta requiere decision comercial/tecnica profunda, datos que no tiene el asistente, o que el cliente lo solicite explicitamente."
  },
  "defaultResponse": "Gracias por tu consulta. Te estoy pasando con un asistente especializado de Piston Quarks para darte una respuesta detallada. Un momento.",
  "actions": [ ... ]
}
```

## Acciones disponibles

| id | name | type | requiresHuman | triggers (substring) |
|---|---|---|---|---|
| `saludo` | Saludo / Presentación | static | false | hola, hello, hey, buenas, buenos días… |
| `precios_gemas` | Consulta de precios / Catálogo | static | false | precio, precios, catálogo, catalogo, planes, servicios, gema, gemas, costo, costos, tarifa, tarifas, cuota, cuotas |
| `detalle_gema` | Solicitud de detalle de una Gema | static | false | detalle, que incluye, que ofrece, funcionalidad, caracteristicas… |
| `escalamiento` | Escalamiento a humano | static | **true** | humano, persona, operador, agente, comercial, responsable, jefe, lider, contacto, telefono, celular, número, soporte, atencion… |
| `pedido_seguimiento` | Seguimiento de pedido / compra / pago / entrega | static | false | pedido, orden, compra, factura, entrega, envío, pago, transferencia, yape, plin, mercado pago, seguimiento, estado del pedido |
| `disclaimer_medio` | Aclaración / No tengo claro | static | false | no lo tengo claro, no estoy seguro, dudas, duda |

### Reglas de resolución
- El bridge recorre `actions[]` en orden y devuelve la **primera** acción cuyo `triggers[]` esté contenido (case-insensitive) en el mensaje entrante.
- Si no hay match → se delega en la **IA** (`callAI`).
- Si la IA no devuelve texto → se usa `defaultResponse`.

## Flujo del webhook
```
WhatsApp → Open-WA → Bridge /webhook
   → Filtro keywords (bot_state.json)
   → Match en bot_actions.json (findAction)
        ├─ SÍ  → Respuesta predefinida (action.response) → Open-WA → WhatsApp
        └─ NO  → IA (provider: ollama | openrouter) → respuesta → Open-WA → WhatsApp
```

## Cómo agregar / editar una acción
1. Editar `src/bot_actions.json`.
2. Reiniciar el bridge (`supervisor_piston.ps1` lo hace automático, o `node src/services/bridgeTest.js`).
3. Probar por `/webhook` con un evento que dispare el trigger.

## Cómo cambiar de modelo IA
- Local (por defecto): `provider: "ollama"`, `model: "qwen2.5-coder:3b"`.
- Remoto (OpenRouter): `provider: "openrouter"`, `model: e.g. `"anthropic/claude-3.5-sonnet"` o `"openai/gpt-4o"`.
- Requiere variable de entorno `OPENROUTER_API_KEY` en el proceso del bridge.
- Se edita desde `src/bot_state.json` o desde el panel `GET/PUT /admin/state`.

---

## 🤖 Decision: ¿Local (Ollama/Qwen) vs OpenRouter (Claude) vs Open Code?

| Opción | Pros | Contras | Estado |
|---|---|---|---|
| **Local — Ollama / Qwen2.5** | Sin costos, privado, offline | Calidad inferior en razonamiento complejo, contexto corto, requiere reinicios | ✅ Activo (default) |
| **OpenRouter — Claude** | Alta calidad, razonamiento, español | Costo por token, latencia, requiere API key | ✅ Integrado en bridge (provider switch) |
| **Open Code** | Agente de código autónomo | No es modelo de chat para el bot; es harness para desarrollo | — |

**Recomendación práctica**: mantener el **action playbook** como capa determinista (ya implementada) y usar **OpenRouter + Claude** como fallback para conversaciones abiertas complejas. Así el bot no depende solo de la IA local y los casos críticos (precios, saludos, escalamiento) responden con calidad garantizada.
