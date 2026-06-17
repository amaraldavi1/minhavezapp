import { useState } from 'react'
import { createBakery } from '../lib/queue'

export default function Onboarding({ user, onCreated }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const bakeryId = await createBakery(user.uid, user.email, name)
      onCreated(bakeryId)
    } catch (err) {
      console.error('createBakery failed:', err)
      const isPermission =
        err?.code === 'PERMISSION_DENIED' ||
        /permission/i.test(err?.message ?? '')
      setError(
        isPermission
          ? 'Permissão negada pelo banco. Publique as regras de segurança (database.rules.json) no Firebase.'
          : `Não foi possível criar a padaria (${err?.code ?? err?.message ?? 'erro'}).`,
      )
      setBusy(false)
    }
  }

  return (
    <div className="login-view">
      <div className="login-card">
        <span className="login-icon">🏪</span>
        <h1 className="login-title">Sua padaria</h1>
        <p className="login-subtitle">
          Vamos configurar! Como se chama o seu estabelecimento?
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="bname" className="input-label">Nome da padaria</label>
            <input
              id="bname"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              placeholder="Ex: Padaria Pão Quente"
              autoFocus
              maxLength={60}
              className={`input-field input-text ${error ? 'input-error' : ''}`}
            />
            {error && <span className="error-msg">❌ {error}</span>}
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={busy || !name.trim()}
          >
            {busy ? '⏳ Criando...' : '🎉 Criar minha fila'}
          </button>
        </form>
      </div>
    </div>
  )
}
