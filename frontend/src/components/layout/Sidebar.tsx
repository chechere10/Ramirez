import { NavLink } from 'react-router-dom'
import {
  FileText,
  BarChart3,
  Settings,
  FolderOpen,
  X,
  Highlighter,
  Users,
  Package,
  ShoppingCart,
  Receipt,
  Shield,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  onMobileClose?: () => void
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  adminOnly?: boolean
}

const navigation: NavItem[] = [
  { name: 'Facturas', href: '/', icon: Receipt },
  { name: 'Manifiestos', href: '/resaltar', icon: Highlighter },
  { name: 'Documentos', href: '/documentos', icon: FolderOpen },
  { name: 'Inventario', href: '/inventario', icon: Package },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
  { name: 'Reportes', href: '/reportes', icon: BarChart3 },
  { name: 'Usuarios', href: '/usuarios', icon: Shield, adminOnly: true },
]

const bottomNavigation: NavItem[] = [
  { name: 'Configuración', href: '/configuracion', icon: Settings },
]

export function Sidebar({ isCollapsed, onMobileClose }: SidebarProps) {
  const { usuario, logout, isAdmin } = useAuth()
  
  const handleNavClick = () => {
    // Close mobile sidebar when a nav item is clicked
    if (onMobileClose && window.innerWidth < 1024) {
      onMobileClose()
    }
  }

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      logout()
    }
  }

  // Filtrar navegación según rol
  const filteredNavigation = navigation.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside
      className={`h-screen bg-slate-900 dark:bg-gray-950 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-3">
        <NavLink to="/" className="flex items-center gap-3" onClick={handleNavClick}>
          <FileText className="h-8 w-8 text-blue-500 shrink-0" />
          {!isCollapsed && (
            <span className="text-xl font-bold text-white">ManifestoCross</span>
          )}
        </NavLink>
        
        {/* Mobile close button */}
        {onMobileClose && !isCollapsed && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User info - Arriba */}
      {usuario && (
        <div className={`border-b border-slate-700 ${isCollapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
          <div className={`${isCollapsed ? 'flex justify-center' : 'px-3 py-2 bg-slate-800/50 rounded-lg'}`}>
            <div className={`flex items-center ${isCollapsed ? '' : 'gap-2'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isAdmin ? 'bg-red-500/20' : 'bg-blue-500/20'
              }`}>
                {isAdmin ? (
                  <Shield className="h-4 w-4 text-red-400" />
                ) : (
                  <Users className="h-4 w-4 text-blue-400" />
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{usuario.nombre}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {isAdmin ? 'Administrador' : usuario.rol === 'contador' ? 'Contador' : 'Vendedor'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex flex-col justify-between p-3 ${usuario ? 'h-[calc(100vh-4rem-4.5rem)]' : 'h-[calc(100vh-4rem)]'}`}>
        <ul className="space-y-1">
          {filteredNavigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <span className="flex-1">{item.name}</span>
                )}
                {!isCollapsed && item.badge !== undefined && (
                  <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Bottom Navigation */}
        <div className="space-y-3 border-t border-slate-700 pt-3">
          {/* Settings */}
          <ul className="space-y-1">
            {bottomNavigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </NavLink>
              </li>
            ))}
            
            {/* Logout button */}
            <li>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-red-400 hover:bg-red-500/20 hover:text-red-300"
                title={isCollapsed ? 'Cerrar Sesión' : undefined}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>Cerrar Sesión</span>}
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
