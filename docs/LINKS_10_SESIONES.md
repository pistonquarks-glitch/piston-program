# Piston Bot - 10 enlaces de configuración WhatsApp

Cada enlace está unido a un puerto propio del servidor. Tras el pago confirmado, el bot entrega el enlace correspondiente.

| # | Puerto | Enlace público | Panel local |
|---:|---:|---|---|
| 1 | 2020 | https://pistonquarks.store/public/setup/piston-bot-01 | http://127.0.0.1:2020/admin |
| 2 | 2021 | https://pistonquarks.store/public/setup/piston-bot-02 | http://127.0.0.1:2021/admin |
| 3 | 2022 | https://pistonquarks.store/public/setup/piston-bot-03 | http://127.0.0.1:2022/admin |
| 4 | 2023 | https://pistonquarks.store/public/setup/piston-bot-04 | http://127.0.0.1:2023/admin |
| 5 | 2024 | https://pistonquarks.store/public/setup/piston-bot-05 | http://127.0.0.1:2024/admin |
| 6 | 2025 | https://pistonquarks.store/public/setup/piston-bot-06 | http://127.0.0.1:2025/admin |
| 7 | 2026 | https://pistonquarks.store/public/setup/piston-bot-07 | http://127.0.0.1:2026/admin |
| 8 | 2027 | https://pistonquarks.store/public/setup/piston-bot-08 | http://127.0.0.1:2027/admin |
| 9 | 2028 | https://pistonquarks.store/public/setup/piston-bot-09 | http://127.0.0.1:2028/admin |
| 10 | 2029 | https://pistonquarks.store/public/setup/piston-bot-10 | http://127.0.0.1:2029/admin |

El QR se actualiza automáticamente cada 20 segundos desde `public/qr-data/:slug`; si Open-WA no responde, se usa la última copia local.


## Enlaces de producto y paneles (2026-11-27)
- Página Piston Bot: https://pistonquarks.store/piston-bot
- Panel del cliente (según plan): https://pistonquarks.store/mi-panel
- Panel de sesiones: https://pistonquarks.store/admin/sessions
- Cada producto abre WhatsApp con mensaje listo: automatizadas S/15, cerebro sin OCR S/50, cerebro con OCR S/120, reportes S/50 y CRM S/70.
- Tras pago aprobado el bot entrega el enlace al panel con el correo y código de acceso, más el QR y la orden de ACTIVAR MI BOT.
- El panel muestra solo las secciones permitidas por el plan: instalación, árboles de lógica, cerebro IA y registro de pagos.
- Temas de color: esmeralda, manzana y WhatsApp (selector en la cabecera del panel).
- Descargas desde el panel: APK, EXE y ZIP en /public/download/:id.


## Paneles por plan (2026-11-27)
- Plan 1: https://pistonquarks.store/panel-plan1 — resumen, 50 árboles de decisión, directivas, conversaciones (sin análisis) e instalación.
- Plan 2: https://pistonquarks.store/panel-plan2 — ventas dirigidas, pagos recibidos, análisis de conversaciones (selección múltiple) e instalación. 1000 mensajes/mes no acumulables.
- Plan 3: https://pistonquarks.store/panel-plan3 — ingresos y egresos con gráficas, integraciones Excel/CSV y Sheets, CRM S/50 y CRM S/70 e instalación.
- Vinculación sin cámara: código de 8 dígitos de Open-WA en /public/pairing-code/:slug; el QR sigue disponible como opción 2.
- La landing pública ya no muestra las 10 sesiones ni los puertos; todo queda preinstalado.


## SEO e indexación (2026-11-27)
- Dominio público canonical: https://pistonquarks.store (sin el subdominio wa.). El Worker piston-bot-proxy sirve las rutas de Piston Bot sin tocar el sitio actual del raíz.
- Sitemap: https://pistonquarks.store/piston-bot-sitemap.xml
- Blog: https://pistonquarks.store/blog/ con 7 guías por buyer: clinicas, comercio, empresas, hoteles, inmobiliarias, restaurantes y vendedores. Cada una con keywords, BlogPosting + FAQPage en JSON-LD y comparativa de los 3 planes.
- IndexNow enviado a api.indexnow.org y Bing (202 Accepted) con 9 URLs.


## Simulador con IA y panel sin laptop (2026-11-27)
- Simulador: https://pistonquarks.store/piston-bot-simulator — 3 pasos: entrenar negocio, probar con IA real (OpenRouter desde el Worker), descargar panel enlazado.
- Las páginas estáticas (piston-bot, blogs, sitemap y simulador) están en Workers Assets: funcionan con la laptop apagada.
- /mi-panel redirige al panel del plan pagado según correo + código; sin credenciales muestra login.
- Configuración aprendida se guarda en KV PISTON_SIM y se consulta en /api/simulator/config.


## Blogs por palabra clave (2026-11-27)
- automatizar-wasa, como-automatizar-wasap-whatsapp, automatizar-whatsapp-business-con-ia, automatizar-whatsapp-gratis, automatizar-whatsapp-con-excel y automatizar-mensajes-de-whatsapp-gratis.
- Cada uno con keyword exacta en title, H1, primeras lineas, FAQPage y BreadcrumbList; enviados a IndexNow (200) junto a las 16 URLs del sitemap.


## Blogs de demanda 2026-11-28 (pilar + cluster + ciudades)
- Pilar: /blog/whatsapp-ia-peru.html — keyword “whatsapp ia” (pico 100 en Trends).
- Cluster: chatbot-para-whatsapp, chatbot-whatsapp-gratis, ia-tipo-claude-para-whatsapp, automatizar-whatsapp-con-ia-negocio.
- Locales: arequipa, puno, ayacucho, huancavelica, cusco, lima — cada una con score de Google Trends, rubros locales y comentario de lugareño claramente marcado como ejemplo hasta sustituirlo por testimonio verificado.
- Cada blog incluye respuesta rápida, capturas necesarias y guion de vídeo de 18 s para reforzar el mensaje.
- 13 URLs enviadas a IndexNow (api.indexnow.org y Bing): 200.
