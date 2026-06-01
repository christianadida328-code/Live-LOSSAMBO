@echo off
setlocal

REM Lancement fixe du backend sur le port 5000
cd /d "%~dp0\backend"

REM FORCE_SQLITE aide au démarrage sans PostgreSQL
set FORCE_SQLITE=true

python app.py

endlocal

