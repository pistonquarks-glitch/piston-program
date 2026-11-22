# 🚀 ress - Guía de Ejecución y Compilación EXE

Este proyecto fue procesado y optimizado con **APPKIS - AI Studio Zip to EXE & BAT Compiler Studio**.

---

## 📌 ¿Cómo ejecutar esta aplicación en Windows?

### Opción 1: Ejecución Rápida en 1 Clic (Recomendado)
1. Haz doble clic en el archivo `EJECUTAR_ress.bat`.
2. El script verificará si tienes **Node.js** instalado (si falta, se ofrecerá a instalarlo automáticamente con `winget`).
3. Se instalarán los módulos de npm y se abrirá el navegador en `http://localhost:30787`.

---

### Opción 2: Instalación en el Disco Duro con Acceso Directo
1. Haz clic derecho en `INSTALAR_ress.ps1` y selecciona **Ejecutar con PowerShell**.
2. El instalador copiará la app a tu carpeta de aplicaciones y creará un **Acceso Directo en el Escritorio**.

---

### Opción 3: Compilar a un Archivo .EXE Nativo Independiente
Si deseas convertir este proyecto en una aplicación de escritorio nativa sin consolas visibles:
1. Asegúrate de tener Node.js instalado.
2. Abre la consola de comandos en esta carpeta y ejecuta:
   ```cmd
   call COMPILAR_A_EXE.bat
   ```
3. Electron empaquetará la app y generará un archivo **`ress_v1.0.0_Portable.exe`** en la carpeta `dist/`.

---

## 🛠️ Detalles Técnicos del Proyecto
- **Tipo de Proyecto:** Fullstack (Servidor Express + Frontend Vite React)
- **Punto de Entrada:** `server.ts`
- **Puerto Configurado:** `30787`
- **Soporte Gemini AI:** Sí (API Key requerida en .env)

---
*Generado por APPKIS Engine - https://github.com/PISTON-QUARKS/APPKIS*
