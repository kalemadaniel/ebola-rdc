@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installez Node.js 22 ou une version plus recente depuis https://nodejs.org
  pause
  exit /b 1
)
echo Ouvrez http://127.0.0.1:4173 dans votre navigateur.
echo Gardez cette fenetre ouverte pour permettre les actualisations HDX.
node server.mjs
pause
