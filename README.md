# 🚀 ManifestoCross

## Sistema de Gestión Automatizada de Manifiestos y Cruce con Facturas

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Descripción

**ManifestoCross** es una aplicación profesional diseñada para automatizar el proceso de verificación y cruce de códigos entre manifiestos y facturas PDF. Elimina la búsqueda manual, genera evidencia documental y garantiza precisión en el proceso.

### ✨ Características Principales

- 📄 **Carga de documentos PDF** (manifiestos y facturas)
- 🔍 **Extracción automática de códigos** con OCR integrado
- ⚡ **Búsqueda instantánea** en miles de páginas
- 🎨 **Resaltado visual** de códigos encontrados
- 📊 **Reportes exportables** (PDF, Excel, CSV)
- 📝 **Auditoría completa** de operaciones

---

## 🏗️ Arquitectura

```
ManifestoCross/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── api/            # Endpoints REST
│   │   ├── core/           # Configuración central
│   │   ├── models/         # Modelos de BD
│   │   ├── schemas/        # Schemas Pydantic
│   │   ├── services/       # Lógica de negocio
│   │   └── utils/          # Utilidades
│   └── tests/              # Tests unitarios
├── frontend/               # React App
├── storage/                # Almacenamiento de archivos
│   ├── uploads/            # PDFs subidos
│   └── processed/          # PDFs procesados
├── docs/                   # Documentación
└── docker-compose.yml      # Orquestación de servicios
```

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Backend | Python 3.11+ / FastAPI |
| Frontend | React 18 / TailwindCSS |
| Base de Datos | PostgreSQL |
| Búsqueda | ElasticSearch |
| Almacenamiento | MinIO (S3 compatible) |
| PDF Processing | PyMuPDF + Tesseract OCR |
| Cache/Queue | Redis |

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (recomendado)

### Instalación

#### 1. Clonar repositorio
```bash
git clone https://github.com/tu-usuario/manifestocross.git
cd manifestocross
```

#### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o: venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

#### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

#### 4. Ejecutar servidor de desarrollo
```bash
uvicorn app.main:app --reload --port 8005
```

#### 5. Frontend (en otra terminal)
```bash
cd frontend
npm install
npm run dev
```

---

## 📖 Documentación API

Una vez ejecutando el servidor, accede a:
- **Swagger UI**: http://localhost:8005/docs
- **ReDoc**: http://localhost:8005/redoc

---

## 🧪 Testing

```bash
# Backend
cd backend
pytest -v

# Frontend
cd frontend
npm test
```

---

## 📊 Roadmap

Ver [ROADMAP.md](ROADMAP.md) para el estado detallado del desarrollo.

---

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

## 📞 Contacto

Proyecto ManifestoCross - Sistema de Gestión de Manifiestos

---

**Desarrollado con ❤️ para optimizar procesos documentales**
