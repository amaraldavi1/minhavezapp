import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireAuth({ children }) {
  const { user, loading, authError } = useAuth()

  if (loading) {
    return (
      <div className="loading">
        <span className="loading-icon">⏳</span>
        <p>Carregando...</p>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="served-view">
        <span className="served-icon">⚠️</span>
        <h2 className="served-title">Erro de conexão</h2>
        <p className="served-message">
          {authError === 'timeout'
            ? 'Não foi possível conectar ao Firebase. Verifique se as credenciais no .env.local estão corretas e se o projeto Firebase está ativo.'
            : `Código do erro: ${authError}. Verifique a configuração do Firebase Authentication.`}
        </p>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/painel/login" replace />
  }

  return children
}
