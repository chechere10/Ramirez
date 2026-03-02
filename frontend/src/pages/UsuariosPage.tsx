import { useState } from 'react'
import { useAuth, type Usuario } from '../contexts/AuthContext'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Shield, 
  User, 
  Calculator,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle
} from 'lucide-react'

const roles = {
  admin: { label: 'Administrador', icon: Shield, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  vendedor: { label: 'Vendedor', icon: User, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  contador: { label: 'Contador', icon: Calculator, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
}

export function UsuariosPage() {
  const { usuarios, crearUsuario, actualizarUsuario, eliminarUsuario, isAdmin, usuario: usuarioActual } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre: '',
    rol: 'vendedor' as Usuario['rol'],
    activo: true
  })

  // Solo admin puede ver esta página
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Acceso Restringido</h2>
          <p className="text-gray-500 mt-2">Solo los administradores pueden gestionar usuarios.</p>
        </div>
      </div>
    )
  }

  const handleNuevoUsuario = () => {
    setUsuarioEditando(null)
    setFormData({
      username: '',
      password: '',
      nombre: '',
      rol: 'vendedor',
      activo: true
    })
    setError('')
    setShowModal(true)
  }

  const handleEditarUsuario = (usuario: Usuario) => {
    setUsuarioEditando(usuario)
    setFormData({
      username: usuario.username,
      password: '', // No mostrar contraseña actual
      nombre: usuario.nombre,
      rol: usuario.rol,
      activo: usuario.activo
    })
    setError('')
    setShowModal(true)
  }

  const handleGuardar = () => {
    // Validaciones
    if (!formData.username.trim()) {
      setError('El nombre de usuario es requerido')
      return
    }
    if (!formData.nombre.trim()) {
      setError('El nombre completo es requerido')
      return
    }
    if (!usuarioEditando && !formData.password.trim()) {
      setError('La contraseña es requerida para nuevos usuarios')
      return
    }

    if (usuarioEditando) {
      // Editar usuario existente
      const datos: Partial<Usuario> = {
        nombre: formData.nombre,
        rol: formData.rol,
        activo: formData.activo
      }
      // Solo actualizar contraseña si se proporcionó una nueva
      if (formData.password.trim()) {
        datos.password = formData.password
      }
      // Solo actualizar username si no es el admin
      if (usuarioEditando.id !== 'admin-001') {
        datos.username = formData.username
      }
      
      const success = actualizarUsuario(usuarioEditando.id, datos)
      if (!success) {
        setError('No se pudo actualizar el usuario')
        return
      }
    } else {
      // Crear nuevo usuario
      const success = crearUsuario({
        username: formData.username,
        password: formData.password,
        nombre: formData.nombre,
        rol: formData.rol,
        activo: formData.activo
      })
      if (!success) {
        setError('El nombre de usuario ya existe')
        return
      }
    }

    setShowModal(false)
  }

  const handleEliminar = (usuario: Usuario) => {
    if (usuario.id === 'admin-001') {
      alert('No se puede eliminar al administrador principal')
      return
    }
    if (usuario.id === usuarioActual?.id) {
      alert('No puedes eliminar tu propia cuenta')
      return
    }

    const confirmacion = window.confirm(
      `¿Estás seguro de eliminar al usuario "${usuario.nombre}"?\n\nEsta acción no se puede deshacer.`
    )
    if (confirmacion) {
      eliminarUsuario(usuario.id)
    }
  }

  const toggleActivo = (usuario: Usuario) => {
    if (usuario.id === 'admin-001') {
      alert('No se puede desactivar al administrador principal')
      return
    }
    if (usuario.id === usuarioActual?.id) {
      alert('No puedes desactivar tu propia cuenta')
      return
    }
    actualizarUsuario(usuario.id, { activo: !usuario.activo })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Usuarios</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Administra los usuarios del sistema
          </p>
        </div>
        <button
          onClick={handleNuevoUsuario}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{usuarios.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Activos</p>
              <p className="text-2xl font-bold text-green-600">{usuarios.filter(u => u.activo).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Admins</p>
              <p className="text-2xl font-bold text-red-600">{usuarios.filter(u => u.rol === 'admin').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded-lg">
              <XCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inactivos</p>
              <p className="text-2xl font-bold text-gray-600">{usuarios.filter(u => !u.activo).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nombre</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Último Acceso</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {usuarios.map(usuario => {
                const rolConfig = roles[usuario.rol]
                const RolIcon = rolConfig.icon
                const esUsuarioActual = usuario.id === usuarioActual?.id
                
                return (
                  <tr key={usuario.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!usuario.activo ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          usuario.rol === 'admin' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          <RolIcon className={`h-5 w-5 ${
                            usuario.rol === 'admin' ? 'text-red-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {usuario.username}
                            {esUsuarioActual && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                Tú
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">Creado: {usuario.fechaCreacion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{usuario.nombre}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${rolConfig.color}`}>
                        <RolIcon className="h-3 w-3" />
                        {rolConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActivo(usuario)}
                        disabled={usuario.id === 'admin-001' || esUsuarioActual}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          usuario.activo 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 hover:bg-gray-200'
                        } ${(usuario.id === 'admin-001' || esUsuarioActual) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        title={usuario.id === 'admin-001' ? 'No se puede desactivar al admin' : esUsuarioActual ? 'No puedes desactivarte' : 'Clic para cambiar estado'}
                      >
                        {usuario.activo ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Inactivo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {usuario.ultimoAcceso 
                        ? new Date(usuario.ultimoAcceso).toLocaleString('es-CO')
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditarUsuario(usuario)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          title="Editar usuario"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {usuario.id !== 'admin-001' && !esUsuarioActual && (
                          <button
                            onClick={() => handleEliminar(usuario)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                            title="Eliminar usuario"
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

      {/* Modal Crear/Editar Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Cerrar"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Usuario <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  disabled={usuarioEditando?.id === 'admin-001'}
                  placeholder="Nombre de usuario"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                />
                {usuarioEditando?.id === 'admin-001' && (
                  <p className="text-xs text-gray-500 mt-1">El usuario admin no se puede cambiar</p>
                )}
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre y apellido"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contraseña {!usuarioEditando && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={usuarioEditando ? 'Dejar vacío para mantener actual' : 'Contraseña'}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rol
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData(prev => ({ ...prev, rol: e.target.value as Usuario['rol'] }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="admin">Administrador</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="contador">Contador</option>
                </select>
              </div>

              {/* Estado */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Usuario activo
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {usuarioEditando ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
