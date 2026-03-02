import { 
  Users, 
  Search, 
  Plus, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  Edit,
  Trash2,
  X,
  Save
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks'

export interface Cliente {
  id: string
  nombre: string
  nit: string
  telefono: string
  email: string
  departamento: string
  ciudad: string
  direccion: string
  fechaCreacion: string
  totalDocumentos: number
}

// Datos de ejemplo
const clientesIniciales: Cliente[] = [
  {
    id: '1',
    nombre: 'Distribuidora Cali S.A.S',
    nit: '900.123.456-7',
    telefono: '+57 2 555 1234',
    email: 'contacto@distcali.com',
    departamento: 'Valle del Cauca',
    ciudad: 'Cali',
    direccion: 'Calle 5 #23-45',
    fechaCreacion: '2026-01-15',
    totalDocumentos: 2,
  },
  {
    id: '2',
    nombre: 'Importaciones Barranquilla Ltda',
    nit: '800.987.654-3',
    telefono: '+57 5 333 9876',
    email: 'ventas@impbarranquilla.co',
    departamento: 'Atlántico',
    ciudad: 'Barranquilla',
    direccion: 'Carrera 54 #72-10',
    fechaCreacion: '2026-01-10',
    totalDocumentos: 1,
  },
  {
    id: '3',
    nombre: 'ETC Logística',
    nit: '901.555.888-2',
    telefono: '+57 1 444 5555',
    email: 'info@etclogistica.com',
    departamento: 'Cundinamarca',
    ciudad: 'Bogotá',
    direccion: 'Av. El Dorado #68-51',
    fechaCreacion: '2026-01-08',
    totalDocumentos: 1,
  },
]

const departamentosColombia = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 
  'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 
  'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 
  'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 
  'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 
  'Valle del Cauca', 'Vaupés', 'Vichada'
]

interface FormCliente {
  nombre: string
  nit: string
  telefono: string
  email: string
  departamento: string
  ciudad: string
  direccion: string
}

const formVacio: FormCliente = {
  nombre: '',
  nit: '',
  telefono: '',
  email: '',
  departamento: '',
  ciudad: '',
  direccion: '',
}

export function ClientesPage() {
  // Hook de autenticación
  const { isAdmin } = useAuth()
  // Hook de notificaciones
  const toast = useToast()
  
  // Función para ordenar clientes alfabéticamente
  const ordenarAlfabeticamente = (lista: Cliente[]) => {
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  }

  // Cargar clientes desde localStorage (sin datos de ejemplo)
  const [clientes, setClientes] = useState<Cliente[]>(() => {
    try {
      const saved = localStorage.getItem('manifesto_clientes')
      console.log('🔍 Cargando clientes desde localStorage:', saved)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          console.log('✅ Clientes cargados:', parsed.length)
          return ordenarAlfabeticamente(parsed)
        }
      }
    } catch (e) {
      console.error('❌ Error cargando localStorage:', e)
    }
    console.log('⚠️ Iniciando con lista vacía de clientes')
    return []
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [formData, setFormData] = useState<FormCliente>(formVacio)
  const [errores, setErrores] = useState<Partial<FormCliente>>({})

  // Guardar clientes en localStorage cuando cambien
  useEffect(() => {
    console.log('💾 Guardando clientes en localStorage:', clientes.length)
    localStorage.setItem('manifesto_clientes', JSON.stringify(clientes))
  }, [clientes])

  // Filtrar clientes
  const clientesFiltrados = clientes.filter((cliente) => {
    const termino = searchTerm.toLowerCase()
    return (
      cliente.nombre.toLowerCase().includes(termino) ||
      cliente.nit.toLowerCase().includes(termino) ||
      cliente.departamento.toLowerCase().includes(termino) ||
      cliente.email.toLowerCase().includes(termino)
    )
  })

  // Validar formulario
  const validarFormulario = (): boolean => {
    const nuevosErrores: Partial<FormCliente> = {}
    
    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio'
    }
    if (!formData.nit.trim()) {
      nuevosErrores.nit = 'El NIT es obligatorio'
    }
    if (!formData.telefono.trim()) {
      nuevosErrores.telefono = 'El teléfono es obligatorio'
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nuevosErrores.email = 'Correo inválido'
    }
    if (!formData.departamento) {
      nuevosErrores.departamento = 'Selecciona un departamento'
    }
    if (!formData.ciudad.trim()) {
      nuevosErrores.ciudad = 'La ciudad es obligatoria'
    }
    if (!formData.direccion.trim()) {
      nuevosErrores.direccion = 'La dirección es obligatoria'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  // Guardar cliente (crear o editar)
  const guardarCliente = () => {
    if (!validarFormulario()) return

    if (clienteEditando) {
      // Editar existente y reordenar
      setClientes(prev => ordenarAlfabeticamente(prev.map(c => 
        c.id === clienteEditando.id 
          ? { ...c, ...formData }
          : c
      )))
    } else {
      // Crear nuevo y ordenar alfabéticamente
      const nuevoCliente: Cliente = {
        id: Date.now().toString(),
        ...formData,
        fechaCreacion: new Date().toISOString().split('T')[0],
        totalDocumentos: 0,
      }
      setClientes(prev => ordenarAlfabeticamente([...prev, nuevoCliente]))
    }

    cerrarFormulario()
  }

  // Abrir formulario para editar
  const editarCliente = (cliente: Cliente) => {
    if (!isAdmin) {
      toast.error('Acceso denegado', 'Solo los administradores pueden editar clientes')
      return
    }
    setClienteEditando(cliente)
    setFormData({
      nombre: cliente.nombre,
      nit: cliente.nit,
      telefono: cliente.telefono,
      email: cliente.email,
      departamento: cliente.departamento,
      ciudad: cliente.ciudad || '',
      direccion: cliente.direccion,
    })
    setMostrarFormulario(true)
  }

  // Eliminar cliente
  const eliminarCliente = async (id: string) => {
    if (!isAdmin) {
      toast.error('Acceso denegado', 'Solo los administradores pueden eliminar clientes')
      return
    }
    const cliente = clientes.find(c => c.id === id)
    const confirmacion = await toast.confirm({
      title: 'Eliminar Cliente',
      message: `¿Estás seguro de eliminar a "${cliente?.nombre}"?\n\nSe perderán todos sus documentos asociados.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    })
    if (confirmacion) {
      setClientes(prev => prev.filter(c => c.id !== id))
      toast.success('Cliente eliminado', `${cliente?.nombre} ha sido eliminado`)
    }
  }

  // Cerrar formulario
  const cerrarFormulario = () => {
    setMostrarFormulario(false)
    setClienteEditando(null)
    setFormData(formVacio)
    setErrores({})
  }

  // Abrir formulario para nuevo cliente
  const nuevoCliente = () => {
    setClienteEditando(null)
    setFormData(formVacio)
    setMostrarFormulario(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clientes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestiona la información de tus clientes
          </p>
        </div>
        <button
          onClick={nuevoCliente}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, NIT, departamento o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Modal de formulario */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {clienteEditando ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button
                onClick={cerrarFormulario}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Formulario */}
            <div className="p-6 space-y-4">
              {/* Nombre de empresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Distribuidora XYZ S.A.S"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errores.nombre ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errores.nombre && <p className="text-red-500 text-xs mt-1">{errores.nombre}</p>}
              </div>

              {/* NIT y Teléfono en fila */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    NIT *
                  </label>
                  <input
                    type="text"
                    value={formData.nit}
                    onChange={(e) => setFormData(prev => ({ ...prev, nit: e.target.value }))}
                    placeholder="Ej: 900.123.456-7"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                      errores.nit ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errores.nit && <p className="text-red-500 text-xs mt-1">{errores.nit}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Ej: +57 1 234 5678"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                      errores.telefono ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errores.telefono && <p className="text-red-500 text-xs mt-1">{errores.telefono}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Correo Electrónico (opcional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Ej: contacto@empresa.com"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errores.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errores.email && <p className="text-red-500 text-xs mt-1">{errores.email}</p>}
              </div>

              {/* Departamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Departamento *
                </label>
                <select
                  value={formData.departamento}
                  onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errores.departamento ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Seleccionar departamento...</option>
                  {departamentosColombia.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
                {errores.departamento && <p className="text-red-500 text-xs mt-1">{errores.departamento}</p>}
              </div>

              {/* Ciudad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  Ciudad *
                </label>
                <input
                  type="text"
                  value={formData.ciudad}
                  onChange={(e) => setFormData(prev => ({ ...prev, ciudad: e.target.value }))}
                  placeholder="Ej: Cali, Bogotá, Medellín..."
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errores.ciudad ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errores.ciudad && <p className="text-red-500 text-xs mt-1">{errores.ciudad}</p>}
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dirección *
                </label>
                <textarea
                  value={formData.direccion}
                  onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                  placeholder="Ej: Calle 123 #45-67, Barrio Centro"
                  rows={2}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none ${
                    errores.direccion ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errores.direccion && <p className="text-red-500 text-xs mt-1">{errores.direccion}</p>}
              </div>
            </div>

            {/* Footer del modal */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={cerrarFormulario}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCliente}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                {clienteEditando ? 'Guardar Cambios' : 'Crear Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      {clientesFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm ? 'Intenta con otro término de búsqueda' : 'Crea tu primer cliente para comenzar a organizar tus manifiestos'}
          </p>
          {!searchTerm && (
            <button
              onClick={nuevoCliente}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Crear Primer Cliente
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '300px' }}>
          <div className="overflow-auto flex-1 divide-y divide-gray-200 dark:divide-gray-700">
            {clientesFiltrados.map((cliente) => (
              <div
                key={cliente.id}
                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Info principal */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
                      <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {cliente.nombre}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                          NIT: {cliente.nit}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {cliente.telefono}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {cliente.departamento}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {cliente.totalDocumentos} docs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones - Solo admin puede editar/eliminar */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => editarCliente(cliente)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Editar cliente (Solo Admin)"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminarCliente(cliente.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Eliminar cliente (Solo Admin)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientesPage
