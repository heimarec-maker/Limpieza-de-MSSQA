import { Navigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

/**
 * Componente de protección de rutas basado en roles.
 * Si el usuario no está autenticado, redirige al login.
 * Si el usuario no tiene el rol requerido, redirige al home.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componente a renderizar si el acceso es válido.
 * @param {string} [props.requiredRole] - Rol requerido (ej: 'admin'). Si no se especifica, solo valida autenticación.
 */
export default function ProtectedRoute({ children, requiredRole, fallbackPath = '/home' }) {
  const { currentUser } = useUser()

  // Sin sesión → redirigir al login
  if (!currentUser) {
    return <Navigate to="/" replace />
  }

  // Si requiere un rol específico y no lo tiene → redirigir al home o a la ruta indicada
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to={fallbackPath} replace />
  }

  return children
}
