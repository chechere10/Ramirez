/**
 * Componente de Sincronización con la Nube
 * Muestra estado de conexión y permite sincronizar datos
 */
import { useState, useEffect } from 'react'
import { Cloud, CloudOff, RefreshCw, Upload, Download, Loader2 } from 'lucide-react'
import { minioSync } from '../services/minioSync'

interface SyncButtonProps {
  compact?: boolean
}

export function SyncButton({ compact = false }: SyncButtonProps) {
  const [isOnline, setIsOnline] = useState(false)
  const [pendingChanges, setPendingChanges] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  useEffect(() => {
    const unsubscribe = minioSync.subscribe((status) => {
      setIsOnline(status.isOnline)
      setPendingChanges(status.pendingChanges)
      setLastSync(status.lastSync)
    })
    
    return unsubscribe
  }, [])

  const handleSyncToCloud = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await minioSync.syncToCloud()
      if (result.success) {
        setSyncResult({ type: 'success', message: `✓ ${result.synced.length} datos sincronizados` })
      } else {
        setSyncResult({ type: 'error', message: `Error en: ${result.failed.join(', ')}` })
      }
    } catch {
      setSyncResult({ type: 'error', message: 'Error de conexión' })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 3000)
    }
  }

  const handleSyncFromCloud = async () => {
    if (!confirm('¿Descargar datos de la nube? Esto reemplazará los datos locales.')) return
    
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await minioSync.syncFromCloud()
      if (result.success && result.synced.length > 0) {
        setSyncResult({ type: 'success', message: `✓ ${result.synced.length} datos descargados` })
        // Recargar página para mostrar nuevos datos
        setTimeout(() => window.location.reload(), 1500)
      } else if (result.synced.length === 0) {
        setSyncResult({ type: 'error', message: 'No hay datos en la nube' })
      } else {
        setSyncResult({ type: 'error', message: `Error en: ${result.failed.join(', ')}` })
      }
    } catch {
      setSyncResult({ type: 'error', message: 'Error de conexión' })
    } finally {
      setSyncing(false)
    }
  }

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca'
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  if (compact) {
    return (
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`relative p-2 rounded-lg transition-colors ${
          isOnline 
            ? 'hover:bg-green-100 dark:hover:bg-green-900/30' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title={isOnline ? 'Conectado a la nube' : 'Sin conexión'}
      >
        {isOnline ? (
          <Cloud className="h-5 w-5 text-green-600" />
        ) : (
          <CloudOff className="h-5 w-5 text-gray-400" />
        )}
        {pendingChanges && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full animate-pulse" />
        )}
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          isOnline 
            ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-400'
            : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
        }`}
      >
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isOnline ? (
          <Cloud className="h-4 w-4" />
        ) : (
          <CloudOff className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {syncing ? 'Sincronizando...' : isOnline ? 'En línea' : 'Sin conexión'}
        </span>
        {pendingChanges && !syncing && (
          <span className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Menú desplegable */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  isOnline ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {isOnline ? (
                    <Cloud className="h-5 w-5 text-green-600" />
                  ) : (
                    <CloudOff className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {isOnline ? 'Conectado a MinIO' : 'Sin conexión'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Última sync: {formatLastSync(lastSync)}
                  </p>
                </div>
              </div>
            </div>

            {syncResult && (
              <div className={`px-4 py-2 text-sm ${
                syncResult.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {syncResult.message}
              </div>
            )}

            <div className="p-2">
              <button
                onClick={handleSyncToCloud}
                disabled={!isOnline || syncing}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Subir a la nube</p>
                  <p className="text-xs text-gray-500">Guardar datos locales en MinIO</p>
                </div>
              </button>

              <button
                onClick={handleSyncFromCloud}
                disabled={!isOnline || syncing}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 text-green-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Descargar de la nube</p>
                  <p className="text-xs text-gray-500">Obtener datos desde MinIO</p>
                </div>
              </button>

              <button
                onClick={() => minioSync.checkConnection()}
                disabled={syncing}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4 text-gray-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Verificar conexión</p>
                  <p className="text-xs text-gray-500">Comprobar estado de MinIO</p>
                </div>
              </button>
            </div>

            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Los datos se sincronizan automáticamente
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
