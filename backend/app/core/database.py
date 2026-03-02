"""
Configuración de la base de datos con SQLAlchemy.
"""

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


# Convertir URL sync a async
def get_async_database_url(url: str) -> str:
    """Convierte URL de PostgreSQL sync a async."""
    return url.replace("postgresql://", "postgresql+asyncpg://")


# Motor de base de datos síncrono (para migraciones)
sync_engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

# Motor de base de datos asíncrono (para la aplicación)
async_engine = create_async_engine(
    get_async_database_url(settings.DATABASE_URL),
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

# Session factories
SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
)

AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Clase base para todos los modelos SQLAlchemy."""
    pass


async def get_db() -> AsyncSession:
    """
    Dependency para obtener sesión de base de datos.
    Uso en endpoints:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Inicializar base de datos (crear tablas si no existen)."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Context manager para obtener sesión síncrona de base de datos.
    
    Uso en tareas Celery y otros contextos síncronos:
        with get_db_context() as db:
            resultado = db.query(Modelo).all()
    """
    session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_sync_db() -> Generator[Session, None, None]:
    """
    Generator para obtener sesión síncrona de base de datos.
    
    Uso como dependency en contextos síncronos.
    """
    session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

