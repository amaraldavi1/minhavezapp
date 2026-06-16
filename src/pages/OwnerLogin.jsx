import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../auth/AuthContext'

const EMAIL_KEY = 'minhavez_email_for_signin'

export default function OwnerLogin() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)

  // If we arrived back from the email link, finish the sign-in.
  useEffect(() => {
    let isLink = false
    try { isLink = isSignInWithEmailLink(auth, window.location.href) } catch (_) {}
    if (!isLink) return
    setCompleting(true)
    let saved = window.localStorage.getItem(EMAIL_KEY)
    if (!saved) {
      saved = window.prompt('Confirme seu e-mail para concluir o login:')
    }
    if (!saved) {
      setError('Não foi possível confirmar o e-mail. Tente novamente.')
      setCompleting(false)
      return
    }
    signInWithEmailLink(auth, saved, window.location.href)
      .then(() => {
        window.localStorage.removeItem(EMAIL_KEY)
        navigate('/painel', { replace: true })
      })
      .catch(() => {
        setError('Link inválido ou expirado. Solicite um novo.')
        setCompleting(false)
      })
  }, [navigate])

  // Already authenticated as a real (non-anonymous) owner.
  useEffect(() => {
    if (!loading && user && !user.isAnonymous) {
      navigate('/painel', { replace: true })
    }
  }, [user, loading, navigate])

  async function handleSend(e) {
    e.preventDefault()
    if (!email || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await sendSignInLinkToEmail(auth, email.trim(), {
        url: window.location.origin + '/painel/login',
        handleCodeInApp: true,
      })
      window.localStorage.setItem(EMAIL_KEY, email.trim())
      setSent(true)
    } catch (err) {
      setError('Não foi possível enviar o link. Verifique o e-mail e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (completing) {
    return (
      <div className="loading">
        <span className="loading-icon">⏳</span>
        <p>Concluindo seu login...</p>
      </div>
    )
  }

  return (
    <div className="login-view">
      <div className="login-card">
        <span className="login-icon">🍞</span>
        <h1 className="login-title">Acessar painel</h1>

        {sent ? (
          <>
            <span className="login-sent-icon">📬</span>
            <p className="login-subtitle">
              Enviamos um link de acesso para<br /><strong>{email}</strong>
            </p>
            <p className="login-sent-hint">
              Abra o e-mail neste dispositivo e clique no link para entrar.
              Não esqueça de checar a caixa de spam.
            </p>
            <button
              className="btn btn-ghost"
              onClick={() => { setSent(false); setEmail('') }}
            >
              Usar outro e-mail
            </button>
          </>
        ) : (
          <>
            <p className="login-subtitle">
              Digite seu e-mail e enviaremos um link mágico de acesso. Sem senha.
            </p>
            <form onSubmit={handleSend} className="login-form">
              <div className="input-group">
                <label htmlFor="email" className="input-label">E-mail</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  autoFocus
                  required
                  className={`input-field ${error ? 'input-error' : ''}`}
                />
                {error && <span className="error-msg">❌ {error}</span>}
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={submitting || !email}
              >
                {submitting ? '⏳ Enviando...' : '✉️ Enviar link de acesso'}
              </button>
            </form>
          </>
        )}

        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          ← Voltar
        </button>
      </div>
    </div>
  )
}
