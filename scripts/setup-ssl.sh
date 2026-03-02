#!/bin/bash
# ===========================================
# ManifestoCross - Setup SSL con Let's Encrypt
# ===========================================

DOMAIN=${1:-"zeroset.me"}
EMAIL=${2:-"admin@zeroset.me"}

echo "🔐 Configurando SSL para $DOMAIN..."

# Crear nginx temporal para validación
cat > /tmp/nginx-temp.conf << 'EOF'
events {
    worker_connections 1024;
}
http {
    server {
        listen 80;
        server_name _;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 200 'ManifestoCross Setup';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Iniciar nginx temporal
docker run -d --name nginx-temp \
    -p 80:80 \
    -v /tmp/nginx-temp.conf:/etc/nginx/nginx.conf:ro \
    -v /opt/manifestocross/certbot/www:/var/www/certbot \
    nginx:alpine

sleep 5

# Obtener certificado
docker run --rm \
    -v /opt/manifestocross/certbot/conf:/etc/letsencrypt \
    -v /opt/manifestocross/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Detener nginx temporal
docker stop nginx-temp
docker rm nginx-temp

echo "✅ Certificado SSL obtenido para $DOMAIN"
