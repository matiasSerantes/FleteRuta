@echo off
cd /d "%~dp0"
echo FleteRuta TEST 0.3 - abrir http://localhost:5173
echo Mantene esta ventana abierta. Ctrl+C para detener.
node server.mjs
pause
