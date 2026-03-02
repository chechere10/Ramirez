import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

interface ThemeToggleProps {
  showLabel?: boolean
  compact?: boolean
}

export function ThemeToggle({ showLabel = true, compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Oscuro', icon: Moon },
    { value: 'system' as const, label: 'Sistema', icon: Monitor },
  ]

  if (compact) {
    // Versión compacta - solo iconos
    return (
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {themes.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`
                p-2 rounded-md transition-all
                ${theme === t.value
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
              title={t.label}
              aria-label={`Tema ${t.label}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tema de la aplicación
        </label>
      )}
      
      <div className="grid grid-cols-3 gap-2">
        {themes.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                ${theme === t.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {theme === 'system'
          ? 'Se ajusta automáticamente según la configuración de tu sistema operativo.'
          : theme === 'dark'
          ? 'Modo oscuro para reducir la fatiga visual en ambientes con poca luz.'
          : 'Modo claro ideal para ambientes bien iluminados.'}
      </p>
    </div>
  )
}
