// API Services - Servicios de conexión con el backend
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export interface DocumentoResponse {
  id: number
  nombre: string
  tipo: string
  descripcion?: string
  estado: string
  tamaño: number
  paginas?: number
  created_at?: string
  updated_at?: string
  mensaje?: string
}

export interface DocumentoListResponse {
  items: DocumentoResponse[]
  total: number
  skip: number
  limit: number
}

export interface BusquedaResult {
  codigo_original: string
  codigo_normalizado: string
  estado: 'encontrado' | 'no_encontrado' | 'parcial'
  encontrado_en: Array<{
    documento_id: number
    documento_nombre: string
    pagina: number
    linea?: number
    contexto?: string
    posicion_x?: number
    posicion_y?: number
  }>
  frecuencia: number
  similares?: string[]
}

export interface BusquedaResponse {
  id?: number
  codigos_buscados: number
  codigos_encontrados: number
  codigos_no_encontrados: number
  codigos_parciales?: number
  estado: string
  busqueda_fuzzy: boolean
  created_at?: string
  mensaje: string
  resultados: BusquedaResult[]
  resumen: {
    total_buscados: number
    encontrados: number
    parciales?: number
    no_encontrados: number
    porcentaje_encontrados: number
    manifiestos_consultados?: number
  }
}

export interface UploadMultipleResponse {
  total_subidos: number
  total_errores: number
  documentos: DocumentoResponse[]
  errores: Array<{ archivo: string; error: string }>
  mensaje: string
}

export const apiClient = {
  baseUrl: API_BASE_URL,
  
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  },
  
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  },
  
  async upload<T>(endpoint: string, file: File, params?: Record<string, string>): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)
    
    let url = `${API_BASE_URL}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  },

  async uploadMultiple<T>(endpoint: string, files: File[], params?: Record<string, string>): Promise<T> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    
    let url = `${API_BASE_URL}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  },
  
  async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  },
}

// Servicios específicos de documentos
export const documentosService = {
  async listar(tipo?: string, estado?: string, skip = 0, limit = 50): Promise<DocumentoListResponse> {
    const params = new URLSearchParams()
    if (tipo) params.append('tipo', tipo)
    if (estado) params.append('estado', estado)
    params.append('skip', skip.toString())
    params.append('limit', limit.toString())
    return apiClient.get(`/documentos?${params.toString()}`)
  },
  
  async subir(file: File, tipo: 'manifiesto' | 'factura', descripcion?: string): Promise<DocumentoResponse> {
    const params: Record<string, string> = { tipo }
    if (descripcion) params.descripcion = descripcion
    return apiClient.upload('/documentos/upload', file, params)
  },
  
  async subirMultiples(files: File[], tipo: 'manifiesto' | 'factura', descripcion?: string): Promise<UploadMultipleResponse> {
    const params: Record<string, string> = { tipo }
    if (descripcion) params.descripcion = descripcion
    return apiClient.uploadMultiple('/documentos/upload-multiple', files, params)
  },
  
  async obtener(id: number): Promise<DocumentoResponse> {
    return apiClient.get(`/documentos/${id}`)
  },
  
  async eliminar(id: number): Promise<void> {
    return apiClient.delete(`/documentos/${id}`)
  },
  
  async obtenerCodigos(id: number): Promise<any> {
    return apiClient.get(`/documentos/${id}/codigos`)
  },
}

// Servicios de búsqueda
export const busquedaService = {
  async ejecutar(codigos: string[], manifiestoIds?: number[], busquedaFuzzy = false): Promise<BusquedaResponse> {
    return apiClient.post('/busqueda/ejecutar', {
      codigos,
      manifiesto_ids: manifiestoIds,
      busqueda_fuzzy: busquedaFuzzy,
      normalizar_codigos: true,
    })
  },
  
  async buscarEnTexto(codigos: string[], manifiestoIds?: number[]): Promise<BusquedaResponse> {
    return apiClient.post('/busqueda/buscar-en-texto', {
      codigos,
      manifiesto_ids: manifiestoIds,
      normalizar_codigos: true,
    })
  },
  
  async historial(skip = 0, limit = 20): Promise<any> {
    return apiClient.get(`/busqueda/historial?skip=${skip}&limit=${limit}`)
  },
  
  async obtener(id: number): Promise<any> {
    return apiClient.get(`/busqueda/${id}`)
  },
  
  async obtenerResultados(id: number, soloEncontrados?: boolean, soloNoEncontrados?: boolean): Promise<any> {
    const params = new URLSearchParams()
    if (soloEncontrados) params.append('solo_encontrados', 'true')
    if (soloNoEncontrados) params.append('solo_no_encontrados', 'true')
    return apiClient.get(`/busqueda/${id}/resultados?${params.toString()}`)
  },
}

export default apiClient
