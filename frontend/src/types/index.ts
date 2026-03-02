// TypeScript Types and Interfaces

export interface Documento {
  id: string
  nombre: string
  tipo: 'manifiesto' | 'factura'
  archivo: string
  fechaCarga: string
  totalPaginas: number
  totalCodigos: number
  estado: 'procesando' | 'completado' | 'error'
}

export interface Codigo {
  id: string
  valor: string
  normalizado: string
  documentoId: string
  pagina: number
  posicionX?: number
  posicionY?: number
}

export interface ResultadoBusqueda {
  codigo: string
  encontrado: boolean
  pagina?: number
  frecuencia: number
  ubicaciones: {
    pagina: number
    x: number
    y: number
  }[]
}

export interface Busqueda {
  id: string
  fecha: string
  manifiestoId: string
  codigosBuscados: string[]
  resultados: ResultadoBusqueda[]
  totalEncontrados: number
  totalNoEncontrados: number
}

export interface Reporte {
  id: string
  busquedaId: string
  fecha: string
  tipo: 'pdf' | 'excel' | 'csv'
  archivo: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
