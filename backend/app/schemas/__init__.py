"""
Schemas Pydantic para validación de datos.
"""

from app.schemas.busqueda import (
    BusquedaCreate,
    BusquedaListResponse,
    BusquedaResponse,
    CodigoResultado,
    EstadoBusqueda,
    EstadoResultado,
    ResultadoBusquedaResponse,
)
from app.schemas.documento import (
    CodigoEnDocumento,
    DocumentoCreate,
    DocumentoListResponse,
    DocumentoResponse,
    DocumentoUpdate,
    DocumentoWithCodigos,
    EstadoDocumento,
    TipoDocumento,
)
from app.schemas.reporte import (
    ColorResaltado,
    EstadoReporte,
    ReporteCreate,
    ReporteListResponse,
    ReporteResponse,
)
from app.schemas.usuario import (
    RolUsuario,
    TokenResponse,
    UsuarioCreate,
    UsuarioLogin,
    UsuarioResponse,
    UsuarioUpdate,
)

__all__ = [
    # Documento
    "TipoDocumento",
    "EstadoDocumento",
    "DocumentoCreate",
    "DocumentoUpdate",
    "DocumentoResponse",
    "DocumentoWithCodigos",
    "DocumentoListResponse",
    "CodigoEnDocumento",
    # Busqueda
    "EstadoBusqueda",
    "EstadoResultado",
    "BusquedaCreate",
    "BusquedaResponse",
    "BusquedaListResponse",
    "ResultadoBusquedaResponse",
    "CodigoResultado",
    # Reporte
    "EstadoReporte",
    "ColorResaltado",
    "ReporteCreate",
    "ReporteResponse",
    "ReporteListResponse",
    # Usuario
    "RolUsuario",
    "UsuarioCreate",
    "UsuarioLogin",
    "UsuarioUpdate",
    "UsuarioResponse",
    "TokenResponse",
]
