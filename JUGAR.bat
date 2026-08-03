@echo off
REM ══════════════════════════════════════════════════════════════════════════
REM  JUGAR.bat — arrancar el prototipo local de un clic
REM
REM  Levanta el servidor sin cache y abre el indice en el navegador.
REM  Sin cache no es un capricho: `python -m http.server` se queda con los .js
REM  viejos y te ensena una version distinta de la que hay en disco.
REM
REM  Para cerrarlo: cierra la ventana negra del servidor.
REM ══════════════════════════════════════════════════════════════════════════
cd /d "%~dp0"

REM Si ya hay algo escuchando en el 8000, no levantamos otro.
netstat -ano | findstr /r /c:"127.0.0.1:8000 .*LISTENING" >nul
if %errorlevel%==0 (
    echo   El servidor ya estaba levantado en el puerto 8000.
) else (
    echo   Levantando el servidor en http://127.0.0.1:8000 ...
    start "ALISA - servidor local (cierra esta ventana para parar)" cmd /c python servir.py 8000
    timeout /t 2 /nobreak >nul
)

echo   Abriendo el indice...
start "" "http://127.0.0.1:8000/lab.html"
echo.
echo   INDICE      http://127.0.0.1:8000/lab.html
echo   LA SALA     http://127.0.0.1:8000/rooms/room_sala_del_huevo.html
echo.
timeout /t 4 /nobreak >nul
