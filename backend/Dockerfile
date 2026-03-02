# ============================================
# ManifestoCross Backend - Dockerfile
# ============================================
# Optimizado con OCRmyPDF para procesamiento paralelo de PDFs escaneados

# Etapa 1: Base
FROM python:3.11-slim AS base

# Variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Variables de entorno para OCRmyPDF
ENV OMP_THREAD_LIMIT=4 \
    TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata

# Instalar dependencias del sistema para OCR avanzado
# - Tesseract: Motor OCR principal
# - Ghostscript: Requerido por OCRmyPDF para manipulación de PDFs
# - unpaper: Limpieza de documentos escaneados (deskew, noise removal)
# - pngquant: Optimización de imágenes PNG
# - qpdf: Manipulación de PDFs de alto rendimiento
# - libleptonica-dev: Biblioteca de procesamiento de imágenes para OCR
# - jbig2dec: Decodificación JBIG2 para PDFs comprimidos
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    # OCR core
    tesseract-ocr \
    tesseract-ocr-spa \
    tesseract-ocr-eng \
    tesseract-ocr-osd \
    libleptonica-dev \
    # OCRmyPDF dependencies
    ghostscript \
    unpaper \
    pngquant \
    qpdf \
    libjpeg-dev \
    zlib1g-dev \
    # Image processing
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    # PDF utilities
    libmagic1 \
    poppler-utils \
    # Parallel processing
    parallel \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Crear usuario no-root
RUN groupadd --gid 1000 appgroup \
    && useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

# ============================================
# Etapa 2: Dependencies
FROM base AS dependencies

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias de Python incluyendo OCRmyPDF
RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    # Verificar instalación de OCRmyPDF
    ocrmypdf --version

# ============================================
# Etapa 3: Development
FROM dependencies AS development

# Copiar código fuente
COPY --chown=appuser:appgroup . .

# Crear directorios de storage y cache de OCR
RUN mkdir -p /app/storage/uploads /app/storage/processed /app/storage/ocr_cache && \
    chown -R appuser:appgroup /app/storage

USER appuser

# Puerto de la aplicación
EXPOSE 8005

# Comando para desarrollo con hot-reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005", "--reload"]

# ============================================
# Etapa 4: Production
FROM dependencies AS production

# Copiar código fuente
COPY --chown=appuser:appgroup . .

# Crear directorios de storage y cache de OCR
RUN mkdir -p /app/storage/uploads /app/storage/processed /app/storage/ocr_cache && \
    chown -R appuser:appgroup /app/storage

USER appuser

# Puerto de la aplicación
EXPOSE 8005

# Comando para producción con múltiples workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005", "--workers", "4"]
