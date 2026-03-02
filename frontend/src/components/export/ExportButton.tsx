import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'

export type ExportFormat = 'pdf' | 'csv'

export interface ExportButtonProps {
  format: ExportFormat
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function ExportButton({
  format,
  onClick,
  loading = false,
  disabled = false,
  variant = 'secondary',
  size = 'md',
  label,
}: ExportButtonProps) {
  const isDisabled = disabled || loading

  const formatConfig = {
    pdf: {
      icon: <FileText className="h-4 w-4" />,
      label: label || 'Descargar PDF',
      color: 'red',
    },
    csv: {
      icon: <FileSpreadsheet className="h-4 w-4" />,
      label: label || 'Descargar CSV',
      color: 'green',
    },
  }

  const config = formatConfig[format]

  const baseClasses = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200'

  const variantClasses = {
    primary: isDisabled
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : format === 'pdf'
        ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
        : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    secondary: isDisabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : format === 'pdf'
        ? 'bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200'
        : 'bg-green-50 text-green-700 hover:bg-green-100 active:bg-green-200',
    outline: isDisabled
      ? 'border border-gray-200 text-gray-400 cursor-not-allowed'
      : format === 'pdf'
        ? 'border border-red-300 text-red-700 hover:bg-red-50 active:bg-red-100'
        : 'border border-green-300 text-green-700 hover:bg-green-50 active:bg-green-100',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        config.icon
      )}
      <span>{config.label}</span>
      {!loading && <Download className="h-3.5 w-3.5 opacity-60" />}
    </button>
  )
}

export default ExportButton
