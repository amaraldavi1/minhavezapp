import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

/**
 * Guards owner-only routes. While Firebase resolves the session we show a
 * lightweight loader; unauthenticated visitors are bounced to the login page.
 */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading">
        <span className="loading-icon">⏳</span>
        <p>Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/painel/login" replace />
  }

  return children
}
