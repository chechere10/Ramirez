/**
 * Servicio de sincronización con MinIO a través del Backend
 * Permite almacenar y recuperar datos desde cualquier dispositivo
 * Usa proxy de Vite - funciona con un solo túnel ngrok
 */

// Siempre usar rutas relativas - Vite hace proxy a /api
const SYNC_ENDPOINT = '/api/sync'

// Claves de datos que sincronizamos
const SYNC_KEYS = [
  'manifesto_clientes',
  'manifesto_inventario', 
  'manifesto_proveedores',
  'manifesto_pedidos_entrada',
  'manifesto_facturas_ventas',
  'manifesto_config_empresa'
]

interface SyncStatus {
  lastSync: string | null
  isOnline: boolean
  pendingChanges: boolean
}

class MinioSyncService {
  private syncStatus: SyncStatus = {
    lastSync: null,
    isOnline: false,
    pendingChanges: false
  }
  
  private listeners: Set<(status: SyncStatus) => void> = new Set()

  constructor() {
    this.checkConnection()
    // Verificar conexión cada 30 segundos
    setInterval(() => this.checkConnection(), 30000)
  }

  // Verificar conexión con el backend/MinIO
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${SYNC_ENDPOINT}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      this.syncStatus.isOnline = response.ok
    } catch {
      this.syncStatus.isOnline = false
    }
    this.notifyListeners()
    return this.syncStatus.isOnline
  }

  // Subir datos al servidor
  async uploadData(key: string, data: unknown): Promise<boolean> {
    try {
      const response = await fetch(`${SYNC_ENDPOINT}/upload/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(10000)
      })
      
      if (response.ok) {
        this.syncStatus.lastSync = new Date().toISOString()
        this.syncStatus.pendingChanges = false
        this.notifyListeners()
        return true
      }
      return false
    } catch (error) {
      console.error(`Error subiendo ${key}:`, error)
      this.syncStatus.pendingChanges = true
      this.notifyListeners()
      return false
    }
  }

  // Descargar datos del servidor
  async downloadData<T>(key: string): Promise<T | null> {
    try {
      const response = await fetch(`${SYNC_ENDPOINT}/download/${key}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      })
      
      if (response.ok) {
        return await response.json()
      }
      return null
    } catch (error) {
      console.error(`Error descargando ${key}:`, error)
      return null
    }
  }

  // Sincronizar todos los datos locales al servidor
  async syncToCloud(): Promise<{ success: boolean; synced: string[]; failed: string[] }> {
    const synced: string[] = []
    const failed: string[] = []
    
    for (const key of SYNC_KEYS) {
      const localData = localStorage.getItem(key)
      if (localData) {
        try {
          const data = JSON.parse(localData)
          const success = await this.uploadData(key, data)
          if (success) {
            synced.push(key)
          } else {
            failed.push(key)
          }
        } catch {
          failed.push(key)
        }
      }
    }
    
    return { success: failed.length === 0, synced, failed }
  }

  // Descargar todos los datos del servidor a local
  async syncFromCloud(): Promise<{ success: boolean; synced: string[]; failed: string[] }> {
    const synced: string[] = []
    const failed: string[] = []
    
    for (const key of SYNC_KEYS) {
      try {
        const cloudData = await this.downloadData(key)
        if (cloudData) {
          localStorage.setItem(key, JSON.stringify(cloudData))
          synced.push(key)
        }
      } catch {
        failed.push(key)
      }
    }
    
    return { success: failed.length === 0, synced, failed }
  }

  // Auto-sync cuando hay cambios locales
  markLocalChange(key: string) {
    if (SYNC_KEYS.includes(key)) {
      this.syncStatus.pendingChanges = true
      this.notifyListeners()
      
      // Auto-sync después de 2 segundos de inactividad
      this.debounceSync(key)
    }
  }

  private syncTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
  
  private debounceSync(key: string) {
    const existing = this.syncTimeouts.get(key)
    if (existing) clearTimeout(existing)
    
    const timeout = setTimeout(async () => {
      const localData = localStorage.getItem(key)
      if (localData && this.syncStatus.isOnline) {
        try {
          await this.uploadData(key, JSON.parse(localData))
        } catch {
          console.error(`Error en auto-sync de ${key}`)
        }
      }
      this.syncTimeouts.delete(key)
    }, 2000)
    
    this.syncTimeouts.set(key, timeout)
  }

  // Suscribirse a cambios de estado
  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback)
    callback(this.syncStatus)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.syncStatus))
  }

  getStatus(): SyncStatus {
    return { ...this.syncStatus }
  }
}

// Singleton
export const minioSync = new MinioSyncService()

// Hook wrapper para interceptar localStorage
export function setupLocalStorageSync() {
  const originalSetItem = localStorage.setItem.bind(localStorage)
  
  localStorage.setItem = (key: string, value: string) => {
    originalSetItem(key, value)
    minioSync.markLocalChange(key)
  }
}
