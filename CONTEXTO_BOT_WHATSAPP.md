# Contexto operativo — Bot WhatsApp Piston Quarks

_Actualizado: 2026-11-16 (memoria de contexto guardada)_

## Infraestructura
- **Bridge:** `http://localhost:2013` — `src/services/bridgeTest.js` (`/webhook`, `/admin`, `/admin/state`)
- **Túnel:** `https://wa.pistonquarks.store/webhook` → `127.0.0.1:2013` (named tunnel `4290f2da-49ad-45fd-b10e-f6c38a208c35`, `C:\Users\USER\.cloudflared\config.yml`)
- **Open-WA:** `http://127.0.0.1:2785` (usar IP, no `localhost`: en Windows puede resolver a IPv6 y colgar el envío), sesión `b1ff3640-6e6e-44bb-a601-42d5c605ceea`, webhook `message.received`
- **Supervisión:** `supervisor_piston.ps1` / `supervisor_piston_launcher.ps1` / tarea `PistonQuarksSupervisor` (launcher exporta `OPENROUTER_API_KEY`)
- **IA:** proveedor `openrouter`, modelo `baidu/ernie-5.5-flash-preview:free` (via HTTPS). (Ollama local no disponible por falta de RAM: ~377 MB free; `inkling-2-small-free` invalido/bloqueado.)

## Comportamiento
- Ignora vacíos y **grupos** (`@g.us`) → `ignored_group`.
- `fromMe`: si coincide con el último texto del bot (eco, hasta 10 min) se ignora sin consecuencias; si no coincide, se registra **toma de control humano** (`human_takeover`) y el bot calla 6 h en ese chat. Excepción: imágenes `fromMe` de un operador autorizado pasan a OCR.
- **Compuerta de conversación** (`src/services/conversationGate.js`): el bot solo responde si lo llamaron.
  - Número de soporte: siempre.
  - Cita/respondió a un mensaje del bot: responde.
  - Trigger fuerte (producto, precio, demo, pago, comprobante, rubro, acción comercial detectada): responde.
  - Trigger débil (hola, info, precio suelto): solo en chat nuevo o con conversación activa del bot (< 6 h).
  - Acciones neutras (`saludo`, `escalamiento`, `disclaimer_medio`) **no** autorizan respuesta.
  - Dedupe 8 s; estado por chat en `src/chat_state.json`.
  - Endpoints: `GET /admin/gate` (estado y contadores), `POST /admin/gate/reset {jid}` (reactivar un chat silenciado).
- **Apoyo +51 928 059 006** (y LIDs conocidos, ej. `173929649971325`): responde a todo con IA + conocimiento completo del ecosistema (en alcance), bypass de filtros. Puede definir directivas de comunicación.
- Externos: gate → payload calculadora Huánuco (diagnóstico/plan) → acción predefinida (trigger más largo) → IA fallback.
- Prompt/keywords preloaded con servicios y páginas web (HOTEL/SISTEMCA, CAME, Huánuco ROI, webs/subtitulado/marketing, store/productos, 9 Gemas). Escalación: Rony +51 930 640 071, apoyo +51 928 059 006.

## Directivas de apoyo (nuevo)
- Persisten en `src/bot_directives.json` e se inyectan al prompt de IA.
- Desde apoyo: `DIRECTIVA|INSTRUCCION|REGLA|GUIA|APRENDE: <texto>` guarda; `listar/ver directivas` lista; `borrar/limpiar directivas` elimina.
- Requiere reinicio del bridge tras cambios de código.

## Estado/config
- `src/bot_state.json` (keywords, prompt, provider/model), `src/bot_actions.json` (playbook), `src/bot_directives.json`, `src/bot_events.log` (auditoría JSONL).
- gsheets-logger → Sheet `1JgygSw4k59YiiCc93ACIO02hCdWjvoGPmv4N5UFZP7M` tab `Logs` (service account `wa-sheets@piston-drive.iam.gserviceaccount.com`).
- Docs consolidadas: `C:\Users\USER\Desktop\HERRAMIENTAS DE IA\Proyectos\auto wasap\` (integración, logger, esta memoria: `MEMORIA_CONTEXTO_BOT.md`).

## OCR de pagos por WhatsApp (2026-11-18, actualizado)
- **Flujo:** imagen recibida → (embedida base64 en webhook o descarga vía Open-WA `GET /api/sessions/{sid}/messages/{chatId}/{messageId}/media`) → OCR local **Tesseract v5.4** (`spa+eng`, `%USERPROFILE%\.tessdata`, bin `C:\Program Files\Tesseract-OCR\tesseract.exe`) → parseo determinista (YAPE/PLIN/transferencia; monto, nro. operación, fecha) → consistencia (score 0-100) → verificación IA (OpenRouter, veredicto VÁLIDO/SOSPECHOSO, 1 reintento).
- **Permisos:** SOLO `paymentOperators` en `bot_state.json` puede verificar (panel `/admin`). Números soporte viejos (928/51928059006) **removidos** — no son de Rony. Actual: **`51930640071`** (Rony, también sesión de Open-WA "rony-pisotn-"). Fail-closed por defecto. Excepción: imágenes fromMe de un operador autorizado pasan al flujo OCR (self-chat de prueba, sin bucle: respuesta de texto queda ignorada).
- **Registro:** `src/payments.jsonl` + panel `localhost:2013/admin` (últimos 20) + **Google Sheets** vía `GSHEETS_SYNC=1` (`src/services/gsheetsLogger.js` — JWT con SA `wa-sheets@piston-drive.iam.gserviceaccount.com`, Sheet `1JgygSw4k59YiiCc93ACIO02hCdWjvoGPmv4N5UFZP7M`, tab `Logs`, columnas ts/from/messageId/status/método/monto/referencia/score/veredicto IA). API ya HABILITADA y SA con permiso Editor verificado (lectura+escritura: fila Logs!A725 probada y limpiada).
- **Landing promo:** `PAGINAS CREADAS DE DESDE PISTON QUARKS\WASAP AUTENTICACION DE PAGOS\index.html` (estático, sin build; styles.css + app.js; CTA wa.me/51930640071; screenshot verificado).
- **Promo MONEYPRINTERV2:** `PROMO_WASAP_AUTO.md` en la raíz de `MONEYPRINTERV2` (guion Short 45s, hilo X, setup Python 3.12 + venv + pip + claves pendientes; NO lanzado).

## Pendientes
1. Validación real: botones web (Huánuco/SISTEMCA/servicios) y +51 928 059 006 (probar `DIRECTIVA:`); revisar `bot_events.log` y Google Sheet `Logs`.
2. Adaptar a otros formatos de payload/calculadora si difieren de `ulti.html`; añadir LIDs de soporte nuevos si faltan.
3. Opcional: habilitar/configurar plugins `chat-flow`, `http-action`, `ai-responder` si se requieren.
4. **Docker Desktop (Open-WA) inestable en esta PC** (WSL2/sin memoria): morir es repentino y tira `openwa-api`; reiniciar con `docker start openwa-api` y relanzar Docker Desktop.
5. **Sesión WhatsApp `b1ff...` ("rony-pisotn-", +51 930 640 071) estaba en `disconnected`**: relanzada con `POST /api/sessions/b1ff3640-6e6e-44bb-a601-42d5c605ceea/start` (11:54, `ready`). Si vuelve a desconectarse: revisar sesión en `http://localhost:2785` o iniciar con ese endpoint.


---

## Pistón Auto · producto, planes y sitio (2026-11-19)

### Planes vigentes (no inventar otros)
- **Básico S/ 250/mes** (founders S/ 125): árbol de respuestas, rutas, precios, derivación. Sin OCR ni reportes. Instalación S/ 350.
- **Pro S/ 490/mes** (founders S/ 245): marca + OCR Yape/PLIN + IA VÁLIDO/SOSPECHOSO + Sheets + panel. Hasta 3 operadores. Instalación incluida.
- **Enterprise S/ 1,200/mes** (founders S/ 600): entrenamiento profundo, cero invención, escalado, reportes con gráficos por WhatsApp, multi-sede, auditoría, export.
- El precio es igual por rubro; el alcance sí cambia (módulo exclusivo por segmento).

### Mapa del sitio (13 páginas)
`PAGINAS CREADAS DE DESDE PISTON QUARKS\WASAP AUTENTICACION DE PAGOS`
- `index.html` — portada y tres niveles.
- `segmentos.html` — árbol de segmentos + cuestionario de 3 preguntas.
- `planes.html` — precios, matriz de capacidades, alcance por segmento.
- `niveles.html` — detalle por nivel + “qué analiza antes de responder”.
- `como-entrenamos.html` — núcleo blando, “¿y qué?”, cero invención, comparación honesta con Fin/Sierra/Agentforce.
- `pagos.html` — compra, monto exacto, captura, clave, garantía.
- `para-restaurantes.html`, `para-hoteles.html`, `para-clinicas.html`, `para-comercio.html`, `para-inmobiliarias.html`, `para-vendedores.html`, `para-empresas.html`.
- Build: `node tools/build-site.mjs` (editar datos en `tools/build-site.mjs`, no en el HTML generado).

### Flujo de compra (reglas)
- Monto exacto con código de dos céntimos único.
- Captura al WhatsApp con `PAGO + plan`.
- Verificación: monto, destinatario Pistón Quarks, fecha del día, score ≥ 90, sin duplicado de operación.
- Cualquier desviación → “pendiente de revisión humana”, nunca activación automática.
- Clave de un solo uso ligada al número; no se guarda en GitHub.

### Reglas de comunicación del bot
- Abrir con pregunta de filtro, no con “¿en qué puedo ayudarte?”.
- Una pregunta por mensaje; construir puentes (“¿a qué se refiere…?”, “¿por ejemplo…?”).
- Traducir toda característica a beneficio (“¿y qué?”).
- Cero invención: si no está en el material, se declara y se escala.
- Cerrar con acción concreta (demo, pago o derivación), nunca “quedo atento”.

### Compuerta y robustez (2026-11-19, verificado)
- `conversationGate.js` con autoprueba: `node src/services/conversationGate.js` → **18/18 OK**.
- Pruebas de webhook simuladas OK: saludo nuevo, charla sin intención (silencio), prospecto con rubro, precio, demo, dedupe, takeover humano, cita al bot, grupo, objeción, comprobante.
- Envío real verificado a `51930640071@c.us` con `messageId` de Open-WA; la IA respondió con apertura de filtro (“¿Ya eres cliente de Pistón Quarks o es tu primera vez?”).
- Corregido: `sendToWhatsApp` no tenía timeout y usaba `localhost`; ahora `127.0.0.1` + timeout 20 s.
- Corregido: log engañoso; ahora distingue `action_sent`/`action_failed` y `ai_sent`/`ai_failed`; `ai_sent` guarda la respuesta (500 chars) para auditar calidad.
- Fallback de IA ya no promete “te paso con un asistente”: da el número de Rony y admite que no puede confirmar.
- Docker Desktop en esta PC está en `C:\Users\USER\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe` (no en `Program Files`). Tras arrancarlo: `docker start openwa-api` y `POST /api/sessions/b1ff.../start`.
- Reinicio del bridge: `powershell -ExecutionPolicy Bypass -File tools\restart_bridge.ps1` (carga la clave desde el launcher, activa Sheets, reinicia y verifica `/admin/state` + `/admin/gate`).

