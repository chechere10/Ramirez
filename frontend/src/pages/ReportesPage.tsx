import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Clock,
  Filter,
  RefreshCw,
  Printer,
  PieChart
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'

interface Factura {
  id: string
  numero: string
  clienteId: string
  clienteNombre: string
  clienteNit: string
  fecha: string
  hora: string
  tipoPago: 'contado' | 'transferencia' | 'plazo'
  items: any[]
  total: number
  estado: 'pagada' | 'pendiente' | 'vencida' | 'anulada'
  fechaVencimiento?: string
}

interface Cliente {
  id: string
  nombre: string
  nit: string
  telefono?: string
}

export function ReportesPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [periodoFiltro, setPeriodoFiltro] = useState<'hoy' | 'semana' | 'mes' | 'año' | 'custom'>('mes')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [generandoReporte, setGenerandoReporte] = useState<string | null>(null)

  // Cargar datos
  useEffect(() => {
    const facturasGuardadas = localStorage.getItem('manifesto_facturas_ventas')
    const clientesGuardados = localStorage.getItem('manifesto_clientes')
    
    if (facturasGuardadas) setFacturas(JSON.parse(facturasGuardadas))
    if (clientesGuardados) setClientes(JSON.parse(clientesGuardados))

    // Establecer fechas por defecto
    const hoy = new Date()
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    setFechaInicio(inicioMes.toISOString().split('T')[0])
    setFechaFin(hoy.toISOString().split('T')[0])
  }, [])

  // Filtrar facturas por periodo
  const facturasFiltradas = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999)
    
    return facturas.filter(f => {
      const fechaFactura = new Date(f.fecha)
      
      if (periodoFiltro === 'hoy') {
        const inicio = new Date()
        inicio.setHours(0, 0, 0, 0)
        return fechaFactura >= inicio && fechaFactura <= hoy
      } else if (periodoFiltro === 'semana') {
        const inicio = new Date()
        inicio.setDate(inicio.getDate() - 7)
        inicio.setHours(0, 0, 0, 0)
        return fechaFactura >= inicio && fechaFactura <= hoy
      } else if (periodoFiltro === 'mes') {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        return fechaFactura >= inicio && fechaFactura <= hoy
      } else if (periodoFiltro === 'año') {
        const inicio = new Date(hoy.getFullYear(), 0, 1)
        return fechaFactura >= inicio && fechaFactura <= hoy
      } else if (periodoFiltro === 'custom' && fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio)
        const fin = new Date(fechaFin)
        fin.setHours(23, 59, 59, 999)
        return fechaFactura >= inicio && fechaFactura <= fin
      }
      return true
    })
  }, [facturas, periodoFiltro, fechaInicio, fechaFin])

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const facturasActivas = facturasFiltradas.filter(f => f.estado !== 'anulada')
    
    const totalVentas = facturasActivas.reduce((sum, f) => sum + f.total, 0)
    const totalPagadas = facturasActivas.filter(f => f.estado === 'pagada').reduce((sum, f) => sum + f.total, 0)
    const totalPendiente = facturasActivas.filter(f => f.estado === 'pendiente').reduce((sum, f) => sum + f.total, 0)
    const totalVencido = facturasActivas.filter(f => f.estado === 'vencida').reduce((sum, f) => sum + f.total, 0)
    
    const ventasContado = facturasActivas.filter(f => f.tipoPago === 'contado').reduce((sum, f) => sum + f.total, 0)
    const ventasTransferencia = facturasActivas.filter(f => f.tipoPago === 'transferencia').reduce((sum, f) => sum + f.total, 0)
    const ventasPlazo = facturasActivas.filter(f => f.tipoPago === 'plazo').reduce((sum, f) => sum + f.total, 0)
    
    // Top clientes
    const ventasPorCliente: Record<string, { nombre: string, total: number, facturas: number }> = {}
    facturasActivas.forEach(f => {
      if (!ventasPorCliente[f.clienteId]) {
        ventasPorCliente[f.clienteId] = { nombre: f.clienteNombre, total: 0, facturas: 0 }
      }
      ventasPorCliente[f.clienteId].total += f.total
      ventasPorCliente[f.clienteId].facturas += 1
    })
    const topClientes = Object.entries(ventasPorCliente)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Productos más vendidos
    const ventasPorProducto: Record<string, { nombre: string, cantidad: number, ingresos: number }> = {}
    facturasActivas.forEach(f => {
      f.items?.forEach((item: any) => {
        if (!ventasPorProducto[item.productoId]) {
          ventasPorProducto[item.productoId] = { nombre: item.productoNombre, cantidad: 0, ingresos: 0 }
        }
        const cantidadUnidades = item.tipoVenta === 'docena' ? item.cantidad * 12 : item.cantidad
        ventasPorProducto[item.productoId].cantidad += cantidadUnidades
        ventasPorProducto[item.productoId].ingresos += item.subtotal
      })
    })
    const topProductos = Object.entries(ventasPorProducto)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 5)

    return {
      totalVentas,
      totalPagadas,
      totalPendiente,
      totalVencido,
      ventasContado,
      ventasTransferencia,
      ventasPlazo,
      numFacturas: facturasActivas.length,
      numFacturasPagadas: facturasActivas.filter(f => f.estado === 'pagada').length,
      numFacturasPendientes: facturasActivas.filter(f => f.estado === 'pendiente').length,
      numFacturasVencidas: facturasActivas.filter(f => f.estado === 'vencida').length,
      topClientes,
      topProductos,
      promedioVenta: facturasActivas.length > 0 ? totalVentas / facturasActivas.length : 0
    }
  }, [facturasFiltradas])

  // Formatear precio
  const formatPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio)
  }

  // Generar Excel
  const generarExcel = () => {
    setGenerandoReporte('excel')
    
    setTimeout(() => {
      const facturasActivas = facturasFiltradas.filter(f => f.estado !== 'anulada')
      
      let csv = '\ufeff'
      csv += 'REPORTE DE VENTAS - ManifestoCross\n'
      csv += `Período: ${fechaInicio} al ${fechaFin}\n`
      csv += `Generado: ${new Date().toLocaleString('es-CO')}\n\n`
      
      csv += 'RESUMEN\n'
      csv += `Total Ventas,${estadisticas.totalVentas}\n`
      csv += `Total Pagado,${estadisticas.totalPagadas}\n`
      csv += `Total Pendiente,${estadisticas.totalPendiente}\n`
      csv += `Total Vencido,${estadisticas.totalVencido}\n`
      csv += `Número de Facturas,${estadisticas.numFacturas}\n\n`
      
      csv += 'DETALLE DE FACTURAS\n'
      csv += 'Número,Fecha,Hora,Cliente,NIT,Tipo Pago,Total,Estado\n'
      
      facturasActivas.forEach(f => {
        csv += `${f.numero},${f.fecha},${f.hora},"${f.clienteNombre}",${f.clienteNit},${f.tipoPago},${f.total},${f.estado}\n`
      })

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `Reporte_Ventas_${fechaInicio}_${fechaFin}.csv`
      link.click()
      
      setGenerandoReporte(null)
    }, 1000)
  }

  // Generar PDF
  const generarPDF = () => {
    setGenerandoReporte('pdf')
    
    setTimeout(() => {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Por favor permite las ventanas emergentes para generar el PDF')
        setGenerandoReporte(null)
        return
      }

      const facturasActivas = facturasFiltradas.filter(f => f.estado !== 'anulada')

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reporte de Ventas - ManifestoCross</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
            .stat-card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #1e40af; }
            .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background: #f3f4f6; font-weight: 600; }
            .pagada { color: #059669; }
            .pendiente { color: #d97706; }
            .vencida { color: #dc2626; }
            .total-row { background: #f0fdf4; font-weight: bold; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>📊 Reporte de Ventas</h1>
          <div style="display:flex;justify-content:space-between;margin-bottom:20px">
            <div><strong>Período:</strong> ${fechaInicio} al ${fechaFin}</div>
            <div><strong>Generado:</strong> ${new Date().toLocaleString('es-CO')}</div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${formatPrecio(estadisticas.totalVentas)}</div>
              <div class="stat-label">TOTAL VENTAS</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color: #059669">${formatPrecio(estadisticas.totalPagadas)}</div>
              <div class="stat-label">RECAUDADO</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color: #d97706">${formatPrecio(estadisticas.totalPendiente)}</div>
              <div class="stat-label">PENDIENTE</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color: #dc2626">${formatPrecio(estadisticas.totalVencido)}</div>
              <div class="stat-label">VENCIDO</div>
            </div>
          </div>
          
          <h2>Detalle de Facturas (${facturasActivas.length})</h2>
          <table>
            <thead>
              <tr><th>N° Remisión</th><th>Fecha</th><th>Cliente</th><th>Tipo Pago</th><th>Total</th><th>Estado</th></tr>
            </thead>
            <tbody>
              ${facturasActivas.map(f => `
                <tr>
                  <td>${f.numero}</td>
                  <td>${f.fecha}</td>
                  <td>${f.clienteNombre}</td>
                  <td>${f.tipoPago === 'contado' ? 'Contado' : f.tipoPago === 'transferencia' ? 'Transferencia' : 'A Plazo'}</td>
                  <td>${formatPrecio(f.total)}</td>
                  <td class="${f.estado}">${f.estado.charAt(0).toUpperCase() + f.estado.slice(1)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">TOTAL</td>
                <td>${formatPrecio(estadisticas.totalVentas)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <h2>Top 5 Clientes</h2>
          <table>
            <thead><tr><th>#</th><th>Cliente</th><th>Facturas</th><th>Total Compras</th></tr></thead>
            <tbody>
              ${estadisticas.topClientes.map((c, i) => `
                <tr><td>${i + 1}</td><td>${c.nombre}</td><td>${c.facturas}</td><td>${formatPrecio(c.total)}</td></tr>
              `).join('')}
            </tbody>
          </table>

          <h2>Top 5 Productos</h2>
          <table>
            <thead><tr><th>#</th><th>Producto</th><th>Unidades Vendidas</th><th>Ingresos</th></tr></thead>
            <tbody>
              ${estadisticas.topProductos.map((p, i) => `
                <tr><td>${i + 1}</td><td>${p.nombre}</td><td>${p.cantidad}</td><td>${formatPrecio(p.ingresos)}</td></tr>
              `).join('')}
            </tbody>
          </table>
          
          <script>window.print();</script>
        </body>
        </html>
      `)
      printWindow.document.close()
      
      setGenerandoReporte(null)
    }, 1000)
  }

  // Generar reporte de cartera
  const generarCartera = () => {
    setGenerandoReporte('cartera')
    
    setTimeout(() => {
      const facturasCartera = facturas.filter(f => 
        f.estado === 'pendiente' || f.estado === 'vencida'
      ).sort((a, b) => new Date(a.fechaVencimiento || a.fecha).getTime() - new Date(b.fechaVencimiento || b.fecha).getTime())

      let csv = '\ufeff'
      csv += 'REPORTE DE CARTERA - ManifestoCross\n'
      csv += `Generado: ${new Date().toLocaleString('es-CO')}\n\n`
      csv += `Total Pendiente: ${formatPrecio(estadisticas.totalPendiente)}\n`
      csv += `Total Vencido: ${formatPrecio(estadisticas.totalVencido)}\n\n`
      
      csv += 'DETALLE DE CARTERA\n'
      csv += 'Número,Fecha Venta,Fecha Vencimiento,Cliente,NIT,Teléfono,Total,Días Vencido,Estado\n'
      
      facturasCartera.forEach(f => {
        const hoy = new Date()
        const fechaVenc = new Date(f.fechaVencimiento || f.fecha)
        const diasVencido = Math.floor((hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24))
        const cliente = clientes.find(c => c.id === f.clienteId)
        
        csv += `${f.numero},${f.fecha},${f.fechaVencimiento || 'N/A'},"${f.clienteNombre}",${f.clienteNit},${cliente?.telefono || ''},${f.total},${diasVencido > 0 ? diasVencido : 0},${f.estado}\n`
      })

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `Reporte_Cartera_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      
      setGenerandoReporte(null)
    }, 1000)
  }

  const calcularPorcentaje = (valor: number, total: number) => {
    if (total === 0) return 0
    return Math.round((valor / total) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Reportes y Análisis
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Análisis detallado de ventas, cartera y rendimiento
          </p>
        </div>
        
        {/* Filtro de periodo */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            title="Seleccionar período"
          >
            <option value="hoy">Hoy</option>
            <option value="semana">Última semana</option>
            <option value="mes">Este mes</option>
            <option value="año">Este año</option>
            <option value="custom">Personalizado</option>
          </select>
          
          {periodoFiltro === 'custom' && (
            <>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                title="Fecha inicio"
              />
              <span className="text-gray-500">a</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                title="Fecha fin"
              />
            </>
          )}
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Ventas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {formatPrecio(estadisticas.totalVentas)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{estadisticas.numFacturas} facturas</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recaudado</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatPrecio(estadisticas.totalPagadas)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {calcularPorcentaje(estadisticas.totalPagadas, estadisticas.totalVentas)}% del total
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pendiente</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatPrecio(estadisticas.totalPendiente)}
              </p>
              <p className="text-xs text-orange-600 mt-1">{estadisticas.numFacturasPendientes} facturas</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Vencido</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatPrecio(estadisticas.totalVencido)}
              </p>
              <p className="text-xs text-red-600 mt-1">{estadisticas.numFacturasVencidas} facturas</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos y Detalles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por tipo de pago */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-blue-600" />
            Ventas por Tipo de Pago
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Contado</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrecio(estadisticas.ventasContado)}</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${calcularPorcentaje(estadisticas.ventasContado, estadisticas.totalVentas)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{calcularPorcentaje(estadisticas.ventasContado, estadisticas.totalVentas)}%</p>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Transferencia</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrecio(estadisticas.ventasTransferencia)}</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${calcularPorcentaje(estadisticas.ventasTransferencia, estadisticas.totalVentas)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{calcularPorcentaje(estadisticas.ventasTransferencia, estadisticas.totalVentas)}%</p>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">A Plazo (Crédito)</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrecio(estadisticas.ventasPlazo)}</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${calcularPorcentaje(estadisticas.ventasPlazo, estadisticas.totalVentas)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{calcularPorcentaje(estadisticas.ventasPlazo, estadisticas.totalVentas)}%</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Promedio por venta:</span>
              <span className="text-lg font-bold text-blue-600">{formatPrecio(estadisticas.promedioVenta)}</span>
            </div>
          </div>
        </div>

        {/* Top Clientes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-purple-600" />
            Top 5 Clientes
          </h3>
          
          {estadisticas.topClientes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No hay datos de clientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {estadisticas.topClientes.map((cliente, index) => (
                <div key={cliente.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{cliente.nombre}</p>
                    <p className="text-xs text-gray-500">{cliente.facturas} facturas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatPrecio(cliente.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Productos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-indigo-600" />
            Top 5 Productos Vendidos
          </h3>
          
          {estadisticas.topProductos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No hay datos de productos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {estadisticas.topProductos.map((producto, index) => (
                <div key={producto.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{producto.nombre}</p>
                    <p className="text-xs text-gray-500">{producto.cantidad} unidades vendidas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">{formatPrecio(producto.ingresos)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generar Reportes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
            <Download className="h-5 w-5 text-green-600" />
            Descargar Reportes
          </h3>
          
          <div className="space-y-3">
            <button
              onClick={generarExcel}
              disabled={generandoReporte !== null}
              className="w-full flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
            >
              <div className="p-2 bg-green-600 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">Reporte de Ventas (Excel/CSV)</p>
                <p className="text-xs text-gray-500">Detalle completo de todas las facturas</p>
              </div>
              {generandoReporte === 'excel' ? (
                <RefreshCw className="h-5 w-5 text-green-600 animate-spin" />
              ) : (
                <Download className="h-5 w-5 text-green-600" />
              )}
            </button>

            <button
              onClick={generarPDF}
              disabled={generandoReporte !== null}
              className="w-full flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              <div className="p-2 bg-red-600 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">Reporte PDF (Imprimir)</p>
                <p className="text-xs text-gray-500">Resumen con gráficos para imprimir</p>
              </div>
              {generandoReporte === 'pdf' ? (
                <RefreshCw className="h-5 w-5 text-red-600 animate-spin" />
              ) : (
                <Printer className="h-5 w-5 text-red-600" />
              )}
            </button>

            <button
              onClick={generarCartera}
              disabled={generandoReporte !== null}
              className="w-full flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50"
            >
              <div className="p-2 bg-orange-600 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">Reporte de Cartera</p>
                <p className="text-xs text-gray-500">Facturas pendientes y vencidas</p>
              </div>
              {generandoReporte === 'cartera' ? (
                <RefreshCw className="h-5 w-5 text-orange-600 animate-spin" />
              ) : (
                <Download className="h-5 w-5 text-orange-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info del periodo */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
        <Calendar className="h-5 w-5 text-blue-600" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Mostrando datos del <strong>{fechaInicio}</strong> al <strong>{fechaFin}</strong>
          {periodoFiltro !== 'custom' && ` (${periodoFiltro === 'hoy' ? 'Hoy' : periodoFiltro === 'semana' ? 'Última semana' : periodoFiltro === 'mes' ? 'Este mes' : 'Este año'})`}
        </p>
      </div>
    </div>
  )
}

export default ReportesPage
