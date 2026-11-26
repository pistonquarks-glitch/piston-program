# Instrucciones OCR en WhatsApp — Piston Bot

## Cómo activar el escaneo desde tu WhatsApp (número 930640071)

El bot escanea capturas de pago con OCR cuando recibe **una de estas claves** en un mensaje de texto:

- `OCR A IMAGEN`
- `OCR IMAGEN`
- `analiza imagen`
- `escanea imagen`
- `leer imagen`
- `CAPTURA DE ...`
- `PAGO DE ...`
- `pague por/de ...`
- `comprobante de pago`

También funciona si la clave viene **en el caption de la imagen**.

## Flujo exacto

1. Escribes al bot: `PAGO DE suscripción mensual` (o `CAPTURA DE ...`, o `OCR A IMAGEN`).
   - Si no dices el motivo, el bot pregunta: **“¿Cuál es el motivo de este pago? Ejemplo: suscripción mensual, APP por web o APP físico.”**
   - El bot registra el plan y responde: **“Procesando tu captura, un momento por favor… Envía la imagen del comprobante.”**
2. Envías la captura (Yape, Plin o transferencia).
3. El bot responde de inmediato: **“Procesando tu captura, un momento por favor…”**
4. El bot escanea internamente y extrae: banco/app, monto, remitente, destinatario, N° de operación, fecha/hora.
5. El bot decide:
   - **Datos conformes y monto = plan** → activa el plan automáticamente y responde **“✅ Pago validado correctamente. Plan activado…”**
   - **Faltan datos / no sabe si es cierto** → avisa al supervisor (928059006) y responde **“Tu pago quedó en revisión…”**
   - **Monto no coincide con el plan** → responde **“❌ Pago no validado. Motivo: …”**

## Funciona desde cualquier número

- Desde tu propio número (teléfono de Rony): sí, aunque sea mensaje propio (`fromMe`).
- Desde cualquier cliente: sí, sin necesidad de ser operador autorizado.
- Desde grupos: no (los grupos siguen ignorados por diseño).

## Notas de voz

Si envías una nota de voz, el bot la transcribe con Whisper local (gratis) y procesa el texto resultante por el mismo flujo. Puedes decir de voz: **“Pago de suscripción mensual”** y luego enviar la captura.

## Registros

- `src/whatsapp_payments.jsonl` — decisiones de pago por WhatsApp.
- `src/ocr_scans.jsonl` — escaneos OCR sueltos.
- `src/payments.jsonl` — pagos verificados por el flujo anterior de operadores.

## Solución de problemas

| Síntoma | Causa | Solución |
|---|---|---|
| El bot no responde nada | API key de Open-WA vacía (401) | El bridge ya lee la key de `C:\Users\USER\openwa-data\.api-key`. Verificar que el archivo exista y que Open-WA esté activo. |
| “No pude descargar tu imagen” | Media omitida en el webhook | Enviar la imagen de nuevo como imagen, no como archivo. |
| “No pude entender tu nota de voz” | Transcripción falló | Repetir la nota o escribir en texto. |
| Pago queda en revisión | Faltan datos del comprobante | El supervisor revisa; si procede, aprueba desde el panel. |

## Verificación rápida (desde la PC)

```powershell
# Enviar disparador de prueba desde el propio número
$body = '{"payload":{"body":"PAGO DE suscripcion mensual","from":"51930640071@c.us","type":"chat","session":"b1ff3640-6e6e-44bb-a601-42d5c605ceea"}}'
Invoke-WebRequest -Uri http://127.0.0.1:2013/webhook -Method POST -ContentType application/json -Body $body
```


## Modo agente (nuevo, sin escribir nada)

El bot ya no espera que escribas una clave: **en cuanto recibe una imagen, la analiza solo**. Si detecta que es comprobante (Yape/Plin/banco + monto + operación), corre el OCR automáticamente y aplica la decisión correspondiente. Si no es comprobante, no hace nada. Las claves (`PAGO DE`, `CAPTURA DE`, `OCR`) siguen funcionando para reforzar el disparador o indicar el motivo del pago.
