# 🚀 ROADMAP - Sistema de Gestión de Manifiestos y Cruce con Facturas

> **Proyecto:** ManifestoCross  
> **Fecha de inicio:** 19 de enero de 2026  
> **Última actualización:** 19 de enero de 2026  
> **Estado general:** � En desarrollo

---

## 📊 Resumen de Progreso

| Fase | Descripción | Estado | Progreso |
|------|-------------|--------|----------|
| 1 | Configuración del Entorno | 🟢 Completado | 100% |
| 2 | Backend Core | 🟢 Completado | 100% |
| 3 | Procesamiento de PDFs | 🟢 Completado | 100% |
| 4 | Sistema de Búsqueda | 🟢 Completado | 100% |
| 5 | Frontend | � Completado | 100% |
| 6 | Generación de Reportes | 🔴 Pendiente | 0% |
| 7 | Auditoría y Seguridad | 🔴 Pendiente | 0% |
| 8 | Testing y QA | 🔴 Pendiente | 0% |
| 9 | Deployment | 🔴 Pendiente | 0% |
| 10 | Documentación | 🔴 Pendiente | 0% |

**Leyenda:** 🔴 Pendiente | 🟡 En progreso | 🟢 Completado

---

## 📁 FASE 1: Configuración del Entorno de Desarrollo

### 1.1 Estructura del Proyecto
- [x] Crear estructura de carpetas del proyecto
- [ ] Configurar monorepo (si aplica)
- [x] Inicializar repositorio Git
- [x] Configurar `.gitignore`
- [x] Crear archivo `README.md` principal

### 1.2 Backend - Entorno Python/FastAPI
- [x] Crear entorno virtual Python
- [x] Instalar FastAPI y dependencias
- [x] Configurar `requirements.txt` o `pyproject.toml`
- [x] Configurar linter (flake8/black)
- [x] Configurar pre-commit hooks

### 1.3 Frontend - Entorno React
- [x] Inicializar proyecto React (Vite o CRA)
- [x] Instalar TailwindCSS
- [x] Configurar estructura de carpetas (components, pages, hooks, etc.)
- [x] Instalar dependencias UI (Material UI / Headless UI)
- [x] Configurar ESLint y Prettier

### 1.4 Base de Datos
- [x] Instalar y configurar PostgreSQL
- [x] Crear base de datos del proyecto
- [x] Configurar usuario y permisos
- [ ] Instalar cliente de DB (DBeaver/pgAdmin)

### 1.5 Servicios Externos
- [x] Instalar y configurar ElasticSearch
- [x] Instalar y configurar MinIO
- [x] Verificar conectividad de servicios
- [x] Configurar variables de entorno (`.env`)

### 1.6 Docker (Opcional pero recomendado)
- [x] Crear `Dockerfile` para backend
- [x] Crear `Dockerfile` para frontend
- [x] Crear `docker-compose.yml`
- [x] Configurar volúmenes persistentes
- [x] Probar levantamiento de servicios

---

## 📁 FASE 2: Backend Core (API)

### 2.1 Estructura Base de la API
- [x] Configurar estructura de FastAPI
- [x] Implementar sistema de routers
- [x] Configurar CORS
- [x] Implementar middleware de logging
- [x] Configurar manejo global de errores

### 2.2 Modelos de Base de Datos
- [x] Instalar SQLAlchemy / Alembic
- [x] Crear modelo `Documento` (manifiestos/facturas)
- [x] Crear modelo `Codigo` (códigos extraídos)
- [x] Crear modelo `Busqueda` (historial de búsquedas)
- [x] Crear modelo `Usuario` (para auditoría)
- [x] Crear modelo `ResultadoBusqueda`
- [x] Configurar migraciones con Alembic
- [x] Ejecutar migraciones iniciales

### 2.3 Endpoints de Documentos
- [x] `POST /api/documentos/upload` - Subir documento
- [x] `GET /api/documentos` - Listar documentos
- [x] `GET /api/documentos/{id}` - Obtener documento
- [x] `DELETE /api/documentos/{id}` - Eliminar documento
- [x] `GET /api/documentos/{id}/download` - Descargar documento
- [x] `GET /api/documentos/{id}/codigos` - Listar códigos del documento

### 2.4 Endpoints de Búsqueda
- [x] `POST /api/busqueda/ejecutar` - Ejecutar búsqueda de códigos
- [x] `GET /api/busqueda/historial` - Historial de búsquedas
- [x] `GET /api/busqueda/{id}/resultados` - Resultados de una búsqueda

### 2.5 Endpoints de Reportes
- [x] `POST /api/reportes/generar` - Generar reporte
- [x] `GET /api/reportes/{id}/pdf` - Descargar PDF con resaltados
- [x] `GET /api/reportes/{id}/excel` - Descargar Excel de resultados
- [x] `GET /api/reportes/{id}/csv` - Descargar CSV de resultados

### 2.6 Validaciones y Schemas
- [x] Crear schemas Pydantic para requests
- [x] Crear schemas Pydantic para responses
- [x] Implementar validaciones de archivos (tipo, tamaño)
- [x] Implementar validaciones de códigos

---

## 📁 FASE 3: Procesamiento de PDFs

### 3.1 Módulo de Extracción de Texto
- [x] Instalar PyMuPDF (fitz)
- [x] Implementar extractor de texto de PDF
- [x] Detectar si PDF es texto o imagen
- [x] Manejar PDFs con múltiples páginas
- [x] Extraer metadatos del PDF (autor, fecha, páginas)

### 3.2 Módulo OCR
- [x] Instalar Tesseract OCR
- [x] Instalar pytesseract (wrapper Python)
- [x] Implementar conversión PDF a imágenes
- [x] Implementar extracción de texto vía OCR
- [x] Configurar idioma(s) de OCR
- [x] Optimizar calidad de imagen para OCR

### 3.3 Extracción de Códigos
- [x] Definir patrones de códigos (regex)
- [x] Implementar extractor de códigos del texto
- [x] Normalizar códigos (espacios, guiones, ceros)
- [x] Detectar códigos duplicados
- [x] Guardar coordenadas/posición de cada código
- [x] Asociar código con número de página

### 3.4 Procesamiento de Manifiestos
- [x] Implementar carga de manifiestos
- [x] Extraer todos los códigos del manifiesto
- [x] Almacenar en base de datos
- [x] Indexar en ElasticSearch
- [x] Generar resumen de procesamiento

### 3.5 Procesamiento de Facturas
- [x] Implementar carga de facturas
- [x] Extraer códigos de la factura
- [x] Normalizar códigos extraídos
- [x] Permitir carga manual de códigos
- [x] Permitir carga desde CSV/Excel

### 3.6 Sistema de Colas (para procesamiento async)
- [x] Instalar Celery o similar
- [x] Configurar broker (Redis/RabbitMQ)
- [x] Implementar tarea de procesamiento de PDF
- [x] Implementar notificación de completado
- [x] Manejar errores y reintentos

---

## 📁 FASE 4: Sistema de Búsqueda e Indexación

### 4.1 Configuración de ElasticSearch
- [x] Crear índice para manifiestos
- [x] Definir mappings (campos, tipos)
- [x] Configurar analizadores de texto
- [x] Configurar tokenizadores para códigos

### 4.2 Indexación de Documentos
- [x] Implementar servicio de indexación
- [x] Indexar texto completo del manifiesto
- [x] Indexar códigos individuales
- [x] Indexar metadatos (página, posición, documento)
- [x] Implementar actualización de índice
- [x] Implementar eliminación de índice

### 4.3 Motor de Búsqueda
- [x] Implementar búsqueda exacta de código
- [x] Implementar búsqueda fuzzy (tolerante a errores)
- [x] Implementar búsqueda por lotes (múltiples códigos)
- [x] Retornar contexto de cada coincidencia
- [x] Retornar ubicación exacta (página, línea)
- [x] Optimizar performance de búsquedas masivas

### 4.4 Algoritmo de Matching
- [x] Comparar códigos de factura vs manifiesto
- [x] Clasificar: encontrados / no encontrados
- [x] Detectar coincidencias parciales
- [x] Generar estadísticas de matching
- [x] Manejar códigos normalizados

---

## 📁 FASE 5: Frontend (Interfaz de Usuario)

### 5.1 Estructura y Navegación
- [x] Implementar layout principal
- [x] Implementar sidebar/menú de navegación
- [x] Implementar header con información de usuario
- [x] Configurar rutas (React Router)
- [x] Implementar página de inicio/dashboard

### 5.2 Módulo de Carga de Documentos
- [x] Componente de drag & drop para PDFs
- [x] Validación de tipo de archivo
- [x] Barra de progreso de carga
- [x] Preview de documento cargado
- [x] Selector de tipo (manifiesto/factura)
- [x] Historial de documentos cargados

### 5.3 Módulo de Gestión de Códigos
- [x] Input para ingresar códigos manualmente
- [x] Textarea para pegar múltiples códigos
- [x] Carga de códigos desde archivo (CSV)
- [x] Lista editable de códigos
- [x] Eliminar/agregar códigos individualmente
- [x] Contador de códigos totales

### 5.4 Módulo de Búsqueda y Resultados
- [x] Botón "Procesar" / "Buscar"
- [x] Indicador de progreso de búsqueda
- [x] Tabla de resultados con columnas:
  - [x] Código
  - [x] Estado (encontrado/no encontrado)
  - [x] Página
  - [x] Frecuencia
- [x] Filtros de resultados
- [x] Ordenamiento de resultados
- [x] Paginación de resultados
- [x] Resumen estadístico (total, encontrados, no encontrados)

### 5.5 Visor de PDF
- [x] Integrar visor de PDF (react-pdf o similar)
- [x] Mostrar resaltados en el visor
- [x] Navegación por páginas
- [x] Zoom in/out
- [x] Click en resultado → ir a página del código
- [x] Resaltar código seleccionado

### 5.6 Módulo de Exportación
- [x] Botón descargar PDF con resaltados
- [x] Botón descargar reporte CSV
- [x] Selector de opciones de exportación
- [x] Preview antes de exportar
- [x] Modal de exportación con configuración

### 5.7 Configuración y Preferencias
- [x] Selector de color de resaltado
- [x] Configuración de normalización de códigos
- [x] Guardar preferencias de usuario
- [x] Tema claro/oscuro

### 5.8 Responsive y UX
- [x] Diseño responsive (mobile/tablet/desktop)
- [x] Estados de carga (loading spinners)
- [x] Mensajes de error amigables
- [x] Tooltips y ayudas contextuales
- [x] Notificaciones toast

---

## 📁 FASE 6: Anotación de PDFs y Reportes ✅ (100%)

> **IMPORTANTE:** Los documentos PDF originales (manifiestos DIAN) tienen validez legal y NO deben ser alterados en su contenido. Solo se permite agregar una capa de anotaciones (resaltados) que preserve la integridad del documento original.

### 6.1 Anotación de PDFs (Preservando Integridad) ✅
- [x] Instalar PyMuPDF (fitz) para anotaciones
- [x] Implementar resaltado como capa de anotación (NO edición de contenido)
- [x] Usar coordenadas exactas de los códigos encontrados
- [x] Configurar colores y opacidad del resaltado
- [x] Preservar 100% el contenido original del PDF
- [x] Validar que metadatos del PDF no se alteran
- [x] Las anotaciones deben ser visibles pero no intrusivas

### 6.2 Generación de PDF Anotado ✅
- [x] Trabajar sobre COPIA del PDF original (nunca el archivo fuente)
- [x] Aplicar anotaciones de resaltado por coordenadas
- [x] NO agregar páginas adicionales al documento
- [x] NO agregar marcas de agua que alteren el documento legal
- [x] Mantener el mismo número de páginas que el original
- [x] Generar archivo separado: `documento_resaltado.pdf`
- [x] Verificación de integridad: confirmar mismo número de páginas

### 6.3 Reporte Complementario (PDF Separado) ✅
- [x] Generar PDF de REPORTE separado (no dentro del manifiesto)
- [x] Incluir resumen de búsqueda: fecha, códigos buscados, resultados
- [x] Lista de códigos encontrados con página y ubicación
- [x] Lista de códigos NO encontrados
- [x] Estadísticas de coincidencia
- [x] Este reporte es un documento NUEVO, no altera el original
- [x] Endpoint `/resaltar-con-reporte` que devuelve ZIP con ambos

### 6.4 Reportes en CSV ✅
- [x] Generar CSV simple de resultados
- [x] Columnas: código, estado, página, frecuencia, documento
- [x] Incluir headers descriptivos
- [x] Encoding UTF-8 con BOM para Excel
- [x] Formatos: simple, detallado, resumen
- [x] Separador configurable (coma o punto y coma)
- [x] Endpoint `/resaltar-csv` 
- [x] Endpoint `/paquete-completo` (PDF + Reporte + CSV)

### 6.5 Dashboard de Estadísticas ✅
- [x] Componente StatsCard - Tarjetas de estadísticas
- [x] Componente ResultsChart - Gráficos donut/bar/progress
- [x] Componente ProcessingHistory - Historial de procesamiento
- [x] Componente StatsOverview - Panel de resumen completo
- [x] Componente ExportOptions - Opciones de exportación

---

## 📁 FASE 7: Auditoría y Seguridad

### 7.1 Sistema de Usuarios
- [ ] Implementar modelo de Usuario
- [ ] Registro de usuarios
- [ ] Login/Logout
- [ ] Autenticación JWT
- [ ] Roles (admin, usuario, viewer)
- [ ] Permisos por rol

### 7.2 Log de Auditoría
- [ ] Modelo de registro de auditoría
- [ ] Registrar cada acción del usuario
- [ ] Registrar timestamp de cada operación
- [ ] Registrar documentos procesados
- [ ] Registrar IP y dispositivo
- [ ] Consulta de historial de auditoría

### 7.3 Seguridad de Documentos
- [ ] Validación de tipos de archivo permitidos
- [ ] Escaneo de malware (opcional)
- [ ] Límite de tamaño de archivo
- [ ] Encriptación de documentos en reposo
- [ ] Acceso restringido por usuario/rol

### 7.4 Backup y Recuperación
- [ ] Configurar backup automático de DB
- [ ] Backup de documentos en MinIO
- [ ] Script de restauración
- [ ] Política de retención de datos

---

## 📁 FASE 8: Testing y QA

### 8.1 Tests Unitarios - Backend
- [ ] Configurar pytest
- [ ] Tests de endpoints API
- [ ] Tests de extracción de texto
- [ ] Tests de extracción de códigos
- [ ] Tests de búsqueda
- [ ] Tests de generación de reportes
- [ ] Cobertura mínima 80%

### 8.2 Tests Unitarios - Frontend
- [ ] Configurar Jest + React Testing Library
- [ ] Tests de componentes principales
- [ ] Tests de hooks personalizados
- [ ] Tests de formularios
- [ ] Tests de integración con API

### 8.3 Tests de Integración
- [ ] Tests end-to-end del flujo completo
- [ ] Tests de carga de documentos
- [ ] Tests de búsqueda y resultados
- [ ] Tests de exportación

### 8.4 Tests de Performance
- [ ] Test con PDF de 1000+ páginas
- [ ] Test con 10,000+ códigos
- [ ] Medir tiempos de respuesta
- [ ] Identificar cuellos de botella
- [ ] Optimizar queries lentas

### 8.5 QA Manual
- [ ] Checklist de funcionalidades
- [ ] Pruebas de usabilidad
- [ ] Pruebas en diferentes navegadores
- [ ] Pruebas con diferentes tipos de PDF
- [ ] Documentar bugs encontrados

---

## 📁 FASE 9: Deployment y DevOps

### 9.1 Preparación para Producción
- [ ] Configurar variables de entorno de producción
- [ ] Optimizar build de frontend
- [ ] Configurar logging de producción
- [ ] Configurar manejo de errores de producción
- [ ] Health checks de servicios

### 9.2 Infraestructura
- [ ] Elegir proveedor cloud (AWS/GCP/Azure/VPS)
- [ ] Configurar servidor/instancias
- [ ] Configurar dominio y DNS
- [ ] Configurar SSL/HTTPS
- [ ] Configurar firewall

### 9.3 CI/CD
- [ ] Configurar GitHub Actions / GitLab CI
- [ ] Pipeline de tests automáticos
- [ ] Pipeline de build
- [ ] Pipeline de deploy automático
- [ ] Notificaciones de deploy

### 9.4 Monitoreo
- [ ] Configurar monitoreo de servicios
- [ ] Alertas de caída de servicio
- [ ] Métricas de performance
- [ ] Dashboard de monitoreo
- [ ] Log aggregation

### 9.5 Opción Desktop (Electron)
- [ ] Configurar Electron
- [ ] Empaquetar aplicación
- [ ] Configurar auto-updates
- [ ] Build para Windows
- [ ] Build para macOS
- [ ] Build para Linux
- [ ] Instaladores

---

## 📁 FASE 10: Documentación

### 10.1 Documentación Técnica
- [ ] Documentar arquitectura del sistema
- [ ] Documentar API (Swagger/OpenAPI)
- [ ] Documentar modelos de datos
- [ ] Documentar flujos de procesamiento
- [ ] Diagramas de arquitectura

### 10.2 Manual de Usuario
- [ ] Guía de inicio rápido
- [ ] Tutorial paso a paso
- [ ] FAQ - Preguntas frecuentes
- [ ] Solución de problemas comunes
- [ ] Videos tutoriales (opcional)

### 10.3 Documentación de Desarrollo
- [ ] Guía de contribución
- [ ] Configuración de entorno de desarrollo
- [ ] Estándares de código
- [ ] Guía de testing
- [ ] Proceso de release

### 10.4 Documentación de Operaciones
- [ ] Guía de instalación
- [ ] Guía de configuración
- [ ] Procedimientos de backup
- [ ] Procedimientos de recuperación
- [ ] Guía de troubleshooting

---

## 🎯 Hitos Principales (Milestones)

| Hito | Descripción | Fecha Objetivo | Estado |
|------|-------------|----------------|--------|
| M1 | MVP Backend funcional | ___/___/2026 | ⬜ |
| M2 | Procesamiento de PDFs operativo | ___/___/2026 | ⬜ |
| M3 | Búsqueda y matching funcionando | ___/___/2026 | ⬜ |
| M4 | Frontend básico integrado | ___/___/2026 | ⬜ |
| M5 | Generación de reportes | ___/___/2026 | ⬜ |
| M6 | MVP Completo | ___/___/2026 | ⬜ |
| M7 | Testing completo | ___/___/2026 | ⬜ |
| M8 | Deploy a producción | ___/___/2026 | ⬜ |
| M9 | Versión 1.0 Release | ___/___/2026 | ⬜ |

---

## 📝 Notas y Decisiones

### Decisiones Técnicas
| Fecha | Decisión | Justificación |
|-------|----------|---------------|
| 19/01/2026 | Stack inicial definido | Python FastAPI + React + PostgreSQL + ElasticSearch |
| | | |
| | | |

### Riesgos Identificados
| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| PDFs escaneados de baja calidad | Alto | Implementar preprocesamiento de imagen |
| Volumen alto de páginas | Medio | Procesamiento asíncrono + paginación |
| | | |

### Dependencias Externas
- [ ] Tesseract OCR instalado en servidor
- [ ] ElasticSearch disponible
- [ ] MinIO o S3 compatible configurado
- [ ] PostgreSQL configurado

---

## 📌 Cómo Usar Este Roadmap

1. **Marcar completado:** Cambia `- [ ]` por `- [x]` cuando completes una tarea
2. **Actualizar estado:** Cambia el emoji de estado (🔴→🟡→🟢)
3. **Actualizar progreso:** Recalcula el porcentaje de cada fase
4. **Agregar notas:** Documenta decisiones importantes en la sección de Notas
5. **Revisar regularmente:** Actualiza el roadmap al menos semanalmente

---

## 🔄 Historial de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 19/01/2026 | Creación inicial del roadmap | Sistema |
| 19/01/2026 | ✅ Completada Fase 1.1 - Estructura del Proyecto | Sistema |
| 19/01/2026 | ✅ Completada Fase 1.2 - Backend Python/FastAPI | Sistema |
| 19/01/2026 | ✅ Completada Fase 1.3 - Frontend React/Vite/TailwindCSS | Sistema |
| 19/01/2026 | ✅ Completada Fase 1.4 - Base de Datos PostgreSQL (Docker) | Sistema |
| 19/01/2026 | ✅ Completada Fase 1.5 - Servicios Externos (ES, MinIO, Redis) | Sistema |
| 19/01/2026 | ✅ Completada Fase 1.6 - Docker (Dockerfiles, compose) | Sistema |
| 20/01/2026 | ✅ Completada Fase 2.1 - Estructura Base API (routers, middleware, exceptions) | Sistema |
| 20/01/2026 | ✅ Completada Fase 2.2 - Modelos de Base de Datos (SQLAlchemy, migraciones) | Sistema |
| 20/01/2026 | ✅ Completada Fase 2.3-2.6 - Endpoints y Schemas Pydantic | Sistema |
| 20/01/2026 | ✅ Completada Fase 4.2 - Servicio de Indexación de Documentos | Sistema |

---

> **💡 Tip:** Usa este documento como tu guía maestra. Cada tarea completada te acerca más a un sistema profesional y robusto.

**¡Éxito en el desarrollo! 🚀**
