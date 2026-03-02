"""
API de Sincronización con MinIO
Permite almacenar y recuperar datos JSON para sincronización entre dispositivos
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import json
from minio import Minio
from minio.error import S3Error
import os
from io import BytesIO

router = APIRouter(prefix="/api/sync", tags=["sync"])

# Configuración de MinIO
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "manifestocross")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

# Claves permitidas para sincronización
ALLOWED_KEYS = {
    'manifesto_clientes',
    'manifesto_inventario',
    'manifesto_proveedores', 
    'manifesto_pedidos_entrada',
    'manifesto_facturas_ventas',
    'manifesto_config_empresa'
}

def get_minio_client():
    """Obtener cliente de MinIO"""
    return Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_SECURE
    )

def ensure_bucket_exists(client: Minio):
    """Asegurar que el bucket existe"""
    try:
        if not client.bucket_exists(MINIO_BUCKET):
            client.make_bucket(MINIO_BUCKET)
    except S3Error as e:
        print(f"Error creando bucket: {e}")

@router.get("/health")
async def health_check():
    """Verificar conexión con MinIO"""
    try:
        client = get_minio_client()
        ensure_bucket_exists(client)
        return {"status": "ok", "minio": "connected", "bucket": MINIO_BUCKET}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"MinIO no disponible: {str(e)}")

@router.put("/upload/{key}")
async def upload_data(key: str, request: Request):
    """Subir datos JSON a MinIO"""
    if key not in ALLOWED_KEYS:
        raise HTTPException(status_code=400, detail=f"Clave no permitida: {key}")
    
    try:
        # Leer body como JSON
        data = await request.json()
        json_data = json.dumps(data, ensure_ascii=False, indent=2)
        data_bytes = json_data.encode('utf-8')
        
        # Subir a MinIO
        client = get_minio_client()
        ensure_bucket_exists(client)
        
        client.put_object(
            MINIO_BUCKET,
            f"{key}.json",
            BytesIO(data_bytes),
            len(data_bytes),
            content_type="application/json"
        )
        
        return {"status": "ok", "key": key, "size": len(data_bytes)}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Datos JSON inválidos")
    except S3Error as e:
        raise HTTPException(status_code=500, detail=f"Error MinIO: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/download/{key}")
async def download_data(key: str):
    """Descargar datos JSON de MinIO"""
    if key not in ALLOWED_KEYS:
        raise HTTPException(status_code=400, detail=f"Clave no permitida: {key}")
    
    try:
        client = get_minio_client()
        
        # Verificar si existe
        try:
            response = client.get_object(MINIO_BUCKET, f"{key}.json")
            data = json.loads(response.read().decode('utf-8'))
            response.close()
            response.release_conn()
            return JSONResponse(content=data)
        except S3Error as e:
            if e.code == "NoSuchKey":
                raise HTTPException(status_code=404, detail=f"Datos no encontrados: {key}")
            raise
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/list")
async def list_data():
    """Listar todos los datos almacenados"""
    try:
        client = get_minio_client()
        ensure_bucket_exists(client)
        
        objects = client.list_objects(MINIO_BUCKET)
        files = []
        for obj in objects:
            if obj.object_name.endswith('.json'):
                key = obj.object_name.replace('.json', '')
                if key in ALLOWED_KEYS:
                    files.append({
                        "key": key,
                        "size": obj.size,
                        "last_modified": obj.last_modified.isoformat() if obj.last_modified else None
                    })
        
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.delete("/delete/{key}")
async def delete_data(key: str):
    """Eliminar datos de MinIO"""
    if key not in ALLOWED_KEYS:
        raise HTTPException(status_code=400, detail=f"Clave no permitida: {key}")
    
    try:
        client = get_minio_client()
        client.remove_object(MINIO_BUCKET, f"{key}.json")
        return {"status": "ok", "deleted": key}
    except S3Error as e:
        if e.code == "NoSuchKey":
            raise HTTPException(status_code=404, detail=f"Datos no encontrados: {key}")
        raise HTTPException(status_code=500, detail=f"Error MinIO: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
