import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  AlertTriangle,
  X,
  ImageIcon,
  QrCode,
  Camera,
  Barcode,
  Printer
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks'
import { EtiquetaProducto } from '../components/EtiquetaProducto'

// Interfaz del producto mejorada
export interface Producto {
  id: string
  codigo: string // Código interno automático (PRD-001, PRD-002, etc.)
  codigoBarras: string // Código de barras (escaneado o generado)
  referencia: string // Referencia del producto
  nombre: string
  descripcion: string
  categoria: string
  imagen: string // Base64 de la imagen
  // Precios por tipo de venta
  precioUnidad: number
  precioDocena: number
  // Stock
  stockUnidades: number
  stockMinimo: number
  // Metadata
  fechaCreacion: string
  ultimaActualizacion: string
}

// Categorías predefinidas
const categoriasDefault = [
  'Electrónica',
  'Ropa',
  'Alimentos',
  'Hogar',
  'Herramientas',
  'Repuestos',
  'Oficina',
  'Otros'
]

export function InventarioPage() {
  // Hook de autenticación
  const { isAdmin } = useAuth()
  // Hook de notificaciones
  const toast = useToast()
  
  // Estados principales
  const [productos, setProductos] = useState<Producto[]>(() => {
    try {
      const saved = localStorage.getItem('manifesto_inventario')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      console.error('Error cargando inventario:', e)
    }
    return []
  })

  const [categorias, setCategorias] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('manifesto_categorias')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Error cargando categorías:', e)
    }
    return categoriasDefault
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [productoEtiqueta, setProductoEtiqueta] = useState<Producto | null>(null)
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    referencia: '',
    codigoBarras: '',
    imagen: '',
    precioUnidad: '',
    precioDocena: '',
    stockUnidades: '',
    stockMinimo: ''
  })

  // Estados para código de barras
  const [modoEscaneo, setModoEscaneo] = useState(false)
  const [codigoBarrasInput, setCodigoBarrasInput] = useState('')
  const [showNuevaCategoria, setShowNuevaCategoria] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  
  const inputCodigoRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem('manifesto_inventario', JSON.stringify(productos))
  }, [productos])

  useEffect(() => {
    localStorage.setItem('manifesto_categorias', JSON.stringify(categorias))
  }, [categorias])

  // Generar código automático
  const generarCodigoProducto = (): string => {
    const maxCodigo = productos.reduce((max, p) => {
      const num = parseInt(p.codigo.replace('PRD-', ''))
      return num > max ? num : max
    }, 0)
    return `PRD-${String(maxCodigo + 1).padStart(4, '0')}`
  }

  // Generar código de barras EAN-13
  const generarCodigoBarras = (): string => {
    // Prefijo de país (770 = Colombia)
    const prefijo = '770'
    // Código de empresa (aleatorio para demo)
    const empresa = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    // Código de producto (basado en cantidad)
    const producto = String(productos.length + 1).padStart(5, '0')
    // Calcular dígito de control
    const codigo = prefijo + empresa + producto
    let suma = 0
    for (let i = 0; i < 12; i++) {
      suma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3)
    }
    const digitoControl = (10 - (suma % 10)) % 10
    return codigo + digitoControl
  }

  // Manejar imagen
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.warning('Archivo muy grande', 'La imagen no debe superar 2MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imagen: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  // Modo escaneo - escuchar entrada de escáner
  useEffect(() => {
    if (modoEscaneo && inputCodigoRef.current) {
      inputCodigoRef.current.focus()
    }
  }, [modoEscaneo])

  // Filtrar productos
  const productosFiltrados = productos.filter((producto) => {
    const matchBusqueda = 
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.codigoBarras.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.referencia.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategoria = !categoriaFiltro || producto.categoria === categoriaFiltro
    return matchBusqueda && matchCategoria
  })

  // Formatear precio para mostrar
  const formatPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio)
  }

  // Formatear número con puntos de miles (para inputs)
  const formatNumeroConPuntos = (valor: string): string => {
    // Quitar todo lo que no sea número
    const soloNumeros = valor.replace(/\D/g, '')
    if (!soloNumeros) return ''
    // Formatear con puntos de miles
    return new Intl.NumberFormat('es-CO').format(parseInt(soloNumeros))
  }

  // Obtener valor numérico sin puntos
  const obtenerValorNumerico = (valor: string): string => {
    return valor.replace(/\./g, '')
  }

  // Formatear stock como docenas y unidades
  const formatStock = (unidades: number): { docenas: number; unidadesRestantes: number; texto: string } => {
    const docenas = Math.floor(unidades / 12)
    const unidadesRestantes = unidades % 12
    let texto = ''
    
    if (docenas > 0 && unidadesRestantes > 0) {
      texto = `${docenas} doc + ${unidadesRestantes} und`
    } else if (docenas > 0) {
      texto = `${docenas} docenas`
    } else {
      texto = `${unidadesRestantes} unidades`
    }
    
    return { docenas, unidadesRestantes, texto }
  }

  // Abrir modal para nuevo producto
  const handleNuevoProducto = () => {
    setProductoEditar(null)
    setFormData({
      nombre: '',
      descripcion: '',
      categoria: '',
      referencia: '',
      codigoBarras: '',
      imagen: '',
      precioUnidad: '',
      precioDocena: '',
      stockUnidades: '',
      stockMinimo: '12'
    })
    setCodigoBarrasInput('')
    setModoEscaneo(false)
    setShowModal(true)
  }

  // Abrir modal para editar
  const handleEditar = (producto: Producto) => {
    if (!isAdmin) {
      toast.error('Acceso denegado', 'Solo los administradores pueden editar productos')
      return
    }
    setProductoEditar(producto)
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      referencia: producto.referencia,
      codigoBarras: producto.codigoBarras,
      imagen: producto.imagen,
      precioUnidad: formatNumeroConPuntos(producto.precioUnidad.toString()),
      precioDocena: producto.precioDocena > 0 ? formatNumeroConPuntos(producto.precioDocena.toString()) : '',
      stockUnidades: producto.stockUnidades.toString(),
      stockMinimo: producto.stockMinimo.toString()
    })
    setCodigoBarrasInput(producto.codigoBarras)
    setShowModal(true)
  }

  // Guardar producto
  const handleGuardar = () => {
    if (!formData.nombre.trim()) {
      toast.error('Campo requerido', 'El nombre del producto es obligatorio')
      return
    }
    const precioUnidadNum = parseInt(obtenerValorNumerico(formData.precioUnidad)) || 0
    if (precioUnidadNum <= 0) {
      toast.error('Campo requerido', 'El precio por unidad es obligatorio')
      return
    }

    const precioDocenaNum = parseInt(obtenerValorNumerico(formData.precioDocena)) || 0
    const ahora = new Date().toISOString()
    
    if (productoEditar) {
      // Editar existente
      setProductos(prev => prev.map(p => 
        p.id === productoEditar.id 
          ? {
              ...p,
              nombre: formData.nombre,
              descripcion: formData.descripcion,
              categoria: formData.categoria,
              referencia: formData.referencia,
              codigoBarras: codigoBarrasInput || formData.codigoBarras,
              imagen: formData.imagen,
              precioUnidad: precioUnidadNum,
              precioDocena: precioDocenaNum,
              stockUnidades: parseInt(formData.stockUnidades) || 0,
              stockMinimo: parseInt(formData.stockMinimo) || 0,
              ultimaActualizacion: ahora
            }
          : p
      ))
    } else {
      // Crear nuevo
      const nuevoProducto: Producto = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        codigo: generarCodigoProducto(),
        codigoBarras: codigoBarrasInput || '',
        referencia: formData.referencia,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        categoria: formData.categoria,
        imagen: formData.imagen,
        precioUnidad: precioUnidadNum,
        precioDocena: precioDocenaNum,
        stockUnidades: parseInt(formData.stockUnidades) || 0,
        stockMinimo: parseInt(formData.stockMinimo) || 0,
        fechaCreacion: ahora,
        ultimaActualizacion: ahora
      }
      setProductos(prev => [...prev, nuevoProducto])
    }

    setShowModal(false)
  }

  // Eliminar producto
  const handleEliminar = (id: string) => {
    if (!isAdmin) {
      toast.error('Acceso denegado', 'Solo los administradores pueden eliminar productos')
      return
    }
    const producto = productos.find(p => p.id === id)
    setProductos(prev => prev.filter(p => p.id !== id))
    setShowDeleteConfirm(null)
    toast.success('Producto eliminado', `"${producto?.nombre}" ha sido eliminado del inventario`)
  }

  // Agregar nueva categoría
  const handleAgregarCategoria = () => {
    if (nuevaCategoria.trim() && !categorias.includes(nuevaCategoria.trim())) {
      const nueva = nuevaCategoria.trim()
      setCategorias(prev => [...prev, nueva])
      setFormData(prev => ({ ...prev, categoria: nueva }))
      setNuevaCategoria('')
      toast.success('Categoría creada', `"${nueva}" ha sido agregada`)
    } else if (categorias.includes(nuevaCategoria.trim())) {
      toast.warning('Categoría duplicada', 'Esta categoría ya existe')
    }
  }

  // Eliminar categoría
  const handleEliminarCategoria = async (categoria: string) => {
    const cantidadProductos = productos.filter(p => p.categoria === categoria).length
    
    let mensaje = `¿Eliminar la categoría "${categoria}"?`
    if (cantidadProductos > 0) {
      mensaje = `La categoría "${categoria}" tiene ${cantidadProductos} producto(s). Si la eliminas, esos productos quedarán sin categoría. ¿Continuar?`
    }

    const confirmado = await toast.confirm({
      title: 'Eliminar categoría',
      message: mensaje,
      type: cantidadProductos > 0 ? 'warning' : 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    })

    if (confirmado) {
      // Quitar la categoría de los productos que la tenían
      if (cantidadProductos > 0) {
        setProductos(prev => prev.map(p => 
          p.categoria === categoria ? { ...p, categoria: '' } : p
        ))
      }
      // Eliminar la categoría de la lista
      setCategorias(prev => prev.filter(c => c !== categoria))
      // Si el formulario tenía esta categoría seleccionada, limpiarla
      if (formData.categoria === categoria) {
        setFormData(prev => ({ ...prev, categoria: '' }))
      }
      toast.success('Categoría eliminada', `"${categoria}" ha sido eliminada`)
    }
  }

  // Asociar código de barras escaneado
  const handleCodigoBarrasKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoBarrasInput.trim()) {
      setModoEscaneo(false)
    }
  }

  // Resumen
  const resumen = {
    totalProductos: productos.length,
    totalUnidades: productos.reduce((sum, p) => sum + p.stockUnidades, 0),
    valorInventario: productos.reduce((sum, p) => sum + (p.precioUnidad * p.stockUnidades), 0),
    stockBajo: productos.filter(p => p.stockUnidades <= p.stockMinimo).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventario</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestiona tus productos, precios por unidad y docena
          </p>
        </div>
        <button
          onClick={handleNuevoProducto}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Productos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{resumen.totalProductos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Stock Total</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatStock(resumen.totalUnidades).texto}</p>
              <p className="text-xs text-gray-400">({resumen.totalUnidades.toLocaleString()} unidades)</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valor Inventario</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatPrecio(resumen.valorInventario)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${resumen.stockBajo > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <AlertTriangle className={`h-5 w-5 ${resumen.stockBajo > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Stock Bajo</p>
              <p className={`text-2xl font-bold ${resumen.stockBajo > 0 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                {resumen.stockBajo}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código, código de barras o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de productos */}
      {productosFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {productos.length === 0 ? 'No hay productos' : 'Sin resultados'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {productos.length === 0 
              ? 'Agrega tu primer producto al inventario'
              : 'Intenta con otros términos de búsqueda'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 380px)', minHeight: '300px' }}>
          <div className="overflow-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Referencia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Precio Unidad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Precio Docena</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {productosFiltrados.map((producto) => {
                  const stockBajo = producto.stockUnidades <= producto.stockMinimo
                  return (
                    <tr key={producto.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {producto.imagen ? (
                            <img 
                              src={producto.imagen} 
                              alt={producto.nombre}
                              className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{producto.nombre}</p>
                            {producto.codigoBarras && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Barcode className="h-3 w-3" />
                                  {producto.codigoBarras}
                                </span>
                                {producto.referencia && (
                                  <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded font-medium">
                                    {producto.referencia}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-blue-600 dark:text-blue-400">{producto.codigo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{producto.referencia || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {producto.categoria ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                            {producto.categoria}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatPrecio(producto.precioUnidad)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {producto.precioDocena > 0 ? formatPrecio(producto.precioDocena) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={`inline-flex flex-col items-center px-2 py-1 text-xs font-medium rounded-lg ${
                          stockBajo 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {stockBajo && <AlertTriangle className="h-3 w-3 mb-0.5" />}
                          <span className="font-bold">{formatStock(producto.stockUnidades).texto}</span>
                          <span className="text-[10px] opacity-75">({producto.stockUnidades} und total)</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botón imprimir etiqueta - disponible para todos */}
                          <button
                            onClick={() => setProductoEtiqueta(producto)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Imprimir Etiqueta"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {/* Solo admin puede editar/eliminar */}
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleEditar(producto)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Editar (Solo Admin)"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(producto.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Eliminar (Solo Admin)"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuevo/Editar Producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {productoEditar ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Imagen y Nombre */}
              <div className="flex gap-6">
                {/* Imagen */}
                <div className="flex-shrink-0">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors overflow-hidden"
                  >
                    {formData.imagen ? (
                      <img src={formData.imagen} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-500">Agregar imagen</span>
                        <span className="text-xs text-gray-400">Click o arrastra aquí</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {formData.imagen && (
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, imagen: '' }))}
                      className="mt-2 w-full text-xs text-red-600 hover:text-red-700"
                    >
                      Quitar imagen
                    </button>
                  )}
                </div>

                {/* Nombre y Categoría */}
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre del Producto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Nombre del producto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Categoría
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Seleccionar categoría</option>
                        {categorias.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowNuevaCategoria(!showNuevaCategoria)}
                        className={`p-2 border rounded-lg transition-colors ${
                          showNuevaCategoria 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title={showNuevaCategoria ? "Cerrar gestión de categorías" : "Gestionar categorías"}
                      >
                        {showNuevaCategoria ? (
                          <X className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Plus className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel de gestión de categorías */}
              {showNuevaCategoria && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-4">
                  {/* Crear nueva categoría */}
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      Nueva Categoría
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nuevaCategoria}
                        onChange={(e) => setNuevaCategoria(e.target.value)}
                        className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Nombre de la categoría"
                        onKeyDown={(e) => e.key === 'Enter' && handleAgregarCategoria()}
                        autoFocus
                      />
                      <button
                        onClick={handleAgregarCategoria}
                        disabled={!nuevaCategoria.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>

                  {/* Lista de categorías existentes para eliminar */}
                  {categorias.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Categorías existentes ({categorias.length})
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        {categorias.map(cat => {
                          const cantidadProductos = productos.filter(p => p.categoria === cat).length
                          return (
                            <div 
                              key={cat} 
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm ${
                                formData.categoria === cat 
                                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                              }`}
                            >
                              <button
                                onClick={() => setFormData(prev => ({ ...prev, categoria: cat }))}
                                className="hover:underline"
                              >
                                {cat}
                              </button>
                              {cantidadProductos > 0 && (
                                <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded-full">
                                  {cantidadProductos}
                                </span>
                              )}
                              <button
                                onClick={() => handleEliminarCategoria(cat)}
                                className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-600 transition-colors"
                                title={cantidadProductos > 0 ? `Eliminar categoría (${cantidadProductos} productos)` : "Eliminar categoría"}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                        💡 Haz clic en el nombre para seleccionar, o en la X para eliminar
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Código de Barras */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <QrCode className="h-5 w-5" />
                  <span className="font-medium">Código de Barras</span>
                </div>

                {modoEscaneo && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-3">
                    <QrCode className="h-5 w-5 text-orange-600" />
                    <span className="text-sm text-orange-700 dark:text-orange-300">
                      👉 <strong>MODO ESCANEO ACTIVO</strong> - Apunta la pistola al empaque del producto y escanea el código de barras de fábrica.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Código de Barras
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        ref={inputCodigoRef}
                        type="text"
                        value={codigoBarrasInput}
                        onChange={(e) => setCodigoBarrasInput(e.target.value)}
                        onKeyDown={handleCodigoBarrasKeyDown}
                        placeholder="Escanea o escribe el código del producto"
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      {codigoBarrasInput && (
                        <button
                          onClick={() => setCodigoBarrasInput('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Usa 'Generar Código' para uno nuevo o 'Asociar Código' para uno existente
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const codigo = generarCodigoBarras()
                      setCodigoBarrasInput(codigo)
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <QrCode className="h-4 w-4" />
                    GENERAR CÓDIGO
                  </button>
                  <button
                    onClick={() => {
                      setModoEscaneo(!modoEscaneo)
                      if (!modoEscaneo) {
                        setTimeout(() => inputCodigoRef.current?.focus(), 100)
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
                      modoEscaneo 
                        ? 'bg-orange-500 text-white border-orange-500' 
                        : 'border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                    }`}
                  >
                    <Camera className="h-4 w-4" />
                    {modoEscaneo ? 'ESPERANDO...' : 'ASOCIAR CÓDIGO'}
                  </button>
                </div>

                {/* Vista previa código de barras */}
                {codigoBarrasInput && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-green-400 dark:border-green-600">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Código asociado a este producto</p>
                    <div className="flex items-center justify-center flex-col gap-3">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        {/* Simulación visual de código de barras - MÁS GRANDE */}
                        <div className="flex gap-px justify-center">
                          {codigoBarrasInput.split('').map((char, i) => (
                            <div 
                              key={i} 
                              className="bg-black" 
                              style={{ 
                                width: parseInt(char) % 2 === 0 ? '3px' : '4px', 
                                height: '80px' 
                              }} 
                            />
                          ))}
                        </div>
                        <p className="text-center text-lg font-mono font-bold mt-3 tracking-wider">{codigoBarrasInput}</p>
                      </div>
                      
                      {/* Referencia asociada al código de barras */}
                      <div className="w-full max-w-sm">
                        <label className="block text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                          Referencia de este código
                        </label>
                        <input
                          type="text"
                          value={formData.referencia}
                          onChange={(e) => setFormData(prev => ({ ...prev, referencia: e.target.value }))}
                          className="w-full px-4 py-2 border-2 border-green-300 dark:border-green-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center font-medium"
                          placeholder="Ej: REF-001, SKU-ABC, MODELO-X"
                        />
                        <p className="text-xs text-center text-gray-500 mt-1">
                          Esta referencia quedará asociada al código de barras
                        </p>
                      </div>
                      
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Este código será reconocido por el escáner
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Descripción del producto"
                />
              </div>

              {/* Precios */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-300">Precios de Venta</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Precio por Unidad <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="text"
                        value={formData.precioUnidad}
                        onChange={(e) => setFormData(prev => ({ ...prev, precioUnidad: formatNumeroConPuntos(e.target.value) }))}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Precio por Docena (12 und)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="text"
                        value={formData.precioDocena}
                        onChange={(e) => setFormData(prev => ({ ...prev, precioDocena: formatNumeroConPuntos(e.target.value) }))}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Deja vacío si no vendes por docena
                    </p>
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-300">Inventario</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Stock Actual (Unidades)
                    </label>
                    <input
                      type="number"
                      value={formData.stockUnidades}
                      onChange={(e) => setFormData(prev => ({ ...prev, stockUnidades: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Stock Mínimo (Alerta)
                    </label>
                    <input
                      type="number"
                      value={formData.stockMinimo}
                      onChange={(e) => setFormData(prev => ({ ...prev, stockMinimo: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="12"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleGuardar}
                disabled={!formData.nombre.trim() || !formData.precioUnidad}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {productoEditar ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  ¿Eliminar producto?
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal imprimir etiqueta */}
      {productoEtiqueta && (
        <EtiquetaProducto
          producto={{
            nombre: productoEtiqueta.nombre,
            codigoBarras: productoEtiqueta.codigoBarras,
            referencia: productoEtiqueta.referencia,
            precioUnidad: productoEtiqueta.precioUnidad,
            precioDocena: productoEtiqueta.precioDocena
          }}
          onClose={() => setProductoEtiqueta(null)}
        />
      )}
    </div>
  )
}

export default InventarioPage
