@echo off
chcp 65001 >nul
title Dalmg — запуск
cd /d "%~dp0"

echo Запускаем API и веб-приложение Dalmg...
echo.
echo   Дашборд:  http://localhost:3002
echo   API:      http://127.0.0.1:3001/health
echo.
echo Не закрывайте открывшиеся окна, пока работаете с приложением.
echo.

start "Dalmg API" cmd /k "npm run dev:api"
timeout /t 2 >nul
start "Dalmg Web" cmd /k "npm run dev:web"

echo Готово. Окна серверов открыты отдельно.
timeout /t 3 >nul
