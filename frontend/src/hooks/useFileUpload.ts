import { useState, useCallback, useRef } from 'react'
import type { UploadStatus, UploadItem } from '../components/documents/UploadProgress'
import type { DocumentType } from '../components/documents/DocumentTypeSelector'

export interface UploadOptions {
  documentType: DocumentType
  onUploadComplete?: (result: UploadResult) => void
  onUploadError?: (error: Error, file: File) => void
}

export interface UploadResult {
  id: string
  fileName: string
  documentType: DocumentType
  pageCount?: number
  codesExtracted?: number
}

export interface UseFileUploadReturn {
  uploads: UploadItem[]
  isUploading: boolean
  uploadFiles: (files: File[], options: UploadOptions) => Promise<void>
  cancelUpload: (id: string) => void
  retryUpload: (id: string) => void
  clearCompleted: () => void
  clearAll: () => void
}

// Simular delay para demo
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Generar ID único
const generateId = () => `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export function useFileUpload(): UseFileUploadReturn {
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  const fileCache = useRef<Map<string, { file: File; options: UploadOptions }>>(new Map())

  const updateUpload = useCallback((id: string, updates: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((upload) => (upload.id === id ? { ...upload, ...updates } : upload))
    )
  }, [])

  const simulateUpload = useCallback(
    async (
      id: string,
      file: File,
      options: UploadOptions,
      signal: AbortSignal
    ): Promise<UploadResult> => {
      // Fase 1: Subiendo archivo (0-60%)
      for (let progress = 0; progress <= 60; progress += 10) {
        if (signal.aborted) throw new Error('Upload cancelled')
        await delay(200 + Math.random() * 300)
        updateUpload(id, { progress, status: 'uploading' })
      }

      // Fase 2: Procesando (60-100%)
      updateUpload(id, { status: 'processing', progress: 60 })

      for (let progress = 60; progress <= 100; progress += 8) {
        if (signal.aborted) throw new Error('Upload cancelled')
        await delay(300 + Math.random() * 400)
        updateUpload(id, { progress })
      }

      // Simular resultado
      const result: UploadResult = {
        id: generateId(),
        fileName: file.name,
        documentType: options.documentType,
        pageCount: Math.floor(Math.random() * 50) + 1,
        codesExtracted: Math.floor(Math.random() * 200) + 10,
      }

      updateUpload(id, { status: 'completed', progress: 100 })
      return result
    },
    [updateUpload]
  )

  const uploadSingleFile = useCallback(
    async (file: File, options: UploadOptions): Promise<string> => {
      const id = generateId()
      const controller = new AbortController()

      abortControllers.current.set(id, controller)
      fileCache.current.set(id, { file, options })

      // Añadir a la lista de uploads
      setUploads((prev) => [
        ...prev,
        {
          id,
          fileName: file.name,
          fileSize: file.size,
          status: 'idle' as UploadStatus,
          progress: 0,
        },
      ])

      try {
        const result = await simulateUpload(id, file, options, controller.signal)
        options.onUploadComplete?.(result)
      } catch (error) {
        if (error instanceof Error && error.message !== 'Upload cancelled') {
          updateUpload(id, {
            status: 'error',
            errorMessage: error.message || 'Error al subir el archivo',
          })
          options.onUploadError?.(error, file)
        }
      } finally {
        abortControllers.current.delete(id)
      }

      return id
    },
    [simulateUpload, updateUpload]
  )

  const uploadFiles = useCallback(
    async (files: File[], options: UploadOptions): Promise<void> => {
      // Subir archivos en paralelo (máximo 3 a la vez)
      const chunkSize = 3
      for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize)
        await Promise.all(chunk.map((file) => uploadSingleFile(file, options)))
      }
    },
    [uploadSingleFile]
  )

  const cancelUpload = useCallback((id: string) => {
    const controller = abortControllers.current.get(id)
    if (controller) {
      controller.abort()
      abortControllers.current.delete(id)
    }
    setUploads((prev) => prev.filter((upload) => upload.id !== id))
    fileCache.current.delete(id)
  }, [])

  const retryUpload = useCallback(
    async (id: string) => {
      const cached = fileCache.current.get(id)
      if (!cached) return

      // Resetear estado
      updateUpload(id, { status: 'idle', progress: 0, errorMessage: undefined })

      const controller = new AbortController()
      abortControllers.current.set(id, controller)

      try {
        const result = await simulateUpload(id, cached.file, cached.options, controller.signal)
        cached.options.onUploadComplete?.(result)
      } catch (error) {
        if (error instanceof Error && error.message !== 'Upload cancelled') {
          updateUpload(id, {
            status: 'error',
            errorMessage: error.message || 'Error al subir el archivo',
          })
          cached.options.onUploadError?.(error, cached.file)
        }
      } finally {
        abortControllers.current.delete(id)
      }
    },
    [simulateUpload, updateUpload]
  )

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((upload) => upload.status !== 'completed'))
  }, [])

  const clearAll = useCallback(() => {
    // Cancelar todos los uploads activos
    abortControllers.current.forEach((controller) => controller.abort())
    abortControllers.current.clear()
    fileCache.current.clear()
    setUploads([])
  }, [])

  const isUploading = uploads.some(
    (upload) => upload.status === 'uploading' || upload.status === 'processing'
  )

  return {
    uploads,
    isUploading,
    uploadFiles,
    cancelUpload,
    retryUpload,
    clearCompleted,
    clearAll,
  }
}

export default useFileUpload
