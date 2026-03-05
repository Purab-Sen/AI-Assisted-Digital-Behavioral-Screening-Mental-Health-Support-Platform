import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

// Role hierarchy: ADMIN > PROFESSIONAL > USER
const ROLES = {
  USER: 'user',
  PROFESSIONAL: 'professional',
  ADMIN: 'admin'
}

// Role-based permission mappings
const ROLE_PERMISSIONS = {
  user: [
    'view_own_data',
    'edit_own_data',
    'take_screening',
    'view_own_results',
    'share_with_professional'
  ],
  professional: [
    'view_own_data',
    'edit_own_data',
    'take_screening',
    'view_own_results',
    'share_with_professional',
    'view_shared_data',
    'add_professional_notes'
  ],
  admin: [
    'view_own_data',
    'edit_own_data',
    'take_screening',
    'view_own_results',
    'share_with_professional',
    'view_shared_data',
    'add_professional_notes',
    'view_all_users',
    'edit_all_users',
    'delete_users',
    'view_system_stats',
    'manage_resources'
  ]
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    if (authService.isAuthenticated()) {
      try {
        const userData = await authService.getCurrentUser()
        setUser(userData)
      } catch (error) {
        await authService.logout()
        setUser(null)
      }
    }
    setLoading(false)
  }

  const login = async (email, password) => {
    await authService.login(email, password)
    const userData = await authService.getCurrentUser()
    setUser(userData)
    return userData
  }

  const register = async (userData) => {
    const newUser = await authService.register(userData)
    return newUser
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  const updateUser = async (userData) => {
    const updatedUser = await authService.updateProfile(userData)
    setUser(updatedUser)
    return updatedUser
  }

  // Role checking utilities
  const hasRole = (role) => {
    if (!user) return false
    return user.role === role
  }

  const isAdmin = useMemo(() => user?.role === ROLES.ADMIN, [user])
  const isProfessional = useMemo(() => 
    user?.role === ROLES.PROFESSIONAL || user?.role === ROLES.ADMIN, 
    [user]
  )
  const isUser = useMemo(() => !!user, [user])

  // Permission checking
  const hasPermission = (permission) => {
    if (!user) return false
    const permissions = ROLE_PERMISSIONS[user.role] || []
    return permissions.includes(permission)
  }

  // Check if user can access a route based on required roles
  const canAccess = (requiredRoles) => {
    if (!user) return false
    if (!requiredRoles || requiredRoles.length === 0) return true
    return requiredRoles.includes(user.role)
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    // Role utilities
    hasRole,
    isAdmin,
    isProfessional,
    isUser,
    hasPermission,
    canAccess,
    ROLES
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
