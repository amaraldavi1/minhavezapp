import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../components/ProtectedRoute'

const CORRECT_PASSWORD = import.meta.env.VITE_ATTENDANT_PASSWORD

export default function AttendantLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (!password || loading) return
    setLoading(true)

    setTimeout(() => {
      if (password === CORRECT_PASSWORD) {
        login()
        navigate('/atendente', { replace: true })
      } else {
        setError(true)
        setPassword('')
        setLoading(false)
      }
    }, 350)
  }

  return (
    <div className="login-view">
      <div className="login-card">
        <span className="login-icon">🔒</span>
        <h1 className="login-title">Área da Atendente</h1>
        <p className="login-subtitle">Digite a senha para continuar</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="pwd" className="input-label">Senha</label>
            <input
              id="pwd"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              placeholder="••••••••"
              autoComplete="current-password"
              autoFocus
              className={`input-field ${error ? 'input-error' : ''}`}
            />
            {error && (
              <span className="error-msg">❌ Senha incorreta. Tente novamente.</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-brown w-full"
            disabled={loading || !password}
          >
            {loading ? '⏳ Verificando...' : '🔓 Entrar'}
          </button>
        </form>

        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          ← Voltar
        </button>
      </div>
    </div>
  )
}
