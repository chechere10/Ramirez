import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

// Interfaz de Usuario
export interface Usuario {
  id: string
  username: string
  password: string
  nombre: string
  rol: 'admin' | 'vendedor' | 'contador'
  activo: boolean
  fechaCreacion: string
  ultimoAcceso?: string
}

// Usuario admin por defecto
const adminDefault: Usuario = {
  id: 'admin-001',
  username: 'admin',
  password: 'admin123',
  nombre: 'Administrador',
  rol: 'admin',
  activo: true,
  fechaCreacion: '2026-01-01'
}

// Contexto de autenticación
interface AuthContextType {
  usuario: Usuario | null
  usuarios: Usuario[]
  login: (username: string, password: string) => boolean
  logout: () => void
  crearUsuario: (usuario: Omit<Usuario, 'id' | 'fechaCreacion'>) => boolean
  actualizarUsuario: (id: string, datos: Partial<Usuario>) => boolean
  eliminarUsuario: (id: string) => boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  
  // Cargar usuarios desde localStorage
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => {
    try {
      const saved = localStorage.getItem('manifesto_usuarios')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Asegurar que el admin existe
        const tieneAdmin = parsed.some((u: Usuario) => u.username === 'admin')
        if (!tieneAdmin) {
          return [adminDefault, ...parsed]
        }
        return parsed
      }
    } catch (e) {
      console.error('Error cargando usuarios:', e)
    }
    return [adminDefault]
  })

  // Usuario actual (sesión)
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    try {
      const saved = localStorage.getItem('manifesto_sesion')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('Error cargando sesión:', e)
    }
    return null
  })

  // Guardar usuarios en localStorage
  useEffect(() => {
    localStorage.setItem('manifesto_usuarios', JSON.stringify(usuarios))
  }, [usuarios])

  // Guardar sesión en localStorage
  useEffect(() => {
    if (usuario) {
      localStorage.setItem('manifesto_sesion', JSON.stringify(usuario))
    } else {
      localStorage.removeItem('manifesto_sesion')
    }
  }, [usuario])

  // Marcar como cargado después de inicializar
  useEffect(() => {
    setIsLoading(false)
  }, [])

  // Login
  const login = (username: string, password: string): boolean => {
    const user = usuarios.find(
      u => u.username.toLowerCase() === username.toLowerCase() && 
           u.password === password && 
           u.activo
    )
    
    if (user) {
      // Actualizar último acceso
      const usuarioActualizado = {
        ...user,
        ultimoAcceso: new Date().toISOString()
      }
      setUsuarios(prev => prev.map(u => u.id === user.id ? usuarioActualizado : u))
      setUsuario(usuarioActualizado)
      return true
    }
    return false
  }

  // Logout
  const logout = () => {
    setUsuario(null)
    localStorage.removeItem('manifesto_sesion')
  }

  // Crear usuario
  const crearUsuario = (nuevoUsuario: Omit<Usuario, 'id' | 'fechaCreacion'>): boolean => {
    // Verificar que no exista el username
    if (usuarios.some(u => u.username.toLowerCase() === nuevoUsuario.username.toLowerCase())) {
      return false
    }

    const usuario: Usuario = {
      ...nuevoUsuario,
      id: crypto.randomUUID(),
      fechaCreacion: new Date().toISOString().split('T')[0]
    }

    setUsuarios(prev => [...prev, usuario])
    return true
  }

  // Actualizar usuario
  const actualizarUsuario = (id: string, datos: Partial<Usuario>): boolean => {
    // No permitir cambiar el username del admin
    if (id === 'admin-001' && datos.username && datos.username !== 'admin') {
      return false
    }

    setUsuarios(prev => prev.map(u => 
      u.id === id ? { ...u, ...datos } : u
    ))

    // Si es el usuario actual, actualizar también la sesión
    if (usuario && usuario.id === id) {
      setUsuario(prev => prev ? { ...prev, ...datos } : prev)
    }

    return true
  }

  // Eliminar usuario
  const eliminarUsuario = (id: string): boolean => {
    // No permitir eliminar al admin
    if (id === 'admin-001') {
      return false
    }

    setUsuarios(prev => prev.filter(u => u.id !== id))
    return true
  }

  const value: AuthContextType = {
    usuario,
    usuarios,
    login,
    logout,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    isAuthenticated: !!usuario,
    isAdmin: usuario?.rol === 'admin',
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
