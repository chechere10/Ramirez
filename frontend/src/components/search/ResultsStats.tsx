import { BarChart3, CheckCircle, XCircle, AlertCircle, Percent, TrendingUp } from 'lucide-react'

export interface ResultsStatsProps {
  total: number
  found: number
  notFound: number
  partial: number
}

export function ResultsStats({ total, found, notFound, partial }: ResultsStatsProps) {
  const coveragePercent = total > 0 ? Math.round((found / total) * 100) : 0
  const partialPercent = total > 0 ? Math.round((partial / total) * 100) : 0
  const notFoundPercent = total > 0 ? Math.round((notFound / total) * 100) : 0

  const stats = [
    {
      label: 'Total procesados',
      value: total,
      icon: <BarChart3 className="h-5 w-5" />,
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      iconColor: 'text-gray-500',
    },
    {
      label: 'Encontrados',
      value: found,
      percent: coveragePercent,
      icon: <CheckCircle className="h-5 w-5" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      iconColor: 'text-green-500',
    },
    {
      label: 'No encontrados',
      value: notFound,
      percent: notFoundPercent,
      icon: <XCircle className="h-5 w-5" />,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      iconColor: 'text-red-500',
    },
    {
      label: 'Parciales',
      value: partial,
      percent: partialPercent,
      icon: <AlertCircle className="h-5 w-5" />,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      iconColor: 'text-yellow-500',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bgColor} rounded-xl p-4 border border-gray-100`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`${stat.iconColor}`}>{stat.icon}</span>
              {stat.percent !== undefined && (
                <span className={`text-xs font-medium ${stat.textColor}`}>
                  {stat.percent}%
                </span>
              )}
            </div>
            <p className={`text-2xl font-bold ${stat.textColor}`}>
              {stat.value.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Coverage indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-700">Tasa de Cobertura</span>
          </div>
          <div className="flex items-center gap-1">
            <Percent className="h-4 w-4 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">{coveragePercent}</span>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
          {found > 0 && (
            <div
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${coveragePercent}%` }}
              title={`Encontrados: ${found}`}
            />
          )}
          {partial > 0 && (
            <div
              className="bg-yellow-400 transition-all duration-500"
              style={{ width: `${partialPercent}%` }}
              title={`Parciales: ${partial}`}
            />
          )}
          {notFound > 0 && (
            <div
              className="bg-red-400 transition-all duration-500"
              style={{ width: `${notFoundPercent}%` }}
              title={`No encontrados: ${notFound}`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">Encontrados</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="text-gray-600">Parciales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-gray-600">No encontrados</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResultsStats
