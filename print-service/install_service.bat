@echo off
echo ========================================
echo  Instalando Servicio de Impresion
echo ========================================
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Ejecuta este script como Administrador
    echo Clic derecho - Ejecutar como administrador
    pause
    exit /b 1
)

echo [1/3] Instalando servicio...
python "%~dp0print_service_win.py" install

echo.
echo [2/3] Configurando inicio automatico...
sc config ManifiestoCrossPrint start= auto

echo.
echo [3/3] Iniciando servicio...
python "%~dp0print_service_win.py" start

echo.
echo ========================================
echo  Servicio instalado correctamente!
echo  
echo  El servicio iniciara automaticamente
echo  con Windows.
echo  
echo  Puerto: 9100
echo  URL: http://localhost:9100
echo ========================================
pause
