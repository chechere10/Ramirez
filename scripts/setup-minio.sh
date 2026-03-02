#!/bin/bash
# Script para configurar el bucket de MinIO para ManifestoCross

# Esperar a que MinIO esté listo
echo "Esperando a que MinIO esté listo..."
sleep 5

# Configurar alias de MinIO
mc alias set myminio http://localhost:9020 minioadmin minioadmin

# Crear bucket si no existe
mc mb myminio/manifestocross --ignore-existing

# Configurar política pública para lectura/escritura
# Crear política JSON
cat > /tmp/manifestocross-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": ["arn:aws:s3:::manifestocross/*"]
    },
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:ListBucket"],
      "Resource": ["arn:aws:s3:::manifestocross"]
    }
  ]
}
EOF

# Aplicar política
mc anonymous set-json /tmp/manifestocross-policy.json myminio/manifestocross

echo "✅ Bucket 'manifestocross' configurado correctamente"
echo "   - Endpoint API: http://localhost:9020"
echo "   - Consola Web: http://localhost:9021"
echo "   - Usuario: minioadmin"
echo "   - Contraseña: minioadmin"
