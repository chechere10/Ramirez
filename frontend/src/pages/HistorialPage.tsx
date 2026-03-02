import { Search, Calendar, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react'

const historialBusquedas = [
  {
    id: 1,
    fecha: '2026-01-20 14:30',
    codigos: 50,
    encontrados: 42,
    noEncontrados: 8,
    manifiesto: 'Manifiesto_2024_001.pdf',
    duracion: '2.3s',
  },
  {
    id: 2,
    fecha: '2026-01-20 12:15',
    codigos: 25,
    encontrados: 25,
    noEncontrados: 0,
    manifiesto: 'Manifiesto_2024_001.pdf',
    duracion: '1.1s',
  },
  {
    id: 3,
    fecha: '2026-01-19 16:45',
    codigos: 100,
    encontrados: 85,
    noEncontrados: 15,
    manifiesto: 'Todos los manifiestos',
    duracion: '4.7s',
  },
  {
    id: 4,
    fecha: '2026-01-19 10:30',
    codigos: 10,
    encontrados: 8,
    noEncontrados: 2,
    manifiesto: 'Manifiesto_2024_002.pdf',
    duracion: '0.8s',
  },
]

export function HistorialPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Búsquedas</h1>
          <p className="text-gray-500 mt-1">
            Revisa y repite búsquedas anteriores
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
          <Search className="h-4 w-4" />
          Nueva Búsqueda
        </button>
      </div>

      {/* Tabla de historial */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manifiesto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Códigos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resultados
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duración
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {historialBusquedas.map((busqueda) => (
              <tr key={busqueda.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {busqueda.fecha}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {busqueda.manifiesto}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {busqueda.codigos}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {busqueda.encontrados}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-red-600">
                      <XCircle className="h-4 w-4" />
                      {busqueda.noEncontrados}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {busqueda.duracion}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver detalles">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Repetir búsqueda">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default HistorialPage
