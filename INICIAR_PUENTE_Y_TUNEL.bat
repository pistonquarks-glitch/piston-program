@echo off
title PUENTE WHATSAPP + TUNEL CLOUDFLARE
color 0B
chcp 65001 >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INICIAR_PUENTE_Y_TUNEL.ps1"
