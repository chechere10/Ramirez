import { useState, useEffect, useCallback } from 'react'

// Tipos de preferencias
export interface NormalizationSettings {
  removeSpaces: boolean
  removeHyphens: boolean
  removeLeadingZeros: boolean
  toUpperCase: boolean
  trimWhitespace: boolean
}

export interface UserPreferences {
  // Tema
  theme: 'light' | 'dark' | 'system'
  
  // Colores de resaltado
  highlightColor: string
  highlightOpacity: number
  
  // Normalización de códigos
  normalization: NormalizationSettings
  
  // Configuración de vista
  defaultPageSize: number
  showCodePreview: boolean
  autoExpandResults: boolean
  
  // Exportación
  defaultExportFormat: 'pdf' | 'csv'
  includeStatsInExport: boolean
  
  // PDF Viewer
  defaultZoom: number
  fitToWidth: boolean
}

// Valores por defecto
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  highlightColor: '#FFEB3B',
  highlightOpacity: 50,
  normalization: {
    removeSpaces: true,
    removeHyphens: true,
    removeLeadingZeros: false,
    toUpperCase: true,
    trimWhitespace: true,
  },
  defaultPageSize: 20,
  showCodePreview: true,
  autoExpandResults: false,
  defaultExportFormat: 'pdf',
  includeStatsInExport: true,
  defaultZoom: 100,
  fitToWidth: true,
}

// Colores predefinidos para resaltado
export const HIGHLIGHT_COLORS = [
  { name: 'Amarillo', value: '#FFEB3B' },
  { name: 'Verde', value: '#4CAF50' },
  { name: 'Azul', value: '#2196F3' },
  { name: 'Naranja', value: '#FF9800' },
  { name: 'Rosa', value: '#E91E63' },
  { name: 'Púrpura', value: '#9C27B0' },
  { name: 'Cyan', value: '#00BCD4' },
  { name: 'Rojo', value: '#F44336' },
]

const STORAGE_KEY = 'manifesto_user_preferences'

export function usePreferences() {
  const [preferences, setPreferencesState] = useState<UserPreferences>(() => {
    // Cargar desde localStorage al inicializar
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          return { ...DEFAULT_PREFERENCES, ...parsed }
        } catch {
          return DEFAULT_PREFERENCES
        }
      }
    }
    return DEFAULT_PREFERENCES
  })

  // Guardar en localStorage cuando cambien las preferencias
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences])

  // Aplicar tema al documento
  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (preferences.theme === 'dark' || (preferences.theme === 'system' && prefersDark)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [preferences.theme])

  // Funciones para actualizar preferencias
  const setPreferences = useCallback((newPrefs: Partial<UserPreferences>) => {
    setPreferencesState(prev => ({ ...prev, ...newPrefs }))
  }, [])

  const setTheme = useCallback((theme: UserPreferences['theme']) => {
    setPreferences({ theme })
  }, [setPreferences])

  const setHighlightColor = useCallback((color: string) => {
    setPreferences({ highlightColor: color })
  }, [setPreferences])

  const setHighlightOpacity = useCallback((opacity: number) => {
    setPreferences({ highlightOpacity: Math.min(100, Math.max(0, opacity)) })
  }, [setPreferences])

  const setNormalization = useCallback((settings: Partial<NormalizationSettings>) => {
    setPreferencesState(prev => ({
      ...prev,
      normalization: { ...prev.normalization, ...settings },
    }))
  }, [])

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES)
  }, [])

  // Función para normalizar un código según las preferencias
  const normalizeCode = useCallback((code: string): string => {
    let result = code
    const { normalization } = preferences

    if (normalization.trimWhitespace) {
      result = result.trim()
    }
    if (normalization.removeSpaces) {
      result = result.replace(/\s+/g, '')
    }
    if (normalization.removeHyphens) {
      result = result.replace(/-/g, '')
    }
    if (normalization.removeLeadingZeros) {
      result = result.replace(/^0+/, '')
    }
    if (normalization.toUpperCase) {
      result = result.toUpperCase()
    }

    return result
  }, [preferences])

  return {
    preferences,
    setPreferences,
    setTheme,
    setHighlightColor,
    setHighlightOpacity,
    setNormalization,
    resetPreferences,
    normalizeCode,
  }
}

// Hook singleton para compartir preferencias globalmente
let globalPreferences: UserPreferences = DEFAULT_PREFERENCES
let listeners: Array<(prefs: UserPreferences) => void> = []

export function getPreferences(): UserPreferences {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        globalPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
      } catch {
        // Usar defaults
      }
    }
  }
  return globalPreferences
}

export function subscribeToPreferences(listener: (prefs: UserPreferences) => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}
