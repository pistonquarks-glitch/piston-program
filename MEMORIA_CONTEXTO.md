# Memoria de Contexto — Piston Program

_Actualizado: 2026-11-23_

## Estado actual

- **Bridge dev activo**: `http://127.0.0.1:2013` (panel `/admin`). Proceso reiniciado varias veces durante la sesión; verificar con `Get-NetTCPConnection -LocalPort 2013 -State Listen`.
- **Open-WA** esperado en `127.0.0.1:2785`, sesión configurable por `.env` (`OPENWA_API_KEY`, `OPENWA_URL`, `OPENWA_SESSION`).
- **Modelo IA**: configurado por `bot_state.json` / env (`BOT_PROVIDER`, `BOT_MODEL`, `OPENROUTER_API_KEY`). Panel permite editar.

## Lo implementado en esta sesión

### Seguridad / legal
- Informe creado: `docs/security/INFORME_SEGURIDAD_LEGAL_PISTON.md` y `.docx`.
- Vetting de fuentes solicitadas (sin descargar/ejecutar repos externos). 42 bootcamp = solo estudio en VM aislada. No se pudo ver imagen adjunta del chat.
- Hallazgos clave: rotar secretos expuestos previamente, auth en panel admin, firma EXE, prompt injection/acciones sensibles, compliance EULA/privacidad.

### Panel / bridge
- Panel propio sirve desde `src/panel.html` (disco). PWA: `manifest.webmanifest`, `sw.js`, iconos 192/512, rutas `/admin/manifest.webmanifest`, `/admin/sw.js`, `/admin/icon-*.png`.
- **Asistente IA de Ventas WhatsApp** en Conversaciones: modo Plan/Ejecución, confirmación de entendido, capacidades, historial persistente (`src/assistant_history.json`), sugerir respuesta, estudiar chat, aprender estilo chat/masivo, usar borrador como respuesta.
- **Programados**: `/admin/scheduled`, `/admin/scheduled/cancel`, `/admin/scheduled/delete`; historial con estados pending/sent/error/cancelled; tick cada 30s en bridge.
- **Sesiones multi-WhatsApp**: `/admin/sessions`, `/admin/sessions/create`, `/admin/sessions/start`, `/admin/sessions/stop`. Registro `src/sessions_registry.json`. Cada sesión en `src/sessions/<slug>/` con DATA_DIR aislado. Dashboard en panel principal permite crear/preconfigurar/iniciar/abrir.

### Instalador
- MVP portable: `dist/PistonBot-Portable-MVP/` y `.zip`.
- EXE PanelAI: `dist/PistonBot-Instalador-MVP-PanelAI.exe` (último). El anterior `PistonBot-Instalador-MVP.exe` quedó bloqueado por estar abierto.
- Instalador usa PORT 2014 por defecto; crea `.env` desde `.env.example` si no existe; postinstall abre mini panel config `http://127.0.0.1:2015` (`setup-config.js`).
- SHA256 EXE MVP previo: `B77207B0C4D8BB0CE2C758DC628F4C37F66BA1DF81C5A6186AD53014693A0B50` (recalcular para PanelAI si se distribuye).

## Reglas/decisiones operativas

- No hardcodear secretos; usar `.env`. Rotar claves expuestas en historial Git.
- Panel/admin debe quedar en localhost por defecto; agregar auth fuerte antes de exponer.
- Acciones sensibles de IA: requieren confirmación humana/validación dura backend.
- Escaneo QR WhatsApp lo hace Open-WA; el panel gestiona sesión/puerto/config.

## Pendientes importantes

- **EXE/activación/licencia completo**: generación simultánea EXE+clave, registro serial/clave/huella/correo/nombre/pago, verificación, descarga repo privado GitHub tras verificación, revocación. No implementado.
- Firmar EXE (Authenticode) y publicar SHA256.
- Auth en panel admin (token/password, CSRF, rate limit).
- Validación dura backend para acciones sensibles del asistente.
- Limpiar historial Git de secretos y rotar claves.
- Mover repos backup a privado si corresponde.
- Completar multimedia/correcciones pendientes de `pistonquarks.store` según checkpoint anterior.
- Probar sesiones multi-puerto con Open-WA real (Session ID/QR).

## Hardening aplicado (2026-11-23, post-v2)
- `ADMIN_BIND` default `127.0.0.1` (antes 0.0.0.0). Configurable por env.
- `ADMIN_TOKEN`: si se configura, protege APIs `/admin/*` con `X-Admin-Token`; panel pide token y lo guarda en localStorage.
- Auditoría: `audit.log` en DATA_DIR para acciones sensibles (send, state, directives, sesiones, programados, ai-assist).
- `.env.example` actualizado con `ADMIN_BIND` y `ADMIN_TOKEN`.
## Repos y campaña (2026-11-23)
- EXE recompilado con logo: `dist/piston-logo.ico` aplicado en Inno Setup (`SetupIconFile`), generado `dist/PistonBot-Instalador-MVP-PanelAI.exe`.
- Repo público creado: https://github.com/pistonquarks-glitch/piston-bot (README, assets, arquitectura público/privado, campaña FB/LinkedIn).
- Repo privado creado: https://github.com/pistonquarks-glitch/piston-bot-core (scaffold README, .gitignore, estado pendiente de licenciamiento/activación).
- Modelo: público = distribución/docs/marketing; privado = motor/licencias/recursos premium, acceso autorizado/pago. Instalador unificado debe verificar licencia antes de habilitar core privado (pendiente implementar).
- Campaña FB/LinkedIn redactada en `docs/marketing/CAMPANA_FB_LINKEDIN.md`.



## Identidad de marca (2026-11-24)
- Decision: Piston Quarks es marca paraguas; Piston Bot NO tiene logo propio separado. Usar logo cromado (logo cromado para perfil de fb.png) en panel/PWA, EXE (icono), assets de repos y campañas. Producto identificado con wordmark "Piston Bot".
- Aplicado: src/icon-192.png, src/icon-512.png, dist/piston-logo.ico, panel.html brand, manifest.webmanifest, repos piston-bot y piston-bot-core, EXE y ZIP recompilados.


## Venta online + paneles + OCR (2026-11-25)
- Planes: Suscripción S/100/mes (1M tokens, 1000 msgs, 1 número); APP 6 meses S/500 web / S/700 físico (5M tokens/mes, 5000 msgs/mes). Números extra: 10% fijo sobre base, cada uno suma cuota.
- Web: `auto wasap/AUTENFICACION Y PAGOS/comprar.html` con selector, calculadora, formulario y subida de captura. Enlace "Contratar" en index.
- Backend: `src/services/pricing.js`, `salesStore.js`, `proofStore.js`; endpoints `/public/plans|quote|orders|orders/:id/proof|status|account`, `/mi-cuenta`, `/admin/sales/*`.
- Panel admin Piston Bot: sección "Ventas / Planes" con pedidos, evidencia, OCR y mover plan; panel usuario `/mi-cuenta?email=&code=`.
- Contador silencioso: tokens/mensajes/conversaciones por tenant en `piston_sales.json` (callAI y asistente).
- Evidencias: carpeta Drive configurada; googleapis + cuenta de servicio por env; si no hay credenciales se guarda local en `src/sales_proofs/`.
- OCR usa paymentVerifier (Tesseract). Auto-activación desactivada por defecto; activar con `AUTO_APPROVE_PAYMENTS=true`.


## App Android / APK y respuesta móvil (2026-11-25)
- Verificado en iPhone 14 (agent-browser): `comprar.html`, `index.html`, `/admin`, `/mi-cuenta` son 100% responsivos.
- `comprar.html`: logo cromado, selector de planes, calculadora, formulario y subida de captura; campo configurable "URL del servidor" (localStorage `piston_api_url`) porque 127.0.0.1 en celular apunta al teléfono.
- `index.html` landing: logo "P" reemplazado por logo cromado.
- APK: proyecto Capacitor en `mobile/` (appId `com.pistonquarks.bot`), SDK Android detectado, JDK 21 requerido (JAVA_HOME=jdk-21).
- APK final: `dist/PistonBot-Android.apk` (3.84 MB), firmado con keystore propio (CN=Piston Quarks), verificado con apksigner v2. SHA256 1163D7394E55F7AC0E090F140B53D525F834C962397AC6AEE0D438B2E4D2B9A1.
- Seguridad: contraseñas del keystore salieron del código a variables de entorno; llave ignorada por git.
- Para distribuir: el APK necesita una URL pública del bridge (túnel) configurada desde la propia app.


## Aislamiento de conversaciones por cliente (2026-11-25)
- Seguridad: `clientSecurity.js` detecta inyecciones/directivas/comandos desde WhatsApp de clientes (no support), cancela y responde "Solo soy una IA de atención, no puedo hacer eso..."; registra alerta en `client_security_alerts.jsonl` y pizarra global; avisa al número de alerta. Mensajes comerciales normales NO se intervienen.
- Pizarra: `C:\Users\USER\Desktop\HERRAMIENTAS DE IA\Proyectos\piston bot\comnversion de otros usuarios\PIZARRA_ALERTAS.md`.
- Carpetas por cliente: misma ruta, nomenclatura `numero_nombre_plan_rubro`. Contienen `cliente.json`, `DIRECTIVA_SECRETA.md`, `PIZARRA.md`, `opencode.json`, `LANZAR_numero_nombre_plan_rubro.bat`, `EXPORTAR_WORD_...bat`. Se crean al registrar pedido, aprobar y mover plan; se renombran si cambia plan.
- Lanzador: `clientLaunchers.js` usa cuenta 20128 aislada con XDG_CONFIG_HOME/XDG_DATA_HOME propios, gateway con DATA_DIR de la cuenta, `--standalone --session <id>` para conversación separada (no pestañas internas). Repara `LANZAR_OPENCODE_20128.bat` con backup.
- Exportador: `exportar_conversacion.py` usa `opencode session export --sanitize` + python-docx → `CONVERSACION_<session>.docx`. Word solo se genera al ejecutar el .bat.
- Panel: sección "Sesiones cliente" con crear/actualizar, reparar 20128, pizarra y alertas.
- Endpoints: `/admin/session-chat/clients|setup|alerts|board|fix-20128`.


## OCR a demanda por WhatsApp (2026-11-25)
- Clave: "OCR A IMAGEN" (también "OCR IMAGEN", "analiza imagen", "escanea imagen"). Al recibirla se arma modo escaneo por 15 min para ese chat; la imagen siguiente, o la misma con caption, se analiza con Tesseract + parseo Yape/Plin/banco.
- Aplica desde CUALQUIER número, incluido el propio (fromMe), sin exigir operador de pago. El disparador se procesa ANTES del filtro fromMe y de la compuerta.
- Respuesta: banco/app, monto, remitente, destinatario, N° operación, fecha/hora; nota de que no confirma pago.
- Registro separado en `src/ocr_scans.jsonl` (modo `ocr_trigger`), no contamina `payments.jsonl`.
- Parsing corregido: "Pata:" -> destinatario; montos compactos tipo "S/ 189000" -> S/189 cuando no hay punto decimal y cae en rango de planes.
- Archivo: `src/services/ocrTrigger.js`. Prueba end-to-end OK: APP=Yape, AMOUNT=189, SENDER=Juan Perez, RECEIVER=Piston Quarks, REF=998877665.


## Voz y API key Open-WA (2026-11-26)
- Causa raíz de "el bot no responde": OPENWA_API_KEY estaba vacía -> todos los envíos daban 401. El bridge ahora lee la key de `C:\Users\USER\openwa-data\.api-key` automáticamente. Verificado: texto normal genera `action_sent` sin 401.
- Notas de voz: `voiceTranscriber.js` + `transcribe_local.py` (faster-whisper tiny, CPU int8, gratis, español). El webhook detecta `ptt/audio`, descarga media, transcribe y procesa el texto por el flujo normal. OpenRouter solo como respaldo (requiere $0.50, por eso falla).
- Prueba real con voz: "Hola, puedes responderme por favor." -> transcrito y respondido (`action_sent`).
