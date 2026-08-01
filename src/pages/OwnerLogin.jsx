import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPopup,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { useAuth } from '../auth/AuthContext'
import BrandLogo from '../components/BrandLogo'

const EMAIL_KEY = 'minhavez_email_for_signin'

export default function OwnerLogin() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  // If we arrived back from the email link, finish the sign-in.
  useEffect(() => {
    let isLink = false
    try { isLink = isSignInWithEmailLink(auth, window.location.href) } catch (_) {}
    if (!isLink) return
    setCompleting(true)
    let saved = window.localStorage.getItem(EMAIL_KEY)
    if (!saved) {
      const params = new URLSearchParams(window.location.search)
      saved = params.get('email') || null
    }
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

  async function handleGoogle() {
    if (googleBusy) return
    setError('')
    setGoogleBusy(true)
    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/painel', { replace: true })
    } catch (err) {
      const code = err?.code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User dismissed the popup — no error to show.
      } else if (code === 'auth/operation-not-allowed') {
        setError('Login com Google não está habilitado. Ative em ' +
          'Authentication → Sign-in method → Google.')
      } else if (code === 'auth/unauthorized-domain') {
        setError(`O domínio "${window.location.hostname}" não está autorizado. ` +
          'Adicione-o em Authentication → Settings → Domínios autorizados.')
      } else {
        setError(`Não foi possível entrar com Google${code ? ` (${code})` : ''}.`)
      }
      setGoogleBusy(false)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!email || submitting) return
    setSubmitting(true)
    setError('')
    const address = email.trim()
    try {
      await sendSignInLinkToEmail(auth, address, {
        url: window.location.origin + '/painel/login',
        handleCodeInApp: true,
      })
      window.localStorage.setItem(EMAIL_KEY, address)
      setSent(true)
    } catch (err) {
      console.error('sendSignInLinkToEmail failed:', err)
      const code = err?.code ?? ''
      let msg
      switch (code) {
        case 'auth/operation-not-allowed':
          msg = 'Login por link de e-mail não está habilitado no Firebase. ' +
                'Ative em Authentication → Sign-in method → E-mail/senha → ' +
                '"Link de e-mail (login sem senha)".'
          break
        case 'auth/unauthorized-continue-uri':
        case 'auth/invalid-continue-uri':
          msg = `O domínio "${window.location.hostname}" não está autorizado. ` +
                'Adicione-o em Authentication → Settings → Domínios autorizados.'
          break
        case 'auth/invalid-email':
          msg = 'E-mail inválido. Verifique e tente novamente.'
          break
        case 'auth/too-many-requests':
          msg = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
          break
        case 'auth/network-request-failed':
          msg = 'Falha de conexão. Verifique sua internet e tente novamente.'
          break
        default:
          msg = `Não foi possível enviar o link${code ? ` (${code})` : ''}. Tente novamente.`
      }
      setError(msg)
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
        <BrandLogo size={56} />
        <h1 className="login-title">Entrar ou criar conta</h1>

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
              Crie sua conta grátis ou entre. Sem cartão, sem senha.
            </p>

            <button
              type="button"
              className="btn btn-google w-full"
              onClick={handleGoogle}
              disabled={googleBusy}
            >
              <svg className="google-icon" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
              </svg>
              {googleBusy ? 'Conectando...' : 'Continuar com Google'}
            </button>

            <div className="login-divider"><span>ou com e-mail</span></div>

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
                {submitting ? 'Enviando...' : 'Enviar link de acesso'}
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
