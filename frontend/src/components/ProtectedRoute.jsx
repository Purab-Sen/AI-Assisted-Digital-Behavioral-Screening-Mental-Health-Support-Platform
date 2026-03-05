/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication and optionally specific roles.
 * Redirects to login if not authenticated, or shows unauthorized if missing required role.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute - Protects routes requiring authentication
 * 
 * @param {ReactNode} children - The component to render if authorized
 * @param {string[]} requiredRoles - Optional array of roles that can access this route
 * @param {string} redirectTo - Where to redirect if not authenticated (default: /login)
 */
export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  redirectTo = '/login' 
}) {
  const { user, loading, canAccess } = useAuth()
  const location = useLocation()

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !canAccess(requiredRoles)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

/**
 * AdminRoute - Shortcut for admin-only routes
 */
export function AdminRoute({ children }) {
  const { ROLES } = useAuth()
  return (
    <ProtectedRoute requiredRoles={[ROLES.ADMIN]}>
      {children}
    </ProtectedRoute>
  )
}

/**
 * ProfessionalRoute - Shortcut for professional and admin routes
 */
export function ProfessionalRoute({ children }) {
  const { ROLES } = useAuth()
  return (
    <ProtectedRoute requiredRoles={[ROLES.PROFESSIONAL, ROLES.ADMIN]}>
      {children}
    </ProtectedRoute>
  )
}

/**
 * PublicOnlyRoute - For routes that should only be accessible when NOT logged in
 * (e.g., login, register pages)
 */
export function PublicOnlyRoute({ children, redirectTo = '/dashboard' }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}

export default ProtectedRoute
