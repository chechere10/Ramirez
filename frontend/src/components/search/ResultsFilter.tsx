import { Filter, CheckCircle, XCircle, AlertCircle, List } from 'lucide-react'

export type FilterStatus = 'all' | 'found' | 'not_found' | 'partial'

export interface ResultsFilterProps {
  value: FilterStatus
  onChange: (status: FilterStatus) => void
  counts: {
    all: number
    found: number
    notFound: number
    partial: number
  }
}

export function ResultsFilter({ value, onChange, counts }: ResultsFilterProps) {
  const filters: Array<{
    id: FilterStatus
    label: string
    icon: React.ReactNode
    count: number
    activeColor: string
    hoverColor: string
  }> = [
    {
      id: 'all',
      label: 'Todos',
      icon: <List className="h-4 w-4" />,
      count: counts.all,
      activeColor: 'bg-gray-800 text-white',
      hoverColor: 'hover:bg-gray-100',
    },
    {
      id: 'found',
      label: 'Encontrados',
      icon: <CheckCircle className="h-4 w-4" />,
      count: counts.found,
      activeColor: 'bg-green-600 text-white',
      hoverColor: 'hover:bg-green-50 hover:text-green-700',
    },
    {
      id: 'not_found',
      label: 'No encontrados',
      icon: <XCircle className="h-4 w-4" />,
      count: counts.notFound,
      activeColor: 'bg-red-600 text-white',
      hoverColor: 'hover:bg-red-50 hover:text-red-700',
    },
    {
      id: 'partial',
      label: 'Parciales',
      icon: <AlertCircle className="h-4 w-4" />,
      count: counts.partial,
      activeColor: 'bg-yellow-500 text-white',
      hoverColor: 'hover:bg-yellow-50 hover:text-yellow-700',
    },
  ]

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-gray-400 mr-1" />
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = value === filter.id
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onChange(filter.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? filter.activeColor
                  : `text-gray-600 bg-white border border-gray-200 ${filter.hoverColor}`
              }`}
            >
              {filter.icon}
              <span>{filter.label}</span>
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-xs font-semibold ${
                  isActive ? 'bg-white/20' : 'bg-gray-100'
                }`}
              >
                {filter.count.toLocaleString()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ResultsFilter
