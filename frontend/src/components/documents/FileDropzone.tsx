import { useCallback, useState } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'

export interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  maxSizeMB?: number
  acceptedTypes?: string[]
  disabled?: boolean
}

interface FileError {
  file: File
  error: string
}

export function FileDropzone({
  onFilesSelected,
  maxFiles = 10,
  maxSizeMB = 50,
  acceptedTypes = ['application/pdf'],
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<FileError[]>([])
  const [validFiles, setValidFiles] = useState<File[]>([])

  const validateFile = useCallback(
    (file: File): string | null => {
      // Validar tipo de archivo
      if (!acceptedTypes.includes(file.type)) {
        return `Tipo de archivo no permitido. Solo se aceptan: ${acceptedTypes
          .map((t) => t.split('/')[1].toUpperCase())
          .join(', ')}`
      }

      // Validar tamaño
      const sizeMB = file.size / (1024 * 1024)
      if (sizeMB > maxSizeMB) {
        return `Archivo muy grande (${sizeMB.toFixed(1)}MB). Máximo: ${maxSizeMB}MB`
      }

      return null
    },
    [acceptedTypes, maxSizeMB]
  )

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const newErrors: FileError[] = []
      const newValidFiles: File[] = []

      // Limitar cantidad de archivos
      const filesToProcess = fileArray.slice(0, maxFiles)
      if (fileArray.length > maxFiles) {
        newErrors.push({
          file: fileArray[maxFiles],
          error: `Solo se permiten máximo ${maxFiles} archivos a la vez`,
        })
      }

      filesToProcess.forEach((file) => {
        const error = validateFile(file)
        if (error) {
          newErrors.push({ file, error })
        } else {
          newValidFiles.push(file)
        }
      })

      setErrors(newErrors)
      setValidFiles(newValidFiles)

      if (newValidFiles.length > 0) {
        onFilesSelected(newValidFiles)
      }
    },
    [maxFiles, validateFile, onFilesSelected]
  )

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const { files } = e.dataTransfer
      if (files && files.length > 0) {
        processFiles(files)
      }
    },
    [disabled, processFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target
      if (files && files.length > 0) {
        processFiles(files)
      }
      // Reset input para permitir seleccionar el mismo archivo
      e.target.value = ''
    },
    [processFiles]
  )

  const removeValidFile = useCallback(
    (index: number) => {
      const newFiles = validFiles.filter((_, i) => i !== index)
      setValidFiles(newFiles)
      if (newFiles.length > 0) {
        onFilesSelected(newFiles)
      }
    },
    [validFiles, onFilesSelected]
  )

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Dropzone Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/50'}
          ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 bg-white'}
        `}
      >
        <input
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={maxFiles > 1}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Seleccionar archivos PDF"
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={`
              p-4 rounded-full transition-colors
              ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}
            `}
          >
            <Upload
              className={`h-10 w-10 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`}
            />
          </div>

          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragging ? (
                'Suelta los archivos aquí'
              ) : (
                <>
                  Arrastra tus PDFs aquí o{' '}
                  <span className="text-blue-600">haz clic para seleccionar</span>
                </>
              )}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              PDF hasta {maxSizeMB}MB • Máximo {maxFiles} archivo{maxFiles > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Errores de validación */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Errores de validación</span>
            </div>
            <button
              onClick={clearErrors}
              className="text-red-500 hover:text-red-700"
              aria-label="Cerrar errores"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="text-sm text-red-600">
                <span className="font-medium">{err.file.name}:</span> {err.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Archivos válidos seleccionados */}
      {validFiles.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 mb-3">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">
              {validFiles.length} archivo{validFiles.length > 1 ? 's' : ''} listo
              {validFiles.length > 1 ? 's' : ''} para cargar
            </span>
          </div>
          <ul className="space-y-2">
            {validFiles.map((file, i) => (
              <li
                key={i}
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-green-100"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeValidFile(i)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  aria-label={`Eliminar ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default FileDropzone
