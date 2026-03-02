@echo off
echo ========================================
echo  Desinstalando Servicio de Impresion
echo ========================================
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Ejecuta este script como Administrador
    pause
    exit /b 1
)

echo Deteniendo servicio...
python "%~dp0print_service_win.py" stop

echo.
echo Eliminando servicio...
python "%~dp0print_service_win.py" remove

echo.
echo ========================================
echo  Servicio eliminado correctamente
echo ========================================
pause
