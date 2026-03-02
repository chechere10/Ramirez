import { FileText, Receipt, Check } from 'lucide-react'

export type DocumentType = 'manifiesto' | 'factura'

export interface DocumentTypeSelectorProps {
  value: DocumentType | null
  onChange: (type: DocumentType) => void
  disabled?: boolean
}

const typeOptions: {
  value: DocumentType
  label: string
  description: string
  icon: typeof FileText
  color: string
  bgColor: string
  borderColor: string
  selectedBg: string
}[] = [
  {
    value: 'manifiesto',
    label: 'Manifiesto',
    description: 'Documento con lista de códigos a verificar',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    selectedBg: 'bg-blue-50',
  },
  {
    value: 'factura',
    label: 'Factura',
    description: 'Documento con códigos a buscar en manifiestos',
    icon: Receipt,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
    selectedBg: 'bg-purple-50',
  },
]

export function DocumentTypeSelector({
  value,
  onChange,
  disabled = false,
}: DocumentTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Tipo de documento
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {typeOptions.map((option) => {
          const isSelected = value === option.value
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={`
                relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                ${
                  isSelected
                    ? `${option.borderColor} ${option.selectedBg}`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              {/* Check mark */}
              {isSelected && (
                <div
                  className={`absolute top-3 right-3 p-0.5 rounded-full ${option.bgColor}`}
                >
                  <Check className={`h-4 w-4 ${option.color}`} />
                </div>
              )}

              {/* Icon */}
              <div
                className={`p-3 rounded-lg flex-shrink-0 ${
                  isSelected ? option.bgColor : 'bg-gray-100'
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${isSelected ? option.color : 'text-gray-500'}`}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-semibold ${
                    isSelected ? option.color : 'text-gray-900'
                  }`}
                >
                  {option.label}
                </p>
                <p className="text-sm text-gray-500 mt-1">{option.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Versión compacta inline
export interface DocumentTypeSelectorInlineProps {
  value: DocumentType | null
  onChange: (type: DocumentType) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function DocumentTypeSelectorInline({
  value,
  onChange,
  disabled = false,
  size = 'md',
}: DocumentTypeSelectorInlineProps) {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-3 py-2',
  }

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
      {typeOptions.map((option) => {
        const isSelected = value === option.value
        const Icon = option.icon

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={`
              inline-flex items-center gap-1.5 rounded-md font-medium transition-all
              ${sizeClasses[size]}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${
                isSelected
                  ? `${option.bgColor} ${option.color} shadow-sm`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            <Icon className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default DocumentTypeSelector
