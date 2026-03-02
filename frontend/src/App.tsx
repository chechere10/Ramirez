import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './components/layout'
import { ThemeProvider, ToastProvider } from './hooks'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import {
  DocumentosPage,
  CargarPage,
  BusquedaPage,
  ResaltarPage,
  VisorPage,
  ReportesPage,
  ConfiguracionPage,
  ClientesPage,
  InventarioPage,
  PedidosPage,
  FacturasPage,
  LoginPage,
  UsuariosPage,
} from './pages'

// Componente para rutas protegidas
function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando...</p>
        </div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <LoginPage />
  }
  
  return (
    <Routes>
      {/* Layout principal con sidebar */}
      <Route path="/" element={<MainLayout />}>
        {/* Página de inicio - Facturas/Ventas */}
        <Route index element={<FacturasPage />} />
        
        {/* Clientes */}
        <Route path="clientes" element={<ClientesPage />} />
        
        {/* Inventario y Ventas */}
        <Route path="inventario" element={<InventarioPage />} />
        <Route path="pedidos" element={<PedidosPage />} />
        
        {/* Reportes */}
        <Route path="reportes" element={<ReportesPage />} />
        
        {/* Usuarios (solo admin) */}
        <Route path="usuarios" element={<UsuariosPage />} />
        
        {/* Manifiestos y Documentos */}
        <Route path="resaltar" element={<ResaltarPage />} />
        <Route path="documentos" element={<DocumentosPage />} />
        <Route path="cargar" element={<CargarPage />} />
        <Route path="busqueda" element={<BusquedaPage />} />
        <Route path="visor" element={<VisorPage />} />
        
        {/* Configuración */}
        <Route path="configuracion" element={<ConfiguracionPage />} />
        
        {/* Ruta por defecto - redirige a facturas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ProtectedRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
