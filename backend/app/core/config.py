"""
Configuración central de la aplicación.
Carga variables de entorno y define configuraciones globales.
"""

from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración de la aplicación usando Pydantic Settings."""

    # Información de la aplicación
    APP_NAME: str = "ManifestoCross"
    VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Servidor
    HOST: str = "0.0.0.0"
    PORT: int = 8005  # Puerto alternativo para evitar conflictos

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3005",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3005",
        "http://127.0.0.1:5173",
        "http://192.168.1.16:3005",
        "http://100.71.152.76:3005",
        "http://100.66.161.20:3005",
        "http://100.124.109.122:3005",
        "http://100.120.186.4:3005",
        "http://192.168.1.16:8005",
        "http://100.71.152.76:8005",
    ]

    # Base de datos PostgreSQL
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5435/manifestocross"

    # ElasticSearch
    ELASTICSEARCH_URL: str = "http://localhost:9201"
    ELASTICSEARCH_INDEX: str = "manifiestos"

    # MinIO / S3
    MINIO_ENDPOINT: str = "localhost:9020"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "manifestocross"
    MINIO_SECURE: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6382/0"

    # Almacenamiento local
    UPLOAD_DIR: str = "storage/uploads"
    PROCESSED_DIR: str = "storage/processed"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50 MB

    # JWT / Autenticación
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # OCR
    TESSERACT_CMD: str = "/usr/bin/tesseract"
    OCR_LANGUAGES: str = "spa+eng"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Instancia global de configuración
settings = Settings()
