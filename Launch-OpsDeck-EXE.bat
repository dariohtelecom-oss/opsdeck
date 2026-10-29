@echo off
title OpsDeck.exe - Corporate Host Agent & Desktop Suite v2.5
cd /d "%~dp0"

echo [OpsDeck.exe] Iniciando Demonio Nativo Win32 en puerto :8620...
start "OpsDeck Host Agent" /min cmd /c "npm run host"

echo [OpsDeck.exe] Verificando servidor UI en puerto :5173...
netstat -ano | findstr ":5173" >nul
if %errorlevel% neq 0 (
  start "OpsDeck UI Server" /min cmd /c "npm run dev -- --port 5173 --host"
  timeout /t 2 /nobreak >nul
)

echo [OpsDeck.exe] Abriendo ventana nativa corporativa sin bordes...
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5173 --window-size=1440,900
) else (
  start http://localhost:5173
)
exit
