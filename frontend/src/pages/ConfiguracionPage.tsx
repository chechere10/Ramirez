import { Palette, FileText, Bell, Database, RotateCcw, Check } from 'lucide-react'
import { useState } from 'react'
import { usePreferences } from '../hooks/usePreferences'
import { useTheme } from '../hooks/useTheme'
import { useToast } from '../hooks/useToast'
import { ColorPicker } from '../components/ui/ColorPicker'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { NormalizationConfig } from '../components/ui/NormalizationConfig'

export function ConfiguracionPage() {
  const { preferences, setPreferences, setHighlightColor, setHighlightOpacity, setNormalization, resetPreferences } = usePreferences()
  const { resolvedTheme } = useTheme()
  const toast = useToast()
  
  const [busquedaFuzzy, setBusquedaFuzzy] = useState(true)
  const [umbralSimilitud, setUmbralSimilitud] = useState(80)
  const [notificaciones, setNotificaciones] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simular guardado (las preferencias ya se guardan en localStorage automáticamente)
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsSaving(false)
    toast.success('Configuración guardada', 'Tus preferencias se han guardado correctamente')
  }

  const handleReset = () => {
    resetPreferences()
    toast.info('Configuración restaurada', 'Se han restaurado los valores por defecto')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuración</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Personaliza el comportamiento del sistema
          </p>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Restaurar configuración por defecto"
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tema */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Apariencia</h2>
          </div>

          <div className="space-y-6">
            {/* Tema */}
            <ThemeToggle />

            {/* Color de resaltado */}
            <ColorPicker
              value={preferences.highlightColor}
              onChange={setHighlightColor}
              label="Color de resaltado en PDF"
              showOpacity
              opacity={preferences.highlightOpacity}
              onOpacityChange={setHighlightOpacity}
            />
          </div>
        </div>

        {/* Normalización de códigos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Procesamiento de Códigos</h2>
          </div>

          <NormalizationConfig
            value={preferences.normalization}
            onChange={setNormalization}
          />
        </div>

        {/* Búsqueda */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Opciones de Búsqueda</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Búsqueda fuzzy</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Permite coincidencias aproximadas</p>
              </div>
              <button
                onClick={() => setBusquedaFuzzy(!busquedaFuzzy)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  busquedaFuzzy ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                role="switch"
                aria-checked={busquedaFuzzy}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    busquedaFuzzy ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {busquedaFuzzy && (
              <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Umbral de similitud: {umbralSimilitud}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={umbralSimilitud}
                  onChange={(e) => setUmbralSimilitud(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  aria-label="Umbral de similitud"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>50% (más flexible)</span>
                  <span>100% (exacto)</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Resultados por página</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cantidad de resultados en tablas</p>
              </div>
              <select
                value={preferences.defaultPageSize}
                onChange={(e) => setPreferences({ defaultPageSize: Number(e.target.value) })}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500"
                aria-label="Resultados por página"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notificaciones</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notificaciones activas</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Recibir alertas de procesamiento</p>
              </div>
              <button
                onClick={() => setNotificaciones(!notificaciones)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificaciones ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                role="switch"
                aria-checked={notificaciones}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    notificaciones ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Expandir resultados automáticamente</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Mostrar detalles al completar búsqueda</p>
              </div>
              <button
                onClick={() => setPreferences({ autoExpandResults: !preferences.autoExpandResults })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.autoExpandResults ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                role="switch"
                aria-checked={preferences.autoExpandResults}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    preferences.autoExpandResults ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sistema Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Información del Sistema</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Versión</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">1.0.0</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Tema actual</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 capitalize">{resolvedTheme}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Estado</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-sm text-gray-600 dark:text-gray-300">Operativo</span>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Preferencias</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Local</p>
          </div>
        </div>
      </div>

      {/* Guardar */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Guardando...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default ConfiguracionPage
