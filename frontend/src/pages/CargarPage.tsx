import { useState, useCallback, useMemo, useEffect } from 'react'
import { Upload, Trash2, RefreshCw, FileText, Search, AlertCircle } from 'lucide-react'
import {
  FileDropzone,
  DocumentTypeSelector,
  UploadProgressList,
  DocumentHistory,
  type DocumentType,
  type DocumentHistoryItem,
} from '../components/documents'
import { useFileUpload, useToast } from '../hooks'
import { documentosService, type DocumentoResponse } from '../services/api'

export function CargarPage() {
  const [documentType, setDocumentType] = useState<DocumentType | null>('manifiesto')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [documents, setDocuments] = useState<DocumentHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { success, error: showError } = useToast()

  const {
    uploads,
    isUploading,
    cancelUpload,
    retryUpload,
    clearCompleted,
  } = useFileUpload()

  // Cargar documentos del backend al montar
  const cargarDocumentos = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await documentosService.listar(undefined, undefined, 0, 100)
      const items: DocumentHistoryItem[] = response.items.map((doc: DocumentoResponse) => ({
        id: doc.id.toString(),
        fileName: doc.nombre,
        fileSize: doc.tamaño,
        documentType: doc.tipo as DocumentType,
        uploadDate: new Date(doc.created_at || Date.now()),
        status: doc.estado === 'completado' ? 'completed' 
              : doc.estado === 'procesando' ? 'processing'
              : doc.estado === 'error' ? 'error' 
              : 'processing',
        pageCount: doc.paginas,
        errorMessage: doc.estado === 'error' ? 'Error en procesamiento' : undefined,
      }))
      setDocuments(items)
    } catch (err) {
      console.error('Error cargando documentos:', err)
      showError('Error', 'No se pudieron cargar los documentos')
    } finally {
      setIsLoading(false)
    }
  }, [showError])

  useEffect(() => {
    cargarDocumentos()
  }, [cargarDocumentos])

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!documentType || selectedFiles.length === 0) return

    setIsLoading(true)
    try {
      if (selectedFiles.length === 1) {
        const result = await documentosService.subir(
          selectedFiles[0],
          documentType as 'manifiesto' | 'factura'
        )
        success('Archivo subido', `${result.nombre} subido exitosamente`)
      } else {
        const result = await documentosService.subirMultiples(
          selectedFiles,
          documentType as 'manifiesto' | 'factura'
        )
        success('Archivos subidos', result.mensaje)
        
        if (result.errores.length > 0) {
          showError('Algunos errores', `${result.errores.length} archivo(s) fallaron`)
        }
      }
      
      await cargarDocumentos()
      setSelectedFiles([])
    } catch (err) {
      console.error('Error subiendo archivos:', err)
      showError('Error', 'No se pudieron subir los archivos')
    } finally {
      setIsLoading(false)
    }
  }, [documentType, selectedFiles, cargarDocumentos, success, showError])

  const handleDeleteDocument = useCallback(async (doc: DocumentHistoryItem) => {
    if (!confirm(`¿Eliminar "${doc.fileName}"?`)) return
    
    try {
      await documentosService.eliminar(parseInt(doc.id))
      success('Documento eliminado', `${doc.fileName} eliminado exitosamente`)
      await cargarDocumentos()
    } catch (err) {
      console.error('Error eliminando documento:', err)
      showError('Error', 'No se pudo eliminar el documento')
    }
  }, [cargarDocumentos, success, showError])

  const handleViewDocument = useCallback((doc: DocumentHistoryItem) => {
    window.location.href = `/visor?doc=${doc.id}`
  }, [])

  const handleReprocessDocument = useCallback((_doc: DocumentHistoryItem) => {
    success('En desarrollo', 'Función de reprocesamiento próximamente')
  }, [success])

  const stats = useMemo(() => ({
    total: documents.length,
    manifiestos: documents.filter((d) => d.documentType === 'manifiesto').length,
    facturas: documents.filter((d) => d.documentType === 'factura').length,
    procesando: documents.filter((d) => d.status === 'processing').length,
  }), [documents])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cargar Documentos</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Sube manifiestos o facturas en formato PDF para extraer códigos automáticamente
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Flujo de trabajo recomendado:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
              <li>Sube los <strong>manifiestos</strong> (puedes subir varios a la vez)</li>
              <li>Sube la <strong>factura</strong> con los códigos a buscar</li>
              <li>Ve a <strong>Búsqueda</strong> para encontrar los códigos de la factura en los manifiestos</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total documentos</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.manifiestos}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">Manifiestos</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.facturas}</p>
          <p className="text-sm text-purple-600 dark:text-purple-400">Facturas</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.procesando}</p>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">En proceso</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subir nuevo documento</h2>

        <DocumentTypeSelector
          value={documentType}
          onChange={setDocumentType}
          disabled={isUploading || isLoading}
        />

        {documentType === 'manifiesto' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
            <FileText className="inline h-4 w-4 mr-1" />
            Puedes seleccionar <strong>múltiples manifiestos</strong> para subirlos todos a la vez
          </p>
        )}

        <FileDropzone
          onFilesSelected={handleFilesSelected}
          maxFiles={documentType === 'manifiesto' ? 20 : 1}
          maxSizeMB={50}
          disabled={isUploading || isLoading || !documentType}
        />

        {uploads.length > 0 && (
          <div className="space-y-4">
            <UploadProgressList
              uploads={uploads}
              onCancel={cancelUpload}
              onRetry={retryUpload}
            />
            {uploads.some((u) => u.status === 'completed') && (
              <button
                onClick={clearCompleted}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Limpiar completados
              </button>
            )}
          </div>
        )}

        {selectedFiles.length > 0 && uploads.length === 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">{selectedFiles.length}</span> archivo
              {selectedFiles.length > 1 ? 's' : ''} seleccionado
              {selectedFiles.length > 1 ? 's' : ''} como{' '}
              <span className="font-medium capitalize">{documentType}</span>
            </p>
            <button
              onClick={handleUpload}
              disabled={!documentType || isUploading || isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Subir {selectedFiles.length > 1 ? 'archivos' : 'archivo'}
            </button>
          </div>
        )}
      </div>

      {stats.manifiestos > 0 && stats.facturas > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">¡Listo para buscar!</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Tienes {stats.manifiestos} manifiestos y {stats.facturas} facturas cargados
                </p>
              </div>
            </div>
            <a
              href="/busqueda"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              <Search className="h-4 w-4" />
              Ir a Búsqueda
            </a>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Documentos cargados</h2>
          <button
            onClick={cargarDocumentos}
            disabled={isLoading}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        <DocumentHistory
          documents={documents}
          onView={handleViewDocument}
          onDelete={handleDeleteDocument}
          onReprocess={handleReprocessDocument}
        />
      </div>
    </div>
  )
}

export default CargarPage
