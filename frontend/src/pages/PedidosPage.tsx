import { 
  Package, 
  Search, 
  Plus, 
  Eye,
  Trash2,
  Truck,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  PackageCheck,
  PackagePlus,
  X,
  Edit,
  Banknote,
  Check
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks'

// Interfaz de Abono a proveedor
interface AbonoProveedor {
  id: string
  fecha: string
  hora: string
  monto: number
  metodoPago: 'efectivo' | 'transferencia' | 'otro'
  nota: string
  registradoPor: string
}

// Interfaz de Proveedor
interface Proveedor {
  id: string
  nombre: string
  nit: string
  telefono: string
  email: string
  direccion: string
}

// Interfaz de Item del pedido
interface ItemPedido {
  productoId: string
  productoCodigo: string
  productoNombre: string
  cantidadPedida: number
  cantidadRecibida: number
  costoUnitario: number
  subtotal: number
}

// Interfaz de Pedido/Entrada de mercancía
export interface PedidoEntrada {
  id: string
  numero: string
  proveedorId: string
  proveedorNombre: string
  fechaPedido: string
  fechaEsperada: string
  fechaRecibido: string | null
  estado: 'pendiente' | 'en_transito' | 'recibido_parcial' | 'recibido' | 'cancelado'
  items: ItemPedido[]
  total: number
  notas: string
  numeroFacturaProveedor: string
  // Campos de abonos al proveedor
  abonos?: AbonoProveedor[]
  totalAbonado?: number
  saldoPendiente?: number
}

const estadoConfig = {
  pendiente: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock, label: 'Pendiente' },
  en_transito: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Truck, label: 'En Tránsito' },
  recibido_parcial: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: PackagePlus, label: 'Recibido Parcial' },
  recibido: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: PackageCheck, label: 'Recibido' },
  cancelado: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, label: 'Cancelado' },
}

export function PedidosPage() {
  // Hook de autenticación
  const { isAdmin } = useAuth()
  // Hook de notificaciones
  const toast = useToast()
  
  // Estados principales
  const [pedidos, setPedidos] = useState<PedidoEntrada[]>(() => {
    try {
      const saved = localStorage.getItem('manifesto_pedidos_entrada')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Error cargando pedidos:', e)
    }
    return []
  })

  const [proveedores, setProveedores] = useState<Proveedor[]>(() => {
    try {
      const saved = localStorage.getItem('manifesto_proveedores')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Error cargando proveedores:', e)
    }
    return []
  })

  const [productos, setProductos] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('manifesto_inventario')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Error cargando productos:', e)
    }
    return []
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showModalProveedor, setShowModalProveedor] = useState(false)
  const [showModalRecepcion, setShowModalRecepcion] = useState(false)
  const [pedidoDetalle, setPedidoDetalle] = useState<PedidoEntrada | null>(null)
  const [pedidoRecibir, setPedidoRecibir] = useState<PedidoEntrada | null>(null)

  // Estados para sistema de abonos a proveedor
  const [showModalAbono, setShowModalAbono] = useState(false)
  const [pedidoAbono, setPedidoAbono] = useState<PedidoEntrada | null>(null)
  const [montoAbono, setMontoAbono] = useState('')
  const [metodoAbono, setMetodoAbono] = useState<'efectivo' | 'transferencia' | 'otro'>('efectivo')
  const [notaAbono, setNotaAbono] = useState('')

  // Estados del formulario de pedido
  const [formPedido, setFormPedido] = useState({
    proveedorId: '',
    notas: ''
  })

  // Estados del formulario de proveedor
  const [formProveedor, setFormProveedor] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    email: '',
    direccion: ''
  })

  // Proveedor que se está editando
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(null)

  // Items del pedido actual
  const [itemsPedido, setItemsPedido] = useState<ItemPedido[]>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null)
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [showProductoDropdown, setShowProductoDropdown] = useState(false)
  const [tipoUnidad, setTipoUnidad] = useState<'unidad' | 'docena'>('unidad')
  const [cantidadAgregar, setCantidadAgregar] = useState('')
  const [costoAgregar, setCostoAgregar] = useState('')

  // Items para recepción
  const [itemsRecepcion, setItemsRecepcion] = useState<{[key: string]: number}>({})

  // Vista activa (pedidos o proveedores)
  const [vistaActiva, setVistaActiva] = useState<'pedidos' | 'proveedores'>('pedidos')

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem('manifesto_pedidos_entrada', JSON.stringify(pedidos))
  }, [pedidos])

  useEffect(() => {
    localStorage.setItem('manifesto_proveedores', JSON.stringify(proveedores))
  }, [proveedores])

  // Formatear número con puntos
  const formatNumero = (num: number) => {
    return new Intl.NumberFormat('es-CO').format(num)
  }

  // Formatear precio
  const formatPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio)
  }

  // Formatear stock como docenas y unidades
  const formatStock = (unidades: number): string => {
    const docenas = Math.floor(unidades / 12)
    const unidadesRestantes = unidades % 12
    
    if (docenas > 0 && unidadesRestantes > 0) {
      return `${docenas} doc + ${unidadesRestantes} und`
    } else if (docenas > 0) {
      return `${docenas} docenas`
    } else {
      return `${unidadesRestantes} unidades`
    }
  }

  // Abrir modal de abono a proveedor
  const abrirModalAbono = (pedido: PedidoEntrada) => {
    setPedidoAbono(pedido)
    setMontoAbono('')
    setMetodoAbono('efectivo')
    setNotaAbono('')
    setShowModalAbono(true)
  }

  // Registrar un abono al proveedor
  const registrarAbono = () => {
    if (!pedidoAbono || !montoAbono) {
      toast.warning('Campo requerido', 'Ingrese el monto del abono')
      return
    }

    const monto = parseFloat(montoAbono.replace(/\./g, '').replace(',', '.'))
    if (isNaN(monto) || monto <= 0) {
      toast.warning('Monto inválido', 'El monto debe ser mayor a 0')
      return
    }

    const saldoActual = pedidoAbono.saldoPendiente ?? pedidoAbono.total
    if (monto > saldoActual) {
      toast.warning('Monto excedido', `El abono no puede ser mayor al saldo pendiente (${formatPrecio(saldoActual)})`)
      return
    }

    const nuevoAbono: AbonoProveedor = {
      id: Date.now().toString(),
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      monto,
      metodoPago: metodoAbono,
      nota: notaAbono,
      registradoPor: 'Sistema'
    }

    const abonosActuales = pedidoAbono.abonos || []
    const totalAbonadoNuevo = (pedidoAbono.totalAbonado || 0) + monto
    const saldoPendienteNuevo = pedidoAbono.total - totalAbonadoNuevo

    setPedidos(prev => prev.map(p => 
      p.id === pedidoAbono.id 
        ? {
            ...p,
            abonos: [...abonosActuales, nuevoAbono],
            totalAbonado: totalAbonadoNuevo,
            saldoPendiente: saldoPendienteNuevo
          }
        : p
    ))

    toast.success('Abono registrado', `Abono de ${formatPrecio(monto)} registrado correctamente`)
    setShowModalAbono(false)
    setPedidoAbono(null)
  }

  // Generar número de pedido
  const generarNumeroPedido = (): string => {
    const maxNum = pedidos.reduce((max, p) => {
      const num = parseInt(p.numero.replace('ENT-', ''))
      return num > max ? num : max
    }, 0)
    return `ENT-${String(maxNum + 1).padStart(4, '0')}`
  }

  // Generar número de factura proveedor automático
  const generarNumeroFactura = (): string => {
    const pedidosConFactura = pedidos.filter(p => p.numeroFacturaProveedor && p.numeroFacturaProveedor.startsWith('FACT-'))
    const maxNum = pedidosConFactura.reduce((max, p) => {
      const num = parseInt(p.numeroFacturaProveedor.replace('FACT-', ''))
      return num > max ? num : max
    }, 0)
    return `FACT-${String(maxNum + 1).padStart(4, '0')}`
  }

  // Filtrar productos por búsqueda
  const productosFiltrados = productos.filter((producto) => {
    const term = busquedaProducto.toLowerCase()
    return (
      producto.nombre?.toLowerCase().includes(term) ||
      producto.codigo?.toLowerCase().includes(term) ||
      producto.referencia?.toLowerCase().includes(term) ||
      producto.codigoBarras?.includes(term)
    )
  })

  // Seleccionar producto de la búsqueda
  const handleSeleccionarProducto = (producto: any) => {
    setProductoSeleccionado(producto)
    setBusquedaProducto('') // Limpiar barra de búsqueda
    setShowProductoDropdown(false)
    // Auto-fill price based on unit type
    const precio = tipoUnidad === 'unidad' ? producto.precioUnidad : producto.precioDocena
    setCostoAgregar(precio ? new Intl.NumberFormat('es-CO').format(precio) : '')
  }

  // Actualizar precio cuando cambia el tipo de unidad
  const handleCambioTipoUnidad = (tipo: 'unidad' | 'docena') => {
    setTipoUnidad(tipo)
    if (productoSeleccionado) {
      const precio = tipo === 'unidad' ? productoSeleccionado.precioUnidad : productoSeleccionado.precioDocena
      setCostoAgregar(precio ? new Intl.NumberFormat('es-CO').format(precio) : '')
    }
  }

  // Filtrar pedidos
  const pedidosFiltrados = pedidos.filter((pedido) => {
    const matchBusqueda = 
      pedido.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.proveedorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.numeroFacturaProveedor.toLowerCase().includes(searchTerm.toLowerCase())
    const matchEstado = !estadoFiltro || pedido.estado === estadoFiltro
    return matchBusqueda && matchEstado
  })

  // Agregar item al pedido
  const handleAgregarItem = () => {
    if (!productoSeleccionado || !cantidadAgregar || !costoAgregar) return

    const cantidad = parseInt(cantidadAgregar)
    const costo = parseInt(costoAgregar.replace(/\./g, ''))
    
    const nuevoItem: ItemPedido = {
      productoId: productoSeleccionado.id,
      productoCodigo: productoSeleccionado.codigo,
      productoNombre: `${productoSeleccionado.nombre} (${tipoUnidad === 'unidad' ? 'Und' : 'Doc'})`,
      cantidadPedida: cantidad,
      cantidadRecibida: 0,
      costoUnitario: costo,
      subtotal: cantidad * costo
    }

    setItemsPedido(prev => [...prev, nuevoItem])
    setProductoSeleccionado(null)
    setBusquedaProducto('')
    setCantidadAgregar('')
    setCostoAgregar('')
    setTipoUnidad('unidad')
  }

  // Quitar item del pedido
  const handleQuitarItem = (index: number) => {
    setItemsPedido(prev => prev.filter((_, i) => i !== index))
  }

  // Cancelar pedido
  const cancelarPedido = async (pedido: PedidoEntrada) => {
    const confirmacion = await toast.confirm({
      title: 'Cancelar Pedido',
      message: `¿Estás seguro de cancelar el pedido ${pedido.numero}?\n\nProveedor: ${pedido.proveedorNombre}\nTotal: ${formatPrecio(pedido.total)}`,
      confirmText: 'Sí, Cancelar',
      cancelText: 'No',
      type: 'warning'
    })
    if (confirmacion) {
      setPedidos(prev => prev.map(p => 
        p.id === pedido.id ? { ...p, estado: 'cancelado' as const } : p
      ))
      toast.success('Pedido cancelado', `El pedido ${pedido.numero} ha sido cancelado`)
    }
  }

  // Eliminar pedido
  const eliminarPedido = async (pedido: PedidoEntrada) => {
    if (!isAdmin) {
      toast.error('Acceso denegado', 'Solo los administradores pueden eliminar pedidos')
      return
    }
    const confirmacion = await toast.confirm({
      title: 'Eliminar Pedido',
      message: `¿Estás seguro de ELIMINAR permanentemente el pedido ${pedido.numero}?\n\nProveedor: ${pedido.proveedorNombre}\nTotal: ${formatPrecio(pedido.total)}\n\nEsta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    })
    if (confirmacion) {
      setPedidos(prev => prev.filter(p => p.id !== pedido.id))
      toast.success('Pedido eliminado', `Pedido ${pedido.numero} eliminado`)
    }
  }

  // Guardar proveedor (crear o editar)
  const handleGuardarProveedor = () => {
    if (!formProveedor.nombre.trim()) {
      toast.error('Campo requerido', 'El nombre del proveedor es obligatorio')
      return
    }

    if (proveedorEditando) {
      // Editar proveedor existente
      setProveedores(prev => prev.map(p => 
        p.id === proveedorEditando.id 
          ? { ...p, ...formProveedor }
          : p
      ))
      // También actualizar el nombre en los pedidos
      setPedidos(prev => prev.map(ped => 
        ped.proveedorId === proveedorEditando.id 
          ? { ...ped, proveedorNombre: formProveedor.nombre }
          : ped
      ))
    } else {
      // Crear nuevo proveedor
      const nuevoProveedor: Proveedor = {
        id: Date.now().toString(),
        ...formProveedor
      }
      setProveedores(prev => [...prev, nuevoProveedor])
      setFormPedido(prev => ({ ...prev, proveedorId: nuevoProveedor.id }))
    }

    setShowModalProveedor(false)
    setProveedorEditando(null)
    setFormProveedor({ nombre: '', nit: '', telefono: '', email: '', direccion: '' })
  }

  // Abrir modal para editar proveedor
  const editarProveedor = (proveedor: Proveedor) => {
    if (!isAdmin) {
      toast.error('Acceso denegado', 'Solo los administradores pueden editar proveedores')
      return
    }
    setProveedorEditando(proveedor)
    setFormProveedor({
      nombre: proveedor.nombre,
      nit: proveedor.nit,
      telefono: proveedor.telefono,
      email: proveedor.email,
      direccion: proveedor.direccion
    })
    setShowModalProveedor(true)
  }

  // Cerrar modal de proveedor
  const cerrarModalProveedor = () => {
    setShowModalProveedor(false)
    setProveedorEditando(null)
    setFormProveedor({ nombre: '', nit: '', telefono: '', email: '', direccion: '' })
  }

  // Guardar pedido
  const handleGuardarPedido = () => {
    if (!formPedido.proveedorId) {
      toast.error('Proveedor requerido', 'Selecciona un proveedor para continuar')
      return
    }
    if (itemsPedido.length === 0) {
      toast.error('Sin productos', 'Agrega al menos un producto al pedido')
      return
    }

    const proveedor = proveedores.find(p => p.id === formPedido.proveedorId)
    const total = itemsPedido.reduce((sum, item) => sum + item.subtotal, 0)
    const fechaHoy = new Date().toISOString().split('T')[0]

    // Actualizar inventario inmediatamente (mercancía ya recibida)
    const productosActualizados = [...productos]
    itemsPedido.forEach(item => {
      const productoIndex = productosActualizados.findIndex(p => p.id === item.productoId)
      if (productoIndex !== -1) {
        // Si es docena, multiplicar por 12
        const esDocena = item.productoNombre.includes('(Doc)')
        const cantidadUnidades = esDocena ? item.cantidadPedida * 12 : item.cantidadPedida
        productosActualizados[productoIndex] = {
          ...productosActualizados[productoIndex],
          stockUnidades: (productosActualizados[productoIndex].stockUnidades || 0) + cantidadUnidades,
          ultimaActualizacion: new Date().toISOString()
        }
      }
    })
    localStorage.setItem('manifesto_inventario', JSON.stringify(productosActualizados))
    setProductos(productosActualizados)

    // Crear pedido ya como recibido
    const nuevoPedido: PedidoEntrada = {
      id: Date.now().toString(),
      numero: generarNumeroPedido(),
      proveedorId: formPedido.proveedorId,
      proveedorNombre: proveedor?.nombre || '',
      fechaPedido: fechaHoy,
      fechaEsperada: '',
      fechaRecibido: fechaHoy,
      estado: 'recibido',
      items: itemsPedido.map(item => ({ ...item, cantidadRecibida: item.cantidadPedida })),
      total,
      notas: formPedido.notas,
      numeroFacturaProveedor: generarNumeroFactura()
    }

    setPedidos(prev => [nuevoPedido, ...prev])
    setShowModal(false)
    setFormPedido({ proveedorId: '', notas: '' })
    setItemsPedido([])
  }

  // Abrir modal de recepción
  const handleAbrirRecepcion = (pedido: PedidoEntrada) => {
    setPedidoRecibir(pedido)
    const itemsInit: {[key: string]: number} = {}
    pedido.items.forEach(item => {
      itemsInit[item.productoId] = item.cantidadPedida - item.cantidadRecibida
    })
    setItemsRecepcion(itemsInit)
    setShowModalRecepcion(true)
  }

  // Procesar recepción de mercancía
  const handleProcesarRecepcion = () => {
    if (!pedidoRecibir) return

    // Actualizar inventario
    const productosActualizados = [...productos]
    pedidoRecibir.items.forEach(item => {
      const cantidadRecibida = itemsRecepcion[item.productoId] || 0
      const productoIndex = productosActualizados.findIndex(p => p.id === item.productoId)
      if (productoIndex !== -1 && cantidadRecibida > 0) {
        productosActualizados[productoIndex] = {
          ...productosActualizados[productoIndex],
          stockUnidades: (productosActualizados[productoIndex].stockUnidades || 0) + cantidadRecibida,
          ultimaActualizacion: new Date().toISOString()
        }
      }
    })
    localStorage.setItem('manifesto_inventario', JSON.stringify(productosActualizados))
    setProductos(productosActualizados)

    // Actualizar pedido
    const pedidosActualizados = pedidos.map(p => {
      if (p.id === pedidoRecibir.id) {
        const itemsActualizados = p.items.map(item => ({
          ...item,
          cantidadRecibida: item.cantidadRecibida + (itemsRecepcion[item.productoId] || 0)
        }))
        
        const todoRecibido = itemsActualizados.every(item => item.cantidadRecibida >= item.cantidadPedida)
        const algunoRecibido = itemsActualizados.some(item => item.cantidadRecibida > 0)

        return {
          ...p,
          items: itemsActualizados,
          fechaRecibido: new Date().toISOString().split('T')[0],
          estado: todoRecibido ? 'recibido' : algunoRecibido ? 'recibido_parcial' : p.estado
        } as PedidoEntrada
      }
      return p
    })

    setPedidos(pedidosActualizados)
    setShowModalRecepcion(false)
    setPedidoRecibir(null)
    setItemsRecepcion({})
  }

  // Cambiar estado del pedido
  const cambiarEstado = (pedidoId: string, nuevoEstado: PedidoEntrada['estado']) => {
    setPedidos(prev => prev.map(p => 
      p.id === pedidoId ? { ...p, estado: nuevoEstado } : p
    ))
  }

  // Eliminar proveedor
  const eliminarProveedor = async (proveedor: Proveedor) => {
    if (!isAdmin) {
      toast.error('Acceso denegado', 'Solo los administradores pueden eliminar proveedores')
      return
    }
    // Verificar si tiene pedidos asociados
    const pedidosDelProveedor = pedidos.filter(p => p.proveedorId === proveedor.id)
    if (pedidosDelProveedor.length > 0) {
      toast.warning(
        'No se puede eliminar',
        `"${proveedor.nombre}" tiene ${pedidosDelProveedor.length} pedido(s) asociado(s). Elimina los pedidos primero.`
      )
      return
    }
    
    const confirmacion = await toast.confirm({
      title: 'Eliminar Proveedor',
      message: `¿Estás seguro de eliminar a "${proveedor.nombre}"?\n\nNIT: ${proveedor.nit}\n\nEsta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    })
    if (confirmacion) {
      setProveedores(prev => prev.filter(p => p.id !== proveedor.id))
      toast.success('Proveedor eliminado', `${proveedor.nombre} ha sido eliminado`)
    }
  }

  // Resumen
  const resumen = {
    total: pedidos.length,
    pendientes: pedidos.filter(p => p.estado === 'pendiente' || p.estado === 'en_transito').length,
    recibidos: pedidos.filter(p => p.estado === 'recibido').length,
    valorTotal: pedidos.filter(p => p.estado !== 'cancelado').reduce((sum, p) => sum + p.total, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header con Pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Pestañas */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setVistaActiva('pedidos')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                vistaActiva === 'pedidos'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              📦 Pedidos a Proveedores
            </button>
            <button
              onClick={() => setVistaActiva('proveedores')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                vistaActiva === 'proveedores'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              🏢 Proveedores ({proveedores.length})
            </button>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {vistaActiva === 'pedidos' 
              ? 'Registra y recibe mercancía de tus proveedores'
              : 'Gestiona tus proveedores'}
          </p>
        </div>
        {vistaActiva === 'pedidos' ? (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo Pedido
          </button>
        ) : (
          <button
            onClick={() => setShowModalProveedor(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo Proveedor
          </button>
        )}
      </div>

      {/* === VISTA PEDIDOS === */}
      {vistaActiva === 'pedidos' && (
        <>
          {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Pedidos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{resumen.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Truck className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Por Recibir</p>
              <p className="text-2xl font-bold text-yellow-600">{resumen.pendientes}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <PackageCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recibidos</p>
              <p className="text-2xl font-bold text-green-600">{resumen.recibidos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valor Total</p>
              <p className="text-lg font-bold text-purple-600">{formatPrecio(resumen.valorTotal)}</p>
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
              placeholder="Buscar por número, proveedor o factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_transito">En Tránsito</option>
            <option value="recibido_parcial">Recibido Parcial</option>
            <option value="recibido">Recibido</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Lista de pedidos */}
      {pedidosFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Truck className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No hay pedidos registrados
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Registra un nuevo pedido a proveedor para comenzar
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          <div className="overflow-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Saldo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pedidosFiltrados.map((pedido) => {
                  const config = estadoConfig[pedido.estado]
                  const Icon = config.icon
                  return (
                    <tr key={pedido.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{pedido.numero}</p>
                          <p className="text-xs text-gray-500">{pedido.items.length} producto(s)</p>
                          <p className="text-xs text-blue-500">Fact: {pedido.numeroFacturaProveedor}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-gray-100">{pedido.proveedorNombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {pedido.fechaPedido}
                          </div>
                          {pedido.fechaRecibido && (
                            <p className="text-xs text-green-600">Llegó: {pedido.fechaRecibido}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatPrecio(pedido.total)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pedido.abonos && pedido.abonos.length > 0 ? (
                          <div>
                            <span className={`text-sm font-bold ${(pedido.saldoPendiente ?? pedido.total) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {formatPrecio(pedido.saldoPendiente ?? pedido.total)}
                            </span>
                            <p className="text-[10px] text-gray-500">
                              Abonado: {formatPrecio(pedido.totalAbonado || 0)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPedidoDetalle(pedido)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {(pedido.estado === 'pendiente' || pedido.estado === 'en_transito' || pedido.estado === 'recibido_parcial') && (
                            <button
                              onClick={() => handleAbrirRecepcion(pedido)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                              title="Recibir mercancía"
                            >
                              <PackageCheck className="h-4 w-4" />
                            </button>
                          )}
                          {/* Botón de abonar - si tiene saldo pendiente */}
                          {pedido.estado !== 'cancelado' && (pedido.saldoPendiente === undefined || pedido.saldoPendiente > 0) && (
                            <button
                              onClick={() => abrirModalAbono(pedido)}
                              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg"
                              title="Registrar abono al proveedor"
                            >
                              <Banknote className="h-4 w-4" />
                            </button>
                          )}
                          {pedido.estado !== 'cancelado' && pedido.estado !== 'recibido' && (
                            <button
                              onClick={() => cancelarPedido(pedido)}
                              className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg"
                              title="Cancelar pedido"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {/* Solo admin puede eliminar */}
                          {isAdmin && (
                            <button
                              onClick={() => eliminarPedido(pedido)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                              title="Eliminar (Solo Admin)"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
        </>
      )}

      {/* === VISTA PROVEEDORES === */}
      {vistaActiva === 'proveedores' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">NIT</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Teléfono</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dirección</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pedidos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {proveedores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <Building2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No hay proveedores registrados</p>
                      <p className="text-sm">Haz clic en "Nuevo Proveedor" para agregar uno</p>
                    </td>
                  </tr>
                ) : (
                  proveedores.map(proveedor => {
                    const pedidosDelProveedor = pedidos.filter(p => p.proveedorId === proveedor.id)
                    const totalCompras = pedidosDelProveedor.reduce((sum, p) => sum + p.total, 0)
                    
                    return (
                      <tr key={proveedor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-purple-600" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{proveedor.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{proveedor.nit}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{proveedor.telefono}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{proveedor.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{proveedor.direccion || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{pedidosDelProveedor.length}</span>
                            {totalCompras > 0 && (
                              <p className="text-xs text-green-600">{formatPrecio(totalCompras)}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {/* Solo admin puede editar/eliminar proveedores */}
                          {isAdmin && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => editarProveedor(proveedor)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                                title="Editar proveedor (Solo Admin)"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => eliminarProveedor(proveedor)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                title="Eliminar proveedor (Solo Admin)"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuevo Pedido */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Nuevo Pedido a Proveedor
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Proveedor */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Proveedor
                </h3>
                <div className="flex gap-3">
                  <select
                    value={formPedido.proveedorId}
                    onChange={(e) => setFormPedido(prev => ({ ...prev, proveedorId: e.target.value }))}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} - {p.nit}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowModalProveedor(true)}
                    className="px-4 py-2 border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Información del pedido */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <span className="font-medium">Factura del Proveedor Nro:</span> {generarNumeroFactura()} (se asigna automáticamente)
                </p>
              </div>

              {/* Agregar productos */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Productos del Pedido
                </h3>
                
                {/* Búsqueda de producto */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Buscar Producto
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={busquedaProducto}
                      onChange={(e) => {
                        setBusquedaProducto(e.target.value)
                        setShowProductoDropdown(true)
                        if (!e.target.value) setProductoSeleccionado(null)
                      }}
                      onFocus={() => setShowProductoDropdown(true)}
                      placeholder="Escriba nombre, código, referencia o código de barras..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  
                  {/* Dropdown de resultados */}
                  {showProductoDropdown && busquedaProducto && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {productosFiltrados.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No se encontraron productos</div>
                      ) : (
                        productosFiltrados.slice(0, 10).map(producto => (
                          <button
                            key={producto.id}
                            type="button"
                            onClick={() => handleSeleccionarProducto(producto)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {producto.codigo} - {producto.nombre}
                              </p>
                              <p className="text-xs text-gray-500">
                                {producto.referencia && `Ref: ${producto.referencia} | `}
                                Stock: {formatStock(producto.stockUnidades || 0)}
                              </p>
                            </div>
                            <div className="text-right text-xs">
                              <p className="text-gray-600 dark:text-gray-400">Und: {formatPrecio(producto.precioUnidad || 0)}</p>
                              <p className="text-gray-600 dark:text-gray-400">Doc: {formatPrecio(producto.precioDocena || 0)}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Producto seleccionado - Tipo de unidad, cantidad y costo */}
                {productoSeleccionado && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{productoSeleccionado.nombre}</p>
                        <p className="text-sm text-gray-500">{productoSeleccionado.codigo} {productoSeleccionado.referencia && `| Ref: ${productoSeleccionado.referencia}`}</p>
                      </div>
                      <button
                        onClick={() => {
                          setProductoSeleccionado(null)
                          setBusquedaProducto('')
                          setCostoAgregar('')
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-3">
                      {/* Tipo de unidad */}
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
                        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                          <button
                            type="button"
                            onClick={() => handleCambioTipoUnidad('unidad')}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                              tipoUnidad === 'unidad'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            Unidad
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCambioTipoUnidad('docena')}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                              tipoUnidad === 'docena'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            Docena
                          </button>
                        </div>
                      </div>
                      
                      {/* Cantidad */}
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cantidad</label>
                        <input
                          type="number"
                          value={cantidadAgregar}
                          onChange={(e) => setCantidadAgregar(e.target.value)}
                          placeholder="0"
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      
                      {/* Costo unitario */}
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Costo {tipoUnidad === 'unidad' ? 'por Unidad' : 'por Docena'}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="text"
                            value={costoAgregar}
                            onChange={(e) => {
                              const valor = e.target.value.replace(/\D/g, '')
                              setCostoAgregar(valor ? new Intl.NumberFormat('es-CO').format(parseInt(valor)) : '')
                            }}
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </div>
                      
                      {/* Botón agregar */}
                      <div className="col-span-2 flex items-end">
                        <button
                          onClick={handleAgregarItem}
                          disabled={!cantidadAgregar || !costoAgregar}
                          className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista de items */}
                {itemsPedido.length > 0 && (
                  <div className="mt-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left">Producto</th>
                          <th className="px-3 py-2 text-center">Cantidad</th>
                          <th className="px-3 py-2 text-center">Tipo</th>
                          <th className="px-3 py-2 text-right">Costo Unit.</th>
                          <th className="px-3 py-2 text-right">Subtotal</th>
                          <th className="px-3 py-2 text-center">Quitar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {itemsPedido.map((item, index) => {
                          const esDocena = item.productoNombre.includes('(Doc)')
                          return (
                            <tr key={index}>
                              <td className="px-3 py-2">
                                <span className="font-medium">{item.productoCodigo}</span> - {item.productoNombre.replace(' (Und)', '').replace(' (Doc)', '')}
                              </td>
                              <td className="px-3 py-2 text-center">{formatNumero(item.cantidadPedida)}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  esDocena 
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                }`}>
                                  {esDocena ? 'Docena' : 'Unidad'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">{formatPrecio(item.costoUnitario)}</td>
                              <td className="px-3 py-2 text-right font-medium">{formatPrecio(item.subtotal)}</td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => handleQuitarItem(index)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-700 font-medium">
                        <tr className="text-lg">
                          <td colSpan={4} className="px-3 py-2 text-right">TOTAL:</td>
                          <td className="px-3 py-2 text-right text-green-600">{formatPrecio(itemsPedido.reduce((sum, i) => sum + i.subtotal, 0))}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas / Observaciones
                </label>
                <textarea
                  value={formPedido.notas}
                  onChange={(e) => setFormPedido(prev => ({ ...prev, notas: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarPedido}
                disabled={!formPedido.proveedorId || itemsPedido.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo/Editar Proveedor */}
      {showModalProveedor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {proveedorEditando ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <button onClick={cerrarModalProveedor} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Cerrar">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre / Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formProveedor.nombre}
                  onChange={(e) => setFormProveedor(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NIT</label>
                  <input
                    type="text"
                    value={formProveedor.nit}
                    onChange={(e) => setFormProveedor(prev => ({ ...prev, nit: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formProveedor.telefono}
                    onChange={(e) => setFormProveedor(prev => ({ ...prev, telefono: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formProveedor.email}
                  onChange={(e) => setFormProveedor(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                <input
                  type="text"
                  value={formProveedor.direccion}
                  onChange={(e) => setFormProveedor(prev => ({ ...prev, direccion: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={cerrarModalProveedor}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarProveedor}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {proveedorEditando ? 'Guardar Cambios' : 'Guardar Proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recepción de Mercancía */}
      {showModalRecepcion && pedidoRecibir && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Recibir Mercancía
                </h2>
                <p className="text-sm text-gray-500">{pedidoRecibir.numero} - {pedidoRecibir.proveedorNombre}</p>
              </div>
              <button onClick={() => setShowModalRecepcion(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                  <PackageCheck className="h-5 w-5" />
                  Ingresa la cantidad recibida de cada producto. El inventario se actualizará automáticamente.
                </p>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-center">Pedido</th>
                    <th className="px-3 py-2 text-center">Recibido Ant.</th>
                    <th className="px-3 py-2 text-center">Recibir Ahora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pedidoRecibir.items.map((item) => {
                    const pendiente = item.cantidadPedida - item.cantidadRecibida
                    return (
                      <tr key={item.productoId}>
                        <td className="px-3 py-3">
                          <p className="font-medium">{item.productoNombre}</p>
                          <p className="text-xs text-gray-500">{item.productoCodigo}</p>
                        </td>
                        <td className="px-3 py-3 text-center">{formatNumero(item.cantidadPedida)}</td>
                        <td className="px-3 py-3 text-center">
                          {item.cantidadRecibida > 0 ? (
                            <span className="text-green-600">{formatNumero(item.cantidadRecibida)}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            value={itemsRecepcion[item.productoId] || ''}
                            onChange={(e) => setItemsRecepcion(prev => ({
                              ...prev,
                              [item.productoId]: Math.min(parseInt(e.target.value) || 0, pendiente)
                            }))}
                            max={pendiente}
                            min={0}
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700"
                          />
                          <p className="text-xs text-gray-500 mt-1">Máx: {pendiente}</p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModalRecepcion(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcesarRecepcion}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <PackageCheck className="h-4 w-4" />
                Confirmar Recepción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Pedido */}
      {pedidoDetalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Pedido {pedidoDetalle.numero}
                </h2>
                <p className="text-sm text-gray-500">{pedidoDetalle.proveedorNombre}</p>
              </div>
              <button onClick={() => setPedidoDetalle(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Fecha Pedido</p>
                  <p className="font-medium">{pedidoDetalle.fechaPedido}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Fecha Llegada</p>
                  <p className="font-medium">{pedidoDetalle.fechaRecibido || 'Pendiente'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Factura del Proveedor Nro</p>
                  <p className="font-medium text-blue-600">{pedidoDetalle.numeroFacturaProveedor}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Productos</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-center">Tipo</th>
                      <th className="px-3 py-2 text-center">Pedido</th>
                      <th className="px-3 py-2 text-center">Recibido</th>
                      <th className="px-3 py-2 text-right">Costo Unit.</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {pedidoDetalle.items.map((item, idx) => {
                      const esDocena = item.productoNombre.includes('(Doc)')
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.productoNombre.replace(' (Und)', '').replace(' (Doc)', '')}</p>
                            <p className="text-xs text-gray-500">{item.productoCodigo}</p>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              esDocena 
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {esDocena ? 'Doc' : 'Und'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">{formatNumero(item.cantidadPedida)}</td>
                          <td className="px-3 py-2 text-center">
                            {item.cantidadRecibida >= item.cantidadPedida ? (
                              <span className="text-green-600 flex items-center justify-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                {formatNumero(item.cantidadRecibida)}
                              </span>
                            ) : item.cantidadRecibida > 0 ? (
                              <span className="text-orange-600">{formatNumero(item.cantidadRecibida)}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{formatPrecio(item.costoUnitario)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatPrecio(item.subtotal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700 font-medium">
                    <tr className="text-lg">
                      <td colSpan={5} className="px-3 py-2 text-right">TOTAL:</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatPrecio(pedidoDetalle.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Estado */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Cambiar Estado</p>
                <div className="flex flex-wrap gap-2">
                  {(['pendiente', 'en_transito', 'recibido_parcial', 'recibido', 'cancelado'] as const).map(estado => (
                    <button
                      key={estado}
                      onClick={() => {
                        cambiarEstado(pedidoDetalle.id, estado)
                        setPedidoDetalle({ ...pedidoDetalle, estado })
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        pedidoDetalle.estado === estado 
                          ? estadoConfig[estado].color 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {estadoConfig[estado].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Historial de Abonos al Proveedor */}
              {pedidoDetalle.abonos && pedidoDetalle.abonos.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Banknote className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-700 dark:text-green-400">Historial de Abonos al Proveedor</h3>
                    <span className="ml-auto text-sm font-medium text-green-600">
                      Abonado: {formatPrecio(pedidoDetalle.totalAbonado || 0)} | Saldo: {formatPrecio(pedidoDetalle.saldoPendiente ?? pedidoDetalle.total)}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pedidoDetalle.abonos.map((abono, idx) => (
                      <div key={abono.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-100 dark:border-green-900">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              #{idx + 1} - {abono.fecha} {abono.hora}
                            </span>
                            <p className="font-bold text-green-600 text-lg">{formatPrecio(abono.monto)}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 capitalize">
                              {abono.metodoPago}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{abono.registradoPor}</span>
                        </div>
                        {abono.nota && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded border-l-4 border-yellow-400">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>Nota:</strong> {abono.nota}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pedidoDetalle.notas && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notas</p>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {pedidoDetalle.notas}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Abono a Proveedor */}
      {showModalAbono && pedidoAbono && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-purple-600" />
                  Registrar Abono al Proveedor
                </h2>
                <p className="text-sm text-gray-500">Pedido {pedidoAbono.numero} - {pedidoAbono.proveedorNombre}</p>
              </div>
              <button onClick={() => setShowModalAbono(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Cerrar">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Resumen del pedido */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total pedido:</span>
                  <span className="font-bold">{formatPrecio(pedidoAbono.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total abonado:</span>
                  <span className="font-medium text-green-600">{formatPrecio(pedidoAbono.totalAbonado || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Saldo pendiente:</span>
                  <span className="font-bold text-orange-600 text-lg">{formatPrecio(pedidoAbono.saldoPendiente ?? pedidoAbono.total)}</span>
                </div>
              </div>

              {/* Historial de abonos */}
              {pedidoAbono.abonos && pedidoAbono.abonos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Historial de abonos</h3>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {pedidoAbono.abonos.map((abono, idx) => (
                      <div key={abono.id} className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm border border-green-100 dark:border-green-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs text-gray-500">#{idx + 1}</span>
                            <span className="mx-1 text-gray-600 dark:text-gray-400">{abono.fecha} {abono.hora}</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs capitalize">
                              {abono.metodoPago}
                            </span>
                          </div>
                          <span className="font-bold text-green-700 dark:text-green-400">{formatPrecio(abono.monto)}</span>
                        </div>
                        {abono.nota && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded border-l-4 border-yellow-400">
                            <p className="text-xs text-gray-700 dark:text-gray-300">
                              <strong>Nota:</strong> {abono.nota}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulario de abono */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monto del abono *
                  </label>
                  <input
                    type="text"
                    value={montoAbono}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, '')
                      if (valor) {
                        setMontoAbono(new Intl.NumberFormat('es-CO').format(parseInt(valor)))
                      } else {
                        setMontoAbono('')
                      }
                    }}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Método de pago
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['efectivo', 'transferencia', 'otro'] as const).map((metodo) => (
                      <button
                        key={metodo}
                        onClick={() => setMetodoAbono(metodo)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium capitalize ${
                          metodoAbono === metodo
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {metodo}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nota (opcional)
                  </label>
                  <input
                    type="text"
                    value={notaAbono}
                    onChange={(e) => setNotaAbono(e.target.value)}
                    placeholder="Ej: Pago parcial, consignación..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModalAbono(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={registrarAbono}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Registrar Abono
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PedidosPage
