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