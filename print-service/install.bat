@echo off
echo ========================================
echo  ManifiestoCross - Servicio de Impresion
echo ========================================
echo.

:: Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no esta instalado
    echo Descargalo de: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [OK] Python encontrado
echo.

:: Instalar dependencias
echo Instalando dependencias...
pip install -r requirements.txt

if errorlevel 1 (
    echo [ERROR] Fallo al instalar dependencias
    pause
    exit /b 1
)

echo.
echo [OK] Dependencias instaladas correctamente
echo.
echo ========================================
echo  Para iniciar el servicio ejecuta:
echo    start.bat
echo ========================================
pause
