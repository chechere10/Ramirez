import { 
  Receipt, 
  Search, 
  Plus, 
  Eye,
  CheckCircle,
  Check,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  Package,
  Printer,
  X,
  Settings,
  Bell,
  CreditCard,
  Banknote,
  CalendarClock,
  ShoppingCart,
  Trash2,
  Shield
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks'

// Interfaz de auditoría
interface AuditoriaInfo {
  usuarioId: string
  usuarioNombre: string
  fecha: string
  accion: string
}

// Interfaz de Abono
interface Abono {
  id: string
  fecha: string
  hora: string
  monto: number
  metodoPago: 'efectivo' | 'transferencia' | 'otro'
  nota: string
  registradoPor: string
}

// Interfaz de Item de Venta
interface ItemVenta {
  productoId: string
  productoCodigo: string
  productoNombre: string
  productoReferencia: string
  cantidad: number
  tipoVenta: 'unidad' | 'docena'
  precioUnitario: number
  subtotal: number
}

// Interfaz de Factura/Remisión
export interface Factura {
  id: string
  numero: string
  clienteId: string
  clienteNombre: string
  clienteNit: string
  clienteDireccion: string
  clienteTelefono: string
  clienteCiudad: string
  fecha: string
  hora: string
  tipoPago: 'contado' | 'transferencia' | 'plazo'
  fechaVencimiento: string
  estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada'
  items: ItemVenta[]
  total: number
  notas: string
  recordatorioMostrado?: boolean
  // Campos de abonos
  abonos?: Abono[]
  totalAbonado?: number
  saldoPendiente?: number
  // Campos de auditoría
  creadoPor?: AuditoriaInfo
  anulado?: AuditoriaInfo
  historial?: AuditoriaInfo[]
}

// Interfaz de configuración de empresa
interface ConfigEmpresa {
  nombre: string
  slogan: string
  nit: string
  whatsapp: string
  direccion: string
  ciudad: string
  logo: string
  email: string
}

const estadoConfig = {
  pendiente: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock, label: 'Pendiente' },
  pagada: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, label: 'Pagada' },
  vencida: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle, label: 'Vencida' },
  anulada: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: XCircle, label: 'Anulada' },
}

export function FacturasPage() {
  // Hook de autenticación para obtener el usuario actual
  const { usuario, isAdmin } = useAuth()
  // Hook de notificaciones
  const toast = useToast()
  
  // Estados principales
  const [facturas, setFacturas] = useState<Factura[]>(() => {
    try {
      const saved = localStorage.getItem('manifesto_facturas_ventas')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Error cargando facturas:', e)
    }
    return []
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [clientes, _setClientes] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('manifesto_clientes')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Error cargando clientes:', e)
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

  const [configEmpresa, setConfigEmpresa] = useState<ConfigEmpresa>(() => {
    try {
      const saved = localStorage.getItem('manifesto_config_empresa')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Error cargando config:', e)
    }
    return {
      nombre: 'UNIF SPORT',
      slogan: 'VENTAS AL POR MAYOR',
      nit: '9.115.157-9',
      whatsapp: '304 238 1113',
      direccion: '',
      ciudad: '',
      logo: '/logo-empresa.jpeg',
      email: ''
    }
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showModalConfig, setShowModalConfig] = useState(false)
  const [facturaDetalle, setFacturaDetalle] = useState<Factura | null>(null)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [facturaPrint, setFacturaPrint] = useState<Factura | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // Estados para nueva venta
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>([])
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [showProductoDropdown, setShowProductoDropdown] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null)
  const [tipoVenta, setTipoVenta] = useState<'unidad' | 'docena'>('unidad')
  const [cantidadVenta, setCantidadVenta] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [notasVenta, setNotasVenta] = useState('')
  const [tipoPago, setTipoPago] = useState<'contado' | 'transferencia' | 'plazo'>('contado')
  const [diasVencimiento, setDiasVencimiento] = useState('30')
  const [fechaVencimientoCustom, setFechaVencimientoCustom] = useState('')
  const [usarFechaCustom, setUsarFechaCustom] = useState(false)

  // Estados para sistema de abonos
  const [showModalAbono, setShowModalAbono] = useState(false)
  const [facturaAbono, setFacturaAbono] = useState<Factura | null>(null)
  const [montoAbono, setMontoAbono] = useState('')
  const [metodoAbono, setMetodoAbono] = useState<'efectivo' | 'transferencia' | 'otro'>('efectivo')
  const [notaAbono, setNotaAbono] = useState('')

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem('manifesto_facturas_ventas', JSON.stringify(facturas))
  }, [facturas])

  useEffect(() => {
    localStorage.setItem('manifesto_config_empresa', JSON.stringify(configEmpresa))
  }, [configEmpresa])

  // Formatear número
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

  // Generar número de factura
  const generarNumeroFactura = (): string => {
    const maxNum = facturas.reduce((max, f) => {
      const num = parseInt(f.numero.replace('REM-', ''))
      return num > max ? num : max
    }, 0)
    return `REM-${String(maxNum + 1).padStart(4, '0')}`
  }

  // Obtener fecha y hora actual
  const obtenerFechaHora = () => {
    const now = new Date()
    const fecha = now.toISOString().split('T')[0]
    const hora = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    return { fecha, hora }
  }

  // Filtrar facturas
  const facturasFiltradas = facturas.filter((factura) => {
    const matchBusqueda = 
      factura.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.clienteNit.toLowerCase().includes(searchTerm.toLowerCase())
    const matchEstado = !estadoFiltro || factura.estado === estadoFiltro
    return matchBusqueda && matchEstado
  })

  // Filtrar clientes
  const clientesFiltrados = clientes.filter((cliente) => {
    const term = busquedaCliente.toLowerCase()
    return (
      cliente.nombre?.toLowerCase().includes(term) ||
      cliente.nit?.toLowerCase().includes(term) ||
      cliente.telefono?.includes(term)
    )
  })

  // Filtrar productos
  const productosFiltrados = productos.filter((producto) => {
    const term = busquedaProducto.toLowerCase()
    return (
      producto.nombre?.toLowerCase().includes(term) ||
      producto.codigo?.toLowerCase().includes(term) ||
      producto.referencia?.toLowerCase().includes(term) ||
      producto.codigoBarras?.includes(term)
    )
  })

  // Seleccionar cliente
  const handleSeleccionarCliente = (cliente: any) => {
    setClienteSeleccionado(cliente)
    setBusquedaCliente(cliente.nombre)
    setShowClienteDropdown(false)
  }

  // Seleccionar producto
  const handleSeleccionarProducto = (producto: any) => {
    setProductoSeleccionado(producto)
    setBusquedaProducto('') // Limpiar barra de búsqueda
    setShowProductoDropdown(false)
    const precio = tipoVenta === 'unidad' ? producto.precioUnidad : producto.precioDocena
    setPrecioVenta(precio ? formatNumero(precio) : '')
  }

  // Cambiar tipo de venta
  const handleCambioTipoVenta = (tipo: 'unidad' | 'docena') => {
    setTipoVenta(tipo)
    if (productoSeleccionado) {
      const precio = tipo === 'unidad' ? productoSeleccionado.precioUnidad : productoSeleccionado.precioDocena
      setPrecioVenta(precio ? formatNumero(precio) : '')
    }
  }

  // Agregar item a la venta
  const handleAgregarItem = () => {
    if (!productoSeleccionado || !cantidadVenta || !precioVenta) return

    const cantidad = parseInt(cantidadVenta)
    const precio = parseInt(precioVenta.replace(/\./g, ''))
    
    // Calcular unidades necesarias
    const unidadesNecesarias = tipoVenta === 'docena' ? cantidad * 12 : cantidad
    const stockDisponible = productoSeleccionado.stockUnidades || 0
    
    // Calcular cuánto ya está en el carrito de este producto
    const unidadesEnCarrito = itemsVenta
      .filter(item => item.productoId === productoSeleccionado.id)
      .reduce((sum, item) => sum + (item.tipoVenta === 'docena' ? item.cantidad * 12 : item.cantidad), 0)
    
    const stockReal = stockDisponible - unidadesEnCarrito
    
    // Validar stock suficiente
    if (unidadesNecesarias > stockReal) {
      const docenasDisp = Math.floor(stockReal / 12)
      const unidadesDisp = stockReal % 12
      toast.warning(
        'Stock insuficiente',
        `Disponible: ${docenasDisp > 0 ? docenasDisp + ' doc ' : ''}${unidadesDisp > 0 ? unidadesDisp + ' und' : ''}${stockReal === 0 ? '0 und' : ''} (${stockReal} total). Solicitado: ${cantidad} ${tipoVenta === 'docena' ? 'doc' : 'und'}`
      )
      return
    }

    const nuevoItem: ItemVenta = {
      productoId: productoSeleccionado.id,
      productoCodigo: productoSeleccionado.codigo,
      productoNombre: productoSeleccionado.nombre,
      productoReferencia: productoSeleccionado.referencia || '',
      cantidad,
      tipoVenta,
      precioUnitario: precio,
      subtotal: cantidad * precio
    }

    // Alertar si queda en stock mínimo o bajo
    const stockRestante = stockReal - unidadesNecesarias
    const stockMinimo = productoSeleccionado.stockMinimo || 12
    if (stockRestante <= stockMinimo && stockRestante > 0) {
      toast.warning(
        'Stock Bajo',
        `"${productoSeleccionado.nombre}" quedará con ${stockRestante} und (mín: ${stockMinimo})`
      )
    } else if (stockRestante === 0) {
      toast.warning(
        'Último producto',
        `"${productoSeleccionado.nombre}" quedará sin stock`
      )
    }

    setItemsVenta(prev => [...prev, nuevoItem])
    setProductoSeleccionado(null)
    setBusquedaProducto('')
    setCantidadVenta('')
    setPrecioVenta('')
  }

  // Quitar item
  const handleQuitarItem = (index: number) => {
    setItemsVenta(prev => prev.filter((_, i) => i !== index))
  }

  // Guardar venta/factura
  const handleGuardarVenta = () => {
    if (!clienteSeleccionado) {
      toast.error('Cliente requerido', 'Selecciona un cliente para continuar')
      return
    }
    if (itemsVenta.length === 0) {
      toast.error('Sin productos', 'Agrega al menos un producto a la venta')
      return
    }

    const { fecha, hora } = obtenerFechaHora()
    const total = itemsVenta.reduce((sum, item) => sum + item.subtotal, 0)

    // Calcular fecha de vencimiento
    let fechaVencFinal = fecha
    if (tipoPago === 'plazo') {
      if (usarFechaCustom && fechaVencimientoCustom) {
        fechaVencFinal = fechaVencimientoCustom
      } else {
        const fechaVenc = new Date()
        fechaVenc.setDate(fechaVenc.getDate() + parseInt(diasVencimiento))
        fechaVencFinal = fechaVenc.toISOString().split('T')[0]
      }
    }

    // Descontar del inventario
    const productosActualizados = [...productos]
    itemsVenta.forEach(item => {
      const productoIndex = productosActualizados.findIndex(p => p.id === item.productoId)
      if (productoIndex !== -1) {
        const cantidadUnidades = item.tipoVenta === 'docena' ? item.cantidad * 12 : item.cantidad
        productosActualizados[productoIndex] = {
          ...productosActualizados[productoIndex],
          stockUnidades: Math.max(0, (productosActualizados[productoIndex].stockUnidades || 0) - cantidadUnidades),
          ultimaActualizacion: new Date().toISOString()
        }
      }
    })
    localStorage.setItem('manifesto_inventario', JSON.stringify(productosActualizados))
    setProductos(productosActualizados)

    // Información de auditoría - quién creó la factura
    const auditoriaCreacion: AuditoriaInfo = {
      usuarioId: usuario?.id || '',
      usuarioNombre: usuario?.nombre || 'Desconocido',
      fecha: new Date().toISOString(),
      accion: 'Creación de factura'
    }

    const nuevaFactura: Factura = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      numero: generarNumeroFactura(),
      clienteId: clienteSeleccionado.id,
      clienteNombre: clienteSeleccionado.nombre,
      clienteNit: clienteSeleccionado.nit || '',
      clienteDireccion: clienteSeleccionado.direccion || '',
      clienteTelefono: clienteSeleccionado.telefono || '',
      // Usar ciudad, o departamento como respaldo
      clienteCiudad: clienteSeleccionado.ciudad || clienteSeleccionado.departamento || '',
      fecha,
      hora,
      tipoPago,
      fechaVencimiento: fechaVencFinal,
      estado: tipoPago === 'contado' || tipoPago === 'transferencia' ? 'pagada' : 'pendiente',
      items: itemsVenta,
      total,
      notas: notasVenta,
      recordatorioMostrado: false,
      creadoPor: auditoriaCreacion,
      historial: [auditoriaCreacion]
    }

    setFacturas(prev => [nuevaFactura, ...prev])
    
    // Abrir vista previa de impresión
    setFacturaPrint(nuevaFactura)
    setShowPrintPreview(true)
    
    // Limpiar formulario
    setShowModal(false)
    setClienteSeleccionado(null)
    setBusquedaCliente('')
    setItemsVenta([])
    setNotasVenta('')
    setTipoPago('contado')
    setUsarFechaCustom(false)
    setFechaVencimientoCustom('')
  }

  // Cambiar estado de factura
  const cambiarEstado = (facturaId: string, nuevoEstado: Factura['estado']) => {
    setFacturas(prev => prev.map(f => 
      f.id === facturaId ? { ...f, estado: nuevoEstado } : f
    ))
    if (facturaDetalle?.id === facturaId) {
      setFacturaDetalle({ ...facturaDetalle, estado: nuevoEstado })
    }
  }

  // Anular factura y devolver productos al stock
  const anularFactura = async (factura: Factura) => {
    // Solo administradores pueden anular
    if (!isAdmin) {
      toast.error('Acceso denegado', 'Solo los administradores pueden anular facturas')
      return
    }

    // No permitir anular si ya está anulada
    if (factura.estado === 'anulada') {
      toast.warning('Factura ya anulada', 'Esta factura ya fue anulada anteriormente')
      return
    }

    const confirmacion = await toast.confirm({
      title: 'Anular Remisión',
      message: `¿Estás seguro de anular la remisión ${factura.numero}?\n\nCliente: ${factura.clienteNombre}\nTotal: ${formatPrecio(factura.total)}\n\nLos productos serán devueltos al inventario.`,
      confirmText: 'Sí, Anular',
      cancelText: 'Cancelar',
      type: 'warning'
    })

    if (confirmacion) {
      // Devolver productos al inventario
      const productosActualizados = [...productos]
      factura.items.forEach(item => {
        const productoIndex = productosActualizados.findIndex(p => p.id === item.productoId)
        if (productoIndex !== -1) {
          const cantidadUnidades = item.tipoVenta === 'docena' ? item.cantidad * 12 : item.cantidad
          productosActualizados[productoIndex] = {
            ...productosActualizados[productoIndex],
            stockUnidades: (productosActualizados[productoIndex].stockUnidades || 0) + cantidadUnidades,
            ultimaActualizacion: new Date().toISOString()
          }
        }
      })
      localStorage.setItem('manifesto_inventario', JSON.stringify(productosActualizados))
      setProductos(productosActualizados)

      // Actualizar factura con información de auditoría
      const auditoriaAnulacion: AuditoriaInfo = {
        usuarioId: usuario?.id || '',
        usuarioNombre: usuario?.nombre || 'Desconocido',
        fecha: new Date().toISOString(),
        accion: 'Anulación de factura'
      }

      setFacturas(prev => prev.map(f => 
        f.id === factura.id 
          ? { 
              ...f, 
              estado: 'anulada' as const,
              anulado: auditoriaAnulacion,
              historial: [...(f.historial || []), auditoriaAnulacion]
            } 
          : f
      ))
      
      if (facturaDetalle?.id === factura.id) {
        setFacturaDetalle({ ...facturaDetalle, estado: 'anulada', anulado: auditoriaAnulacion })
      }
      
      toast.success(
        'Factura anulada',
        `Remisión ${factura.numero} anulada. Productos devueltos al inventario.`
      )
    }
  }

  // Eliminar factura
  const eliminarFactura = async (factura: Factura) => {
    // Solo administradores pueden eliminar
    if (!isAdmin) {
      toast.error('Acceso denegado', 'Solo los administradores pueden eliminar facturas')
      return
    }

    const confirmacion = await toast.confirm({
      title: 'Eliminar Remisión',
      message: `¿Estás seguro de ELIMINAR permanentemente la remisión ${factura.numero}?\n\nCliente: ${factura.clienteNombre}\nTotal: ${formatPrecio(factura.total)}\n\n⚠️ Los productos NO serán devueltos al inventario.\n\nEsta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    })

    if (confirmacion) {
      setFacturas(prev => prev.filter(f => f.id !== factura.id))
      toast.success('Factura eliminada', `Remisión ${factura.numero} eliminada correctamente`)
    }
  }

  // Marcar recordatorio como mostrado
  const marcarRecordatorioVisto = (facturaId: string) => {
    setFacturas(prev => prev.map(f => 
      f.id === facturaId ? { ...f, recordatorioMostrado: true } : f
    ))
  }

  // Obtener facturas con recordatorio (3 días antes del vencimiento)
  const facturasConRecordatorio = facturas.filter(f => {
    if (f.estado !== 'pendiente' || f.recordatorioMostrado) return false
    if (f.tipoPago !== 'plazo') return false
    
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fechaVenc = new Date(f.fechaVencimiento)
    fechaVenc.setHours(0, 0, 0, 0)
    
    const diffTime = fechaVenc.getTime() - hoy.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays <= 3 && diffDays >= 0
  })

  // Función para actualizar datos del cliente en una factura
  const actualizarDatosClienteEnFactura = (factura: Factura): Factura => {
    const clienteActual = clientes.find(c => c.id === factura.clienteId)
    if (clienteActual) {
      return {
        ...factura,
        clienteNombre: clienteActual.nombre,
        clienteNit: clienteActual.nit || factura.clienteNit,
        clienteTelefono: clienteActual.telefono || factura.clienteTelefono,
        clienteDireccion: clienteActual.direccion || factura.clienteDireccion,
        // Usar ciudad, o departamento como respaldo
        clienteCiudad: clienteActual.ciudad || clienteActual.departamento || factura.clienteCiudad,
      }
    }
    return factura
  }

  // Abrir vista previa con datos actualizados del cliente
  const abrirVistaPrevia = (factura: Factura) => {
    const facturaActualizada = actualizarDatosClienteEnFactura(factura)
    setFacturaPrint(facturaActualizada)
    setShowPrintPreview(true)
  }

  // Ver detalles con datos actualizados del cliente  
  const verDetallesFactura = (factura: Factura) => {
    const facturaActualizada = actualizarDatosClienteEnFactura(factura)
    // Abrir la misma vista previa profesional
    setFacturaPrint(facturaActualizada)
    setShowPrintPreview(true)
  }

  // Abrir modal de abono
  const abrirModalAbono = (factura: Factura) => {
    setFacturaAbono(factura)
    setMontoAbono('')
    setMetodoAbono('efectivo')
    setNotaAbono('')
    setShowModalAbono(true)
  }

  // Registrar un abono a la factura
  const registrarAbono = () => {
    if (!facturaAbono || !montoAbono) {
      toast.warning('Campo requerido', 'Ingrese el monto del abono')
      return
    }

    const monto = parseFloat(montoAbono.replace(/\./g, '').replace(',', '.'))
    if (isNaN(monto) || monto <= 0) {
      toast.warning('Monto inválido', 'El monto debe ser mayor a 0')
      return
    }

    const saldoActual = facturaAbono.saldoPendiente ?? facturaAbono.total
    if (monto > saldoActual) {
      toast.warning('Monto excedido', `El abono no puede ser mayor al saldo pendiente (${formatPrecio(saldoActual)})`)
      return
    }

    const nuevoAbono: Abono = {
      id: Date.now().toString(),
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      monto,
      metodoPago: metodoAbono,
      nota: notaAbono,
      registradoPor: usuario?.nombre || 'Sistema'
    }

    const abonosActuales = facturaAbono.abonos || []
    const totalAbonadoNuevo = (facturaAbono.totalAbonado || 0) + monto
    const saldoPendienteNuevo = facturaAbono.total - totalAbonadoNuevo

    // Determinar nuevo estado
    let nuevoEstado = facturaAbono.estado
    if (saldoPendienteNuevo <= 0) {
      nuevoEstado = 'pagada'
    }

    setFacturas(prev => prev.map(f => 
      f.id === facturaAbono.id 
        ? {
            ...f,
            abonos: [...abonosActuales, nuevoAbono],
            totalAbonado: totalAbonadoNuevo,
            saldoPendiente: saldoPendienteNuevo,
            estado: nuevoEstado,
            historial: [
              ...(f.historial || []),
              {
                usuarioId: usuario?.id || '',
                usuarioNombre: usuario?.nombre || 'Sistema',
                fecha: new Date().toISOString(),
                accion: `Abono registrado: ${formatPrecio(monto)} - ${metodoAbono}`
              }
            ]
          }
        : f
    ))

    toast.success('Abono registrado', `Abono de ${formatPrecio(monto)} registrado correctamente`)
    setShowModalAbono(false)
    setFacturaAbono(null)
  }

  // Imprimir factura usando iframe para mejor compatibilidad
  const handlePrint = () => {
    const printArea = document.getElementById('print-area')
    if (!printArea) return

    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Remisión ${facturaPrint?.numero || ''}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 5mm 8mm;
            font-size: 11px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4 portrait; margin: 3mm; }
          
          /* Colores y fondos */
          .bg-gray-800 { background-color: #1f2937 !important; }
          .bg-green-600 { background-color: #16a34a !important; }
          .bg-blue-600 { background-color: #2563eb !important; }
          .bg-gradient-to-r { background: linear-gradient(to right, #1e3a5f, #2563eb); }
          .text-white { color: white !important; }
          .font-bold { font-weight: bold; }
          .font-semibold { font-weight: 600; }
          .font-black { font-weight: 900; }
          .text-xs { font-size: 9px; }
          .text-sm { font-size: 10px; }
          .text-lg { font-size: 14px; }
          .text-xl { font-size: 16px; }
          .text-2xl { font-size: 18px; }
          .text-4xl { font-size: 28px; }
          .text-gray-400 { color: #9ca3af; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-700 { color: #374151; }
          .text-gray-800 { color: #1f2937; }
          .text-gray-900 { color: #111827; }
          .text-red-600 { color: #dc2626; }
          .text-green-600 { color: #16a34a; }
          .text-green-700 { color: #15803d; }
          .text-orange-600 { color: #ea580c; }
          .text-orange-700 { color: #c2410c; }
          .text-blue-600 { color: #2563eb; }
          .text-blue-700 { color: #1d4ed8; }
          .text-purple-700 { color: #7c3aed; }
          .bg-white { background: white; }
          .bg-gray-50 { background: #f9fafb; }
          .bg-gray-100 { background: #f3f4f6; }
          .bg-gray-200 { background: #e5e7eb; }
          .bg-red-50 { background: #fef2f2; }
          .bg-orange-50 { background: #fff7ed; }
          .bg-green-50 { background: #f0fdf4; }
          .bg-blue-50 { background: #eff6ff; }
          .bg-blue-100 { background: #dbeafe; }
          .bg-purple-100 { background: #f3e8ff; }
          .bg-yellow-50 { background: #fefce8; }
          .border { border: 1px solid #e5e7eb; }
          .border-2 { border: 2px solid #e5e7eb; }
          .border-3 { border: 3px solid; }
          .border-b { border-bottom: 1px solid #e5e7eb; }
          .border-t-2 { border-top: 2px solid; }
          .border-gray-100 { border-color: #f3f4f6; }
          .border-gray-200 { border-color: #e5e7eb; }
          .border-gray-300 { border-color: #d1d5db; }
          .border-gray-400 { border-color: #9ca3af; }
          .border-red-600 { border-color: #dc2626; }
          .border-orange-300 { border-color: #fdba74; }
          .border-orange-400 { border-color: #fb923c; }
          .border-green-300 { border-color: #86efac; }
          .border-blue-300 { border-color: #93c5fd; }
          .border-yellow-200 { border-color: #fef08a; }
          .rounded { border-radius: 0.25rem; }
          .rounded-lg { border-radius: 0.5rem; }
          .rounded-xl { border-radius: 0.75rem; }
          .rounded-full { border-radius: 9999px; }
          .p-2 { padding: 4px; }
          .p-3 { padding: 6px; }
          .p-4 { padding: 8px; }
          .p-5 { padding: 10px; }
          .p-6 { padding: 12px; }
          .px-2 { padding-left: 4px; padding-right: 4px; }
          .px-3 { padding-left: 6px; padding-right: 6px; }
          .px-4 { padding-left: 8px; padding-right: 8px; }
          .px-5 { padding-left: 10px; padding-right: 10px; }
          .py-1 { padding-top: 2px; padding-bottom: 2px; }
          .py-2 { padding-top: 4px; padding-bottom: 4px; }
          .py-3 { padding-top: 6px; padding-bottom: 6px; }
          .py-4 { padding-top: 8px; padding-bottom: 8px; }
          .pt-2 { padding-top: 4px; }
          .pt-4 { padding-top: 8px; }
          .pb-2 { padding-bottom: 4px; }
          .mt-1 { margin-top: 2px; }
          .mt-2 { margin-top: 4px; }
          .mt-3 { margin-top: 6px; }
          .mt-4 { margin-top: 8px; }
          .mt-6 { margin-top: 12px; }
          .mb-1 { margin-bottom: 2px; }
          .mb-3 { margin-bottom: 6px; }
          .mb-4 { margin-bottom: 8px; }
          .mb-5 { margin-bottom: 10px; }
          .mb-6 { margin-bottom: 12px; }
          .ml-2 { margin-left: 4px; }
          .gap-1 { gap: 2px; }
          .gap-2 { gap: 4px; }
          .gap-4 { gap: 8px; }
          .gap-x-8 { column-gap: 16px; }
          .gap-y-2 { row-gap: 4px; }
          .space-y-0\\.5 > * + * { margin-top: 2px; }
          .flex { display: flex; }
          .inline-flex { display: inline-flex; }
          .inline-block { display: inline-block; }
          .hidden { display: none; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .items-center { align-items: center; }
          .items-start { align-items: flex-start; }
          .items-end { align-items: flex-end; }
          .justify-center { justify-content: center; }
          .justify-between { justify-content: space-between; }
          .justify-end { justify-content: flex-end; }
          .flex-1 { flex: 1; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .uppercase { text-transform: uppercase; }
          .tracking-wide { letter-spacing: 0.025em; }
          .tracking-wider { letter-spacing: 0.05em; }
          .tracking-tight { letter-spacing: -0.025em; }
          .relative { position: relative; }
          .absolute { position: absolute; }
          .inset-0 { inset: 0; }
          .overflow-hidden { overflow: hidden; }
          .pointer-events-none { pointer-events: none; }
          .opacity-30 { opacity: 0.3; }
          .opacity-20 { opacity: 0.2; }
          .transform { transform: rotate(-45deg); }
          .-rotate-45 { transform: rotate(-45deg); }
          .whitespace-nowrap { white-space: nowrap; }
          .shrink-0 { flex-shrink: 0; }
          .col-span-2 { grid-column: span 2; }
          .w-full { width: 100%; }
          .w-8 { width: 20px; }
          .w-20 { width: 50px; }
          .w-24 { width: 60px; }
          .w-28 { width: 70px; }
          .w-32 { width: 80px; }
          .w-48 { width: 120px; }
          .h-1 { height: 3px; }
          .h-4 { height: 12px; }
          .h-8 { height: 20px; }
          .h-10 { height: 25px; }
          .h-20 { height: 50px; }
          .h-24 { height: 60px; }
          .object-contain { object-fit: contain; }
          .shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          
          /* Tabla optimizada para 20+ items */
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          thead tr { background-color: #1f2937 !important; }
          thead th { 
            padding: 6px 8px; 
            text-align: left; 
            color: white !important; 
            font-weight: 600; 
            font-size: 9px; 
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          tbody td { 
            padding: 4px 8px; 
            border-bottom: 1px solid #e5e7eb;
            font-size: 10px;
          }
          tbody tr:nth-child(even) { background: #f9fafb; }
          tfoot tr { background-color: #16a34a !important; }
          tfoot td { 
            padding: 8px; 
            color: white !important; 
            font-weight: bold;
          }
          
          /* Ocultar marca de agua en impresión */
          .watermark-container { display: none; }
          
          /* Saltos de página */
          .page-break { page-break-before: always; }
          
          /* Logo compacto */
          img { max-height: 50px; max-width: 50px; }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
      </body>
      </html>
    `)
    doc.close()

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }, 250)
    }
  }

  // Resumen
  const resumen = {
    total: facturas.length,
    porCobrar: facturas.filter(f => f.estado === 'pendiente').reduce((sum, f) => sum + f.total, 0),
    pendientes: facturas.filter(f => f.estado === 'pendiente').length,
    vencidas: facturas.filter(f => f.estado === 'vencida').length,
    recaudado: facturas.filter(f => f.estado === 'pagada').reduce((sum, f) => sum + f.total, 0)
  }

  return (
    <div className="space-y-6">
      {/* Notificación de Recordatorios */}
      {facturasConRecordatorio.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
              <Bell className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-orange-800 dark:text-orange-300 flex items-center gap-2">
                ¡Recordatorio de Cobros!
                <span className="bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full">{facturasConRecordatorio.length}</span>
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                Tienes facturas próximas a vencer (3 días o menos):
              </p>
              <div className="mt-3 space-y-2">
                {facturasConRecordatorio.map(f => {
                  const fechaVenc = new Date(f.fechaVencimiento)
                  const hoy = new Date()
                  const diffDays = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={f.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {f.numero} - {f.clienteNombre}
                        </p>
                        <p className="text-sm text-gray-500">
                          Vence: {f.fechaVencimiento} ({diffDays === 0 ? '¡HOY!' : diffDays === 1 ? 'Mañana' : `En ${diffDays} días`})
                        </p>
                        <p className="text-sm font-bold text-orange-600">{formatPrecio(f.total)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => cambiarEstado(f.id, 'pagada')}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                          Marcar Pagada
                        </button>
                        <button
                          onClick={() => marcarRecordatorioVisto(f.id)}
                          className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          Ocultar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ventas / Remisiones</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Sistema de facturación y control de ventas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModalConfig(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Settings className="h-4 w-4" />
            Configurar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Nueva Venta
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Ventas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{resumen.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Por Cobrar</p>
              <p className="text-lg font-bold text-yellow-600">{formatPrecio(resumen.porCobrar)}</p>
              <p className="text-xs text-gray-400">{resumen.pendientes} pendientes</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Vencidas</p>
              <p className="text-2xl font-bold text-red-600">{resumen.vencidas}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Recaudado</p>
              <p className="text-lg font-bold text-green-600">{formatPrecio(resumen.recaudado)}</p>
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
              placeholder="Buscar por número, cliente o NIT..."
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
            <option value="pagada">Pagada</option>
            <option value="vencida">Vencida</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
      </div>

      {/* Lista de facturas */}
      {facturasFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Receipt className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No hay ventas registradas
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Crea una nueva venta para comenzar
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          <div className="overflow-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Remisión</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Saldo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {facturasFiltradas.map((factura) => {
                  const config = estadoConfig[factura.estado]
                  const Icon = config.icon
                  return (
                    <tr key={factura.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-red-600">{factura.numero}</p>
                          <p className="text-xs text-gray-500">{factura.items.length} producto(s)</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{factura.clienteNombre}</p>
                          <p className="text-xs text-gray-500">NIT: {factura.clienteNit}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {factura.fecha}
                          </div>
                          <p className="text-xs">{factura.hora}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {formatPrecio(factura.total)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {factura.abonos && factura.abonos.length > 0 ? (
                          <div>
                            <span className={`text-sm font-bold ${(factura.saldoPendiente ?? factura.total) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {formatPrecio(factura.saldoPendiente ?? factura.total)}
                            </span>
                            <p className="text-[10px] text-gray-500">
                              Abonado: {formatPrecio(factura.totalAbonado || 0)}
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
                            onClick={() => verDetallesFactura(factura)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => abrirVistaPrevia(factura)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                            title="Imprimir"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {/* Botón de abonar - solo si tiene saldo pendiente */}
                          {factura.estado !== 'anulada' && factura.estado !== 'pagada' && (
                            <button
                              onClick={() => abrirModalAbono(factura)}
                              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg"
                              title="Registrar abono"
                            >
                              <Banknote className="h-4 w-4" />
                            </button>
                          )}
                          {/* Solo admin puede anular */}
                          {factura.estado !== 'anulada' && isAdmin && (
                            <button
                              onClick={() => anularFactura(factura)}
                              className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg"
                              title="Anular (Solo Admin)"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {/* Solo admin puede eliminar */}
                          {isAdmin && (
                            <button
                              onClick={() => eliminarFactura(factura)}
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

      {/* Modal Nueva Venta */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Nueva Venta
                </h2>
                <p className="text-sm text-gray-500">Remisión N° {generarNumeroFactura()}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Selección de Cliente */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Cliente
                </h3>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={busquedaCliente}
                    onChange={(e) => {
                      setBusquedaCliente(e.target.value)
                      setShowClienteDropdown(true)
                      if (!e.target.value) setClienteSeleccionado(null)
                    }}
                    onFocus={() => setShowClienteDropdown(true)}
                    placeholder="Buscar cliente por nombre, NIT o teléfono..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  
                  {showClienteDropdown && busquedaCliente && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {clientesFiltrados.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No se encontraron clientes</div>
                      ) : (
                        clientesFiltrados.slice(0, 8).map(cliente => (
                          <button
                            key={cliente.id}
                            type="button"
                            onClick={() => handleSeleccionarCliente(cliente)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{cliente.nombre}</p>
                            <p className="text-xs text-gray-500">
                              NIT: {cliente.nit} | Tel: {cliente.telefono} {cliente.ciudad && `| ${cliente.ciudad}`}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {clienteSeleccionado && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{clienteSeleccionado.nombre}</p>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                          <p>NIT: {clienteSeleccionado.nit}</p>
                          <p>Tel: {clienteSeleccionado.telefono}</p>
                          {clienteSeleccionado.direccion && <p>Dir: {clienteSeleccionado.direccion}</p>}
                          {clienteSeleccionado.ciudad && <p>Ciudad: {clienteSeleccionado.ciudad}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setClienteSeleccionado(null)
                          setBusquedaCliente('')
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Agregar productos */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Productos
                </h3>
                
                {/* Búsqueda de producto */}
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
                    placeholder="Buscar producto por nombre, código o referencia..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  
                  {showProductoDropdown && busquedaProducto && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {productosFiltrados.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No se encontraron productos</div>
                      ) : (
                        productosFiltrados.slice(0, 10).map(producto => {
                          const stockUnidades = producto.stockUnidades || 0
                          const stockMinimo = producto.stockMinimo || 12
                          const sinStock = stockUnidades === 0
                          const stockBajo = stockUnidades > 0 && stockUnidades <= stockMinimo
                          
                          return (
                            <button
                              key={producto.id}
                              type="button"
                              onClick={() => !sinStock && handleSeleccionarProducto(producto)}
                              disabled={sinStock}
                              className={`w-full px-4 py-3 text-left flex items-center justify-between border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                sinStock 
                                  ? 'bg-red-50 dark:bg-red-900/20 cursor-not-allowed opacity-70' 
                                  : stockBajo 
                                  ? 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' 
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium ${sinStock ? 'text-red-600 dark:text-red-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                                    {producto.codigo} - {producto.nombre}
                                  </p>
                                  {sinStock && (
                                    <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full uppercase">Sin Stock</span>
                                  )}
                                  {stockBajo && !sinStock && (
                                    <span className="px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded-full uppercase">Stock Bajo</span>
                                  )}
                                </div>
                                <p className={`text-xs ${sinStock ? 'text-red-400' : stockBajo ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500'}`}>
                                  {producto.referencia && `Ref: ${producto.referencia} | `}
                                  Stock: {formatStock(stockUnidades)} {stockBajo && !sinStock && `(Mín: ${stockMinimo})`}
                                </p>
                              </div>
                              <div className="text-right text-xs">
                                <p className="text-gray-600 dark:text-gray-400">Und: {formatPrecio(producto.precioUnidad || 0)}</p>
                                <p className="text-gray-600 dark:text-gray-400">Doc: {formatPrecio(producto.precioDocena || 0)}</p>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Producto seleccionado */}
                {productoSeleccionado && (() => {
                  const stockUnidades = productoSeleccionado.stockUnidades || 0
                  const stockMinimo = productoSeleccionado.stockMinimo || 12
                  const unidadesEnCarrito = itemsVenta
                    .filter(item => item.productoId === productoSeleccionado.id)
                    .reduce((sum, item) => sum + (item.tipoVenta === 'docena' ? item.cantidad * 12 : item.cantidad), 0)
                  const stockDisponible = stockUnidades - unidadesEnCarrito
                  const stockBajo = stockDisponible > 0 && stockDisponible <= stockMinimo
                  
                  return (
                  <div className={`rounded-lg p-4 border ${
                    stockBajo 
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' 
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}>
                    {/* Alerta de stock bajo */}
                    {stockBajo && (
                      <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-400 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                          ¡Alerta! Este producto tiene stock bajo ({stockDisponible} und disponibles, mínimo: {stockMinimo})
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{productoSeleccionado.nombre}</p>
                        <p className="text-sm text-gray-500">
                          {productoSeleccionado.codigo} | 
                          <span className={stockBajo ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : ''}>
                            Stock disponible: {formatStock(stockDisponible)}
                          </span>
                          {unidadesEnCarrito > 0 && (
                            <span className="text-blue-600 dark:text-blue-400 ml-1">
                              ({unidadesEnCarrito} ya en carrito)
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setProductoSeleccionado(null)
                          setBusquedaProducto('')
                          setPrecioVenta('')
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
                        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                          <button
                            type="button"
                            onClick={() => handleCambioTipoVenta('unidad')}
                            className={`flex-1 px-3 py-2 text-sm font-medium ${
                              tipoVenta === 'unidad' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            Unidad
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCambioTipoVenta('docena')}
                            className={`flex-1 px-3 py-2 text-sm font-medium ${
                              tipoVenta === 'docena' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            Docena
                          </button>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cantidad</label>
                        <input
                          type="number"
                          value={cantidadVenta}
                          onChange={(e) => setCantidadVenta(e.target.value)}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Precio {tipoVenta === 'unidad' ? 'Unidad' : 'Docena'}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="text"
                            value={precioVenta}
                            onChange={(e) => {
                              const valor = e.target.value.replace(/\D/g, '')
                              setPrecioVenta(valor ? formatNumero(parseInt(valor)) : '')
                            }}
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 flex items-end">
                        <button
                          onClick={handleAgregarItem}
                          disabled={!cantidadVenta || !precioVenta}
                          className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )})()}

              </div>

              {/* Lista de productos en la venta - SIEMPRE VISIBLE */}
              <div className="border-2 border-green-200 dark:border-green-800 rounded-xl p-4 bg-green-50/30 dark:bg-green-900/10">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                  <ShoppingCart className="h-5 w-5" />
                  Productos en esta venta ({itemsVenta.length})
                </h3>
                
                {itemsVenta.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No hay productos agregados</p>
                    <p className="text-sm">Busca y agrega productos arriba</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-green-100 dark:bg-green-900/30">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Producto</th>
                          <th className="px-3 py-2 text-center font-semibold">Cant.</th>
                          <th className="px-3 py-2 text-right font-semibold">Precio</th>
                          <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                          <th className="px-3 py-2 text-center font-semibold">Quitar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-200 dark:divide-green-800">
                        {itemsVenta.map((item, index) => (
                          <tr key={index} className="bg-white dark:bg-gray-800">
                            <td className="px-3 py-2">
                              <span className="font-medium">{item.productoNombre}</span>
                              <span className="text-xs text-gray-500 ml-1">({item.tipoVenta === 'unidad' ? 'Und' : 'Doc'})</span>
                            </td>
                            <td className="px-3 py-2 text-center font-medium">{item.cantidad}</td>
                            <td className="px-3 py-2 text-right">{formatPrecio(item.precioUnitario)}</td>
                            <td className="px-3 py-2 text-right font-bold text-green-600">{formatPrecio(item.subtotal)}</td>
                            <td className="px-3 py-2 text-center">
                              <button 
                                onClick={() => handleQuitarItem(index)} 
                                className="p-1 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-green-200 dark:bg-green-900/50 font-bold">
                        <tr className="text-lg">
                          <td colSpan={3} className="px-3 py-3 text-right">TOTAL:</td>
                          <td className="px-3 py-3 text-right text-green-700 dark:text-green-400 text-xl">
                            {formatPrecio(itemsVenta.reduce((sum, i) => sum + i.subtotal, 0))}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Tipo de Pago */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Pago
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoPago('contado')
                        setDiasVencimiento('0')
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        tipoPago === 'contado'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <Banknote className="h-5 w-5" />
                      <span className="font-medium">Contado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoPago('transferencia')
                        setDiasVencimiento('0')
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        tipoPago === 'transferencia'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span className="font-medium">Transferencia</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoPago('plazo')
                        setDiasVencimiento('15')
                        setUsarFechaCustom(false)
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        tipoPago === 'plazo'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <CalendarClock className="h-5 w-5" />
                      <span className="font-medium">A Plazo</span>
                    </button>
                  </div>
                </div>

                {/* Opciones de Plazo */}
                {tipoPago === 'plazo' && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-4 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tipoFecha"
                          checked={!usarFechaCustom}
                          onChange={() => setUsarFechaCustom(false)}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Días predefinidos</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tipoFecha"
                          checked={usarFechaCustom}
                          onChange={() => setUsarFechaCustom(true)}
                          className="w-4 h-4 text-orange-600"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha específica</span>
                      </label>
                    </div>

                    {!usarFechaCustom ? (
                      <div className="flex gap-2">
                        {['15', '30', '45', '60', '90'].map(dias => (
                          <button
                            key={dias}
                            type="button"
                            onClick={() => setDiasVencimiento(dias)}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                              diasVencimiento === dias
                                ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300'
                            }`}
                          >
                            {dias} días
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <input
                          type="date"
                          value={fechaVencimientoCustom}
                          onChange={(e) => setFechaVencimientoCustom(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        {fechaVencimientoCustom && (
                          <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                            Fecha de vencimiento: {new Date(fechaVencimientoCustom + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Indicador de estado */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  tipoPago === 'contado' || tipoPago === 'transferencia'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                }`}>
                  {tipoPago === 'contado' || tipoPago === 'transferencia' ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">Esta venta se marcará como PAGADA automáticamente</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Esta venta quedará PENDIENTE de cobro</span>
                    </>
                  )}
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notas / Observaciones
                  </label>
                  <input
                    type="text"
                    value={notasVenta}
                    onChange={(e) => setNotasVenta(e.target.value)}
                    placeholder="Observaciones adicionales..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
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
                onClick={handleGuardarVenta}
                disabled={!clienteSeleccionado || itemsVenta.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Guardar y Generar Remisión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuración Empresa */}
      {showModalConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configuración de Empresa</h2>
              <button onClick={() => setShowModalConfig(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Cerrar">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Logo de la empresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo de la Empresa</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-700">
                    {configEmpresa.logo ? (
                      <img src={configEmpresa.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Package className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            toast.warning('Archivo muy grande', 'La imagen no debe superar 2MB')
                            return
                          }
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setConfigEmpresa(prev => ({ ...prev, logo: reader.result as string }))
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      <Package className="h-4 w-4" />
                      Cambiar Logo
                    </label>
                    {configEmpresa.logo && (
                      <button
                        onClick={() => setConfigEmpresa(prev => ({ ...prev, logo: '' }))}
                        className="ml-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                      >
                        Eliminar
                      </button>
                    )}
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG hasta 2MB</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Empresa</label>
                <input
                  type="text"
                  value={configEmpresa.nombre}
                  onChange={(e) => setConfigEmpresa(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slogan</label>
                <input
                  type="text"
                  value={configEmpresa.slogan}
                  onChange={(e) => setConfigEmpresa(prev => ({ ...prev, slogan: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NIT</label>
                  <input
                    type="text"
                    value={configEmpresa.nit}
                    onChange={(e) => setConfigEmpresa(prev => ({ ...prev, nit: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={configEmpresa.whatsapp}
                    onChange={(e) => setConfigEmpresa(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                <input
                  type="text"
                  value={configEmpresa.direccion}
                  onChange={(e) => setConfigEmpresa(prev => ({ ...prev, direccion: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={configEmpresa.ciudad}
                  onChange={(e) => setConfigEmpresa(prev => ({ ...prev, ciudad: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={configEmpresa.email}
                  onChange={(e) => setConfigEmpresa(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="correo@empresa.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowModalConfig(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Abono */}
      {showModalAbono && facturaAbono && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-purple-600" />
                  Registrar Abono
                </h2>
                <p className="text-sm text-gray-500">Remisión {facturaAbono.numero} - {facturaAbono.clienteNombre}</p>
              </div>
              <button onClick={() => setShowModalAbono(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Resumen de la factura */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total factura:</span>
                  <span className="font-bold">{formatPrecio(facturaAbono.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total abonado:</span>
                  <span className="font-medium text-green-600">{formatPrecio(facturaAbono.totalAbonado || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Saldo pendiente:</span>
                  <span className="font-bold text-orange-600 text-lg">{formatPrecio(facturaAbono.saldoPendiente ?? facturaAbono.total)}</span>
                </div>
              </div>

              {/* Historial de abonos */}
              {facturaAbono.abonos && facturaAbono.abonos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Historial de abonos</h3>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {facturaAbono.abonos.map((abono, idx) => (
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

      {/* Modal Detalle Factura */}
      {facturaDetalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Remisión {facturaDetalle.numero}
                </h2>
                <p className="text-sm text-gray-500">{facturaDetalle.clienteNombre}</p>
              </div>
              <button onClick={() => setFacturaDetalle(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="font-medium">{facturaDetalle.fecha} {facturaDetalle.hora}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vencimiento</p>
                  <p className="font-medium">{facturaDetalle.fechaVencimiento}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">NIT Cliente</p>
                  <p className="font-medium">{facturaDetalle.clienteNit}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Productos</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-center">Cant.</th>
                      <th className="px-3 py-2 text-right">Precio</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {facturaDetalle.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{item.productoNombre} ({item.tipoVenta === 'unidad' ? 'Und' : 'Doc'})</td>
                        <td className="px-3 py-2 text-center">{item.cantidad}</td>
                        <td className="px-3 py-2 text-right">{formatPrecio(item.precioUnitario)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatPrecio(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700 font-bold">
                    <tr className="text-lg">
                      <td colSpan={3} className="px-3 py-3 text-right">TOTAL:</td>
                      <td className="px-3 py-3 text-right text-green-600">{formatPrecio(facturaDetalle.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Cambiar Estado</p>
                <div className="flex flex-wrap gap-2">
                  {(['pendiente', 'pagada', 'vencida', 'anulada'] as const).map(estado => (
                    <button
                      key={estado}
                      onClick={() => cambiarEstado(facturaDetalle.id, estado)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        facturaDetalle.estado === estado 
                          ? estadoConfig[estado].color 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {estadoConfig[estado].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Historial de Abonos */}
              {facturaDetalle.abonos && facturaDetalle.abonos.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Banknote className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-700 dark:text-green-400">Historial de Abonos</h3>
                    <span className="ml-auto text-sm font-medium text-green-600">
                      Total: {formatPrecio(facturaDetalle.totalAbonado || 0)} | Saldo: {formatPrecio(facturaDetalle.saldoPendiente ?? facturaDetalle.total)}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {facturaDetalle.abonos.map((abono, idx) => (
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

              {/* Información de auditoría */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">Información de Auditoría</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {facturaDetalle.creadoPor && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Creada por:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {facturaDetalle.creadoPor.usuarioNombre} ({new Date(facturaDetalle.creadoPor.fecha).toLocaleString('es-CO')})
                      </span>
                    </div>
                  )}
                  {facturaDetalle.anulado && (
                    <div className="flex justify-between text-orange-600">
                      <span>Anulada por:</span>
                      <span className="font-medium">
                        {facturaDetalle.anulado.usuarioNombre} ({new Date(facturaDetalle.anulado.fecha).toLocaleString('es-CO')})
                      </span>
                    </div>
                  )}
                  {!facturaDetalle.creadoPor && !facturaDetalle.anulado && (
                    <p className="text-gray-400 italic">Sin información de auditoría (factura antigua)</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (facturaDetalle) {
                      abrirVistaPrevia(facturaDetalle)
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Remisión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vista Previa de Impresión */}
      {showPrintPreview && facturaPrint && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 print:bg-white print:p-0" id="print-modal">
          <div className="bg-white rounded-lg shadow-2xl max-w-[210mm] w-full max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none print:rounded-none">
            {/* Toolbar - NO IMPRIMIR */}
            <div className="sticky top-0 bg-gray-100 px-4 py-3 flex items-center justify-between border-b print:hidden">
              <h3 className="font-medium text-gray-700">Vista Previa de Remisión</h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg"
                  title="Cerrar"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Documento de Remisión - Diseño Profesional */}
            <div ref={printRef} className="p-6 bg-white relative print:p-0 flex flex-col min-h-[90vh] print:min-h-[100vh]" id="print-area">
              {/* Marca de agua diagonal */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <span className="text-[120px] font-bold text-gray-200 transform -rotate-45 whitespace-nowrap opacity-30 print:opacity-20 print:text-[80px]">
                  {configEmpresa.nombre}
                </span>
              </div>

              {/* === ENCABEZADO === */}
              <div className="relative flex items-start justify-between mb-4">
                {/* Logo GRANDE y datos empresa */}
                <div className="flex items-center gap-3 flex-1">
                  <img 
                    src={configEmpresa.logo} 
                    alt="Logo" 
                    className="h-28 w-28 object-contain rounded-lg border-2 border-gray-300 bg-white shadow-sm print:h-28 print:w-28"
                    style={{ minWidth: '112px', minHeight: '112px' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <div className="flex-1">
                    <h1 className="text-3xl font-black text-gray-900">{configEmpresa.nombre}</h1>
                    <p className="text-base text-gray-700">Tel: {configEmpresa.whatsapp}</p>
                    <p className="text-base text-gray-700">NIT: {configEmpresa.nit}</p>
                    {configEmpresa.email && <p className="text-base text-gray-700">{configEmpresa.email}</p>}
                  </div>
                </div>

                {/* Número de remisión y fechas */}
                <div className="text-right">
                  <div className="border-2 border-red-600 rounded-lg px-4 py-2 bg-red-50 inline-block mb-2">
                    <p className="text-[10px] font-semibold text-gray-600 uppercase">Remisión de Despacho</p>
                    <p className="text-3xl font-black text-red-600">N° {facturaPrint.numero.replace('REM-', '')}</p>
                  </div>
                  <div className="flex justify-end gap-3 text-sm">
                    <div className="border border-gray-300 rounded px-2 py-1 bg-gray-50">
                      <span className="text-gray-500">Fecha:</span> <span className="font-bold">{facturaPrint.fecha}</span>
                    </div>
                    <div className="border border-gray-300 rounded px-2 py-1 bg-gray-50">
                      <span className="text-gray-500">Hora:</span> <span className="font-bold">{facturaPrint.hora}</span>
                    </div>
                  </div>
                  {facturaPrint.tipoPago === 'plazo' && facturaPrint.fechaVencimiento && (
                    <div className="mt-1">
                      <span className="inline-block border border-orange-400 bg-orange-50 rounded px-2 py-1 text-xs">
                        <span className="text-orange-600 font-semibold">Vence:</span> <span className="font-bold text-orange-700">{facturaPrint.fechaVencimiento}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Línea divisora */}
              <div className="h-1 bg-gradient-to-r from-blue-600 via-green-500 to-blue-600 rounded-full mb-3"></div>

              {/* === DATOS DEL CLIENTE === */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-bold text-gray-500 uppercase mb-2">Datos del Cliente</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-base">
                  <div><span className="text-gray-500">Cliente:</span> <span className="font-bold text-gray-900">{facturaPrint.clienteNombre}</span></div>
                  <div><span className="text-gray-500">Teléfono:</span> <span className="font-semibold">{facturaPrint.clienteTelefono || '-'}</span></div>
                  <div><span className="text-gray-500">NIT/CC:</span> <span className="font-semibold">{facturaPrint.clienteNit || '-'}</span></div>
                  <div><span className="text-gray-500">Ciudad:</span> <span className="font-semibold">{facturaPrint.clienteCiudad || '-'}</span></div>
                  <div className="col-span-2"><span className="text-gray-500">Dirección:</span> <span className="font-semibold">{facturaPrint.clienteDireccion || '-'}</span></div>
                </div>
              </div>

              {/* === TABLA DE PRODUCTOS COMPACTA === */}
              <div className="mb-3">
                <table className="w-full border-collapse text-base">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="px-2 py-2 text-center font-semibold uppercase text-sm w-12">Cant.</th>
                      <th className="px-2 py-2 text-center font-semibold uppercase text-sm w-14">Tipo</th>
                      <th className="px-2 py-2 text-left font-semibold uppercase text-sm">Descripción</th>
                      <th className="px-2 py-2 text-center font-semibold uppercase text-sm w-20">Ref.</th>
                      <th className="px-2 py-2 text-right font-semibold uppercase text-sm w-20">P. Unit.</th>
                      <th className="px-2 py-2 text-right font-semibold uppercase text-sm w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturaPrint.items.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border-b border-gray-200 px-2 py-1 text-center font-bold text-base text-gray-900">
                          {item.cantidad}
                        </td>
                        <td className="border-b border-gray-200 px-2 py-1 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.tipoVenta === 'unidad' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.tipoVenta === 'unidad' ? 'UND' : 'DOC'}
                          </span>
                        </td>
                        <td className="border-b border-gray-200 px-2 py-1">
                          <span className="font-semibold text-gray-900">{item.productoNombre}</span>
                          <span className="text-sm text-gray-500 ml-1">({item.productoCodigo})</span>
                        </td>
                        <td className="border-b border-gray-200 px-2 py-1 text-center text-sm text-gray-600 font-medium">
                          {item.productoReferencia || '-'}
                        </td>
                        <td className="border-b border-gray-200 px-2 py-1 text-right font-medium text-gray-700">
                          {formatPrecio(item.precioUnitario)}
                        </td>
                        <td className="border-b border-gray-200 px-2 py-1 text-right font-bold text-gray-900">
                          {formatPrecio(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-green-600 text-white">
                      <td colSpan={5} className="px-2 py-2 text-right font-bold text-base uppercase">
                        Total a Pagar:
                      </td>
                      <td className="px-2 py-2 text-right font-black text-lg">
                        {formatPrecio(facturaPrint.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* === INFORMACIÓN DE PAGO Y FIRMAS COMPACTO === */}
              <div className="flex gap-3 mb-2 text-sm">
                <div className={`flex-1 rounded-lg p-2 border ${
                  facturaPrint.tipoPago === 'contado' 
                    ? 'bg-green-50 border-green-300' 
                    : facturaPrint.tipoPago === 'transferencia'
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-orange-50 border-orange-300'
                }`}>
                  <span className="text-gray-500">Pago:</span>{' '}
                  <span className={`font-bold ${
                    facturaPrint.tipoPago === 'contado' ? 'text-green-700' : 
                    facturaPrint.tipoPago === 'transferencia' ? 'text-blue-700' : 'text-orange-700'
                  }`}>
                    {facturaPrint.tipoPago === 'contado' ? 'Contado' : 
                     facturaPrint.tipoPago === 'transferencia' ? 'Transferencia' : 'Crédito'}
                  </span>
                </div>
                
                {facturaPrint.notas && (
                  <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                    <span className="text-gray-500">Obs:</span> <span className="text-gray-700">{facturaPrint.notas}</span>
                  </div>
                )}
              </div>

              {/* === PIE DE PÁGINA (siempre al final) === */}
              <div id="pie-factura" className="border-t border-gray-300 pt-3 mt-auto">
                {/* Nota de factura por correo */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4 text-center">
                  <p className="text-sm text-blue-800 font-medium">
                    📧 Nota: La factura será enviada por correo a la aceptación de esta remisión
                  </p>
                </div>

                {/* Firmas con cuadros GRANDES */}
                <div className="flex justify-between items-end mb-4">
                  <div className="text-center">
                    <div className="border-2 border-gray-500 rounded bg-white mb-1" style={{ width: '180px', height: '70px' }}></div>
                    <p className="text-sm text-gray-600 font-medium">Firma Vendedor</p>
                  </div>
                  <div className="text-center">
                    <div className="border-2 border-gray-500 rounded bg-white mb-1" style={{ width: '180px', height: '70px' }}></div>
                    <p className="text-sm text-gray-600 font-medium">Firma Cliente</p>
                  </div>
                </div>

                {/* Nota de atención al cliente */}
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">
                    <strong>Atención al cliente:</strong> Pasados 8 días no se aceptan cambios ni devoluciones. Para cualquier inquietud comuníquese al <strong>301 523 2610</strong>. Este documento se asimila en todos sus efectos a una letra de cambio - Artículo 774 C. de Co.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          /* Reset completo para impresión */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Ocultar TODO el body excepto lo que queremos */
          body > *:not(#root),
          #root > *:not(.space-y-6) {
            display: none !important;
          }
          
          /* Ocultar la página principal de facturas */
          .space-y-6 > *:not(#print-modal) {
            display: none !important;
          }
          
          /* Ocultar elementos marcados como print:hidden */
          .print\\:hidden,
          [class*="print:hidden"] {
            display: none !important;
          }
          
          /* Estilos del modal de impresión */
          #print-modal {
            position: fixed !important;
            inset: 0 !important;
            background: white !important;
            padding: 0 !important;
            display: block !important;
            overflow: visible !important;
            z-index: 99999 !important;
          }
          
          /* Contenedor interno */
          #print-modal > div {
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          
          /* Área de impresión */
          #print-area {
            padding: 8mm !important;
            width: 100% !important;
            background: white !important;
            min-height: 277mm !important;
            height: 277mm !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            position: relative !important;
          }
          
          /* Pie de página SIEMPRE al final de la página */
          #pie-factura {
            margin-top: auto !important;
            position: relative !important;
            width: 100% !important;
          }
          
          /* Logo grande en impresión */
          #print-area img {
            width: 100px !important;
            height: 100px !important;
            min-width: 100px !important;
            min-height: 100px !important;
          }
          
          /* Cuadros de firma visibles */
          #pie-factura .border-2 {
            border-width: 2px !important;
            border-color: #6b7280 !important;
            background: white !important;
          }
          
          /* Configuración de página A4 */
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
          
          /* Asegurar que no haya scroll ni overflow */
          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}

export default FacturasPage
