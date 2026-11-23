# Arquitectura Público + Privado (Piston Bot)

## Objetivo

Separar la distribución pública del motor comercial privado para proteger el core, permitir licenciamiento y mantener una instalación clara para clientes autorizados.

## Repositorios

### 1) `piston-bot` (público)
**Propósito:** presencia pública, documentación, marketing, onboarding e instaladores públicos.

Contiene:
- README, guías, arquitectura, FAQ.
- Material de campaña (FB/LinkedIn).
- Assets públicos/logos.
- Instrucciones de instalación y actualización.
- Referencias al canal de licenciamiento/activación.

No debe contener:
- Secretos, `.env`, claves, tokens.
- Lógica comercial sensible completa del motor.
- Datos de clientes, logs, sesiones WhatsApp.

### 2) `piston-bot-core` (privado)
**Propósito:** motor y recursos comerciales protegidos, solo acceso autorizado/pago.

Contiene:
- Motor/core del bot y módulos premium.
- Reglas comerciales avanzadas, plantillas internas, flujos propietarios.
- Sistema de licenciamiento/activación (cuando se implemente).
- Integraciones privadas, scripts de despliegue internos.
- Auditoría y configuración de servicio.

## Modelo de acceso

1. Usuario ve repo público / landing / campaña.
2. Solicita demo o compra.
3. Piston Quarks valida pago/identidad.
4. Se genera autorización/licencia (pendiente implementación completa).
5. Instalador/cliente autorizado descarga o habilita componentes privados.
6. Panel opera localmente; soporte bajo autorización.

## Instalador unificado (visión)

El instalador público puede ser la “cáscara” única, con estos modos:

- **Modo Demo/Limitado**: UI pública, sin motor premium.
- **Modo Autorizado**: valida licencia/clave/huella y habilita core privado.
- **Modo Actualización**: verifica versión y descarga componentes permitidos.

## Pendiente crítico (antes de vender como “listo”)

- Generación simultánea EXE + clave/licencia.
- Registro: serial, clave, huella de dispositivo, correo, nombre, pago, estado.
- Panel de verificación/autorización.
- Descarga controlada desde GitHub privado tras verificación.
- Firma Authenticode + hash SHA256 publicado.
- EULA/privacidad/términos de licencia.

## Regla de seguridad

> Ningún componente privado debe descargarse ni activarse sin verificación válida. Ningún secreto debe vivir en repos públicos.