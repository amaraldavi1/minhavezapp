import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useSuperadmin } from './useSuperadmin'

export default function RequireSuperadmin({ children }) {
  const { user, loading } = useAuth()
  const { checking, isSuper } = useSuperadmin()

  if (loading || checking) {
    return (
      <div className="loading">
        <span className="loading-icon">⏳</span>
        <p>Verificando acesso...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/painel/login" replace />
  }

  if (!isSuper) {
    return (
      <div className="served-view">
        <span className="served-icon">🚫</span>
        <h2 className="served-title">Acesso restrito</h2>
        <p className="served-message">
          Esta área é exclusiva para administradores do sistema.
        </p>
        <a className="btn btn-ghost" href="/painel">← Ir para o painel</a>
      </div>
    )
  }

  return children
}
