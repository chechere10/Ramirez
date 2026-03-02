# ============================================
# ManifestoCross Frontend - Dockerfile
# ============================================

# Etapa 1: Base para desarrollo y build
FROM node:20-alpine AS base

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# ============================================
# Etapa 2: Development
FROM base AS development

# Instalar dependencias (incluyendo devDependencies)
RUN npm ci

# Copiar código fuente
COPY . .

# Puerto de desarrollo
EXPOSE 3005

# Comando para desarrollo con hot-reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3005"]

# ============================================
# Etapa 3: Build
FROM base AS build

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Argumentos de build para variables de entorno
ARG VITE_API_URL=/api
ARG VITE_APP_NAME=ManifestoCross

# Establecer variables de entorno para el build
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_NAME=$VITE_APP_NAME

# Construir la aplicación
RUN npm run build

# ============================================
# Etapa 4: Production con Nginx
FROM nginx:alpine AS production

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos desde la etapa de build
COPY --from=build /app/dist /usr/share/nginx/html

# Puerto de producción
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]
