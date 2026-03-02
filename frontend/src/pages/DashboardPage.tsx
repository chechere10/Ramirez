import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Upload,
  BarChart3,
  AlertCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'

// Datos de ejemplo (después se conectarán con la API)
const stats = [
  {
    name: 'Documentos Procesados',
    value: '24',
    change: '+12%',
    changeType: 'positive' as const,
    icon: FileText,
    color: 'bg-blue-500',
  },
  {
    name: 'Búsquedas Realizadas',
    value: '142',
    change: '+8%',
    changeType: 'positive' as const,
    icon: Search,
    color: 'bg-green-500',
  },
  {
    name: 'Códigos Encontrados',
    value: '1,234',
    change: '+23%',
    changeType: 'positive' as const,
    icon: CheckCircle,
    color: 'bg-emerald-500',
  },
  {
    name: 'Códigos No Encontrados',
    value: '89',
    change: '-5%',
    changeType: 'negative' as const,
    icon: XCircle,
    color: 'bg-red-500',
  },
]

const recentDocuments = [
  {
    id: 1,
    name: 'Manifiesto_2024_001.pdf',
    type: 'manifiesto',
    status: 'completado',
    codes: 156,
    date: '2026-01-20',
  },
  {
    id: 2,
    name: 'Factura_ABC_Corp.pdf',
    type: 'factura',
    status: 'completado',
    codes: 42,
    date: '2026-01-20',
  },
  {
    id: 3,
    name: 'Manifiesto_2024_002.pdf',
    type: 'manifiesto',
    status: 'procesando',
    codes: 0,
    date: '2026-01-20',
  },
  {
    id: 4,
    name: 'Factura_XYZ_Inc.pdf',
    type: 'factura',
    status: 'error',
    codes: 0,
    date: '2026-01-19',
  },
]

const recentSearches = [
  {
    id: 1,
    query: 'ABC-123-456',
    results: 5,
    date: '2026-01-20 14:30',
    status: 'encontrado',
  },
  {
    id: 2,
    query: 'DEF-789-012',
    results: 0,
    date: '2026-01-20 14:25',
    status: 'no_encontrado',
  },
  {
    id: 3,
    query: 'Lote: 50 códigos',
    results: 42,
    date: '2026-01-20 14:00',
    status: 'parcial',
  },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completado':
    case 'encontrado':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          <CheckCircle className="h-3 w-3" />
          {status === 'completado' ? 'Completado' : 'Encontrado'}
        </span>
      )
    case 'procesando':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
          <Clock className="h-3 w-3" />
          Procesando
        </span>
      )
    case 'error':
    case 'no_encontrado':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
          <XCircle className="h-3 w-3" />
          {status === 'error' ? 'Error' : 'No encontrado'}
        </span>
      )
    case 'parcial':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          <AlertCircle className="h-3 w-3" />
          Parcial
        </span>
      )
    default:
      return null
  }
}

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Resumen del sistema de gestión de manifiestos
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/cargar"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Cargar PDF
          </Link>
          <Link
            to="/busqueda"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Search className="h-4 w-4" />
            Nueva Búsqueda
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  stat.changeType === 'positive'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                <TrendingUp
                  className={`h-4 w-4 ${
                    stat.changeType === 'negative' ? 'rotate-180' : ''
                  }`}
                />
                {stat.change}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Documentos Recientes
            </h2>
            <Link
              to="/documentos"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      doc.type === 'manifiesto' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}
                  >
                    <FileText
                      className={`h-5 w-5 ${
                        doc.type === 'manifiesto'
                          ? 'text-blue-600'
                          : 'text-purple-600'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.codes > 0 ? `${doc.codes} códigos` : 'Sin procesar'} •{' '}
                      {doc.date}
                    </p>
                  </div>
                </div>
                {getStatusBadge(doc.status)}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Searches */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Búsquedas Recientes
            </h2>
            <Link
              to="/historial"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver historial →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <Search className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {search.query}
                    </p>
                    <p className="text-xs text-gray-500">
                      {search.results} resultados • {search.date}
                    </p>
                  </div>
                </div>
                {getStatusBadge(search.status)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/cargar"
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <div className="p-3 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Cargar Manifiesto</p>
              <p className="text-sm text-gray-500">Subir nuevo PDF</p>
            </div>
          </Link>

          <Link
            to="/busqueda"
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors group"
          >
            <div className="p-3 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
              <Search className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Buscar Códigos</p>
              <p className="text-sm text-gray-500">Cruzar con factura</p>
            </div>
          </Link>

          <Link
            to="/reportes"
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
          >
            <div className="p-3 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Generar Reporte</p>
              <p className="text-sm text-gray-500">Excel o PDF</p>
            </div>
          </Link>

          <Link
            to="/documentos"
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors group"
          >
            <div className="p-3 rounded-lg bg-orange-100 group-hover:bg-orange-200 transition-colors">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Ver Documentos</p>
              <p className="text-sm text-gray-500">Gestionar archivos</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
