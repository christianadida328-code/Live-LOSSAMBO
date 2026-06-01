@echo off
echo === Construction du Frontend (React) ===
cd frontend
call npm run build
if %errorlevel% neq 0 ( echo Erreur Build Frontend && pause && exit /b )

echo === Lancement du Backend (Flask) ===
cd ../backend
if exist venv\Scripts\activate call venv\Scripts\activate
start "Flask Server" /B python app.py

echo === Ouverture de Chrome ===
timeout /t 2 > nul
start chrome http://127.0.0.1:5000/
echo Site disponible sur http://127.0.0.1:5000/