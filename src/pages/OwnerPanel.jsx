import { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { signOut } from 'firebase/auth'
import { QRCodeSVG } from 'qrcode.react'
import { db, auth } from '../firebase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useSuperadmin } from '../auth/useSuperadmin'
import Onboarding from './Onboarding'
import {
  getOwnerBakeryId,
  normalizeQueue,
  sortWaiting,
  callNext as callNextOp,
  markServed as markServedOp,
  resetQueue as resetQueueOp,
  setMenuUrl as setMenuUrlOp,
} from '../lib/queue'

export default function OwnerPanel() {
  const { user } = useAuth()
  const { isSuper } = useSuperadmin()
  const navigate = useNavigate()
  const [bakeryId, setBakeryId] = useState(undefined) // undefined=loading, null=none
  const [queue, setQueue] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuInput, setMenuInput] = useState('')

  // Resolve which bakery this owner manages.
  useEffect(() => {
    if (!user) return
    let active = true
    getOwnerBakeryId(user.uid)
      .then((id) => { if (active) setBakeryId(id) })
      .catch(() => { if (active) setBakeryId(null) })
    return () => { active = false }
  }, [user])

  // Live-subscribe to this bakery's queue.
  useEffect(() => {
    if (!bakeryId) return
    const unsub = onValue(ref(db, `bakeries/${bakeryId}`), (snap) => {
      setQueue(normalizeQueue(snap.val()))
    })
    return () => unsub()
  }, [bakeryId])

  if (bakeryId === undefined) {
    return (
      <div className="loading">
        <span className="loading-icon">⏳</span>
        <p>Carregando sua padaria...</p>
      </div>
    )
  }

  if (bakeryId === null) {
    return <Onboarding user={user} onCreated={(id) => setBakeryId(id)} />
  }

  if (!queue) {
    return (
      <div className="loading">
        <span className="loading-icon">⏳</span>
        <p>Conectando...</p>
      </div>
    )
  }

  const sortedWaiting = sortWaiting(queue.waiting)
  const currentlyServing = queue.state?.currentlyServing ?? null
  const isServing = currentlyServing !== null
  const totalWaiting = sortedWaiting.length
  const hasNext = totalWaiting > 0
  const bakeryName = queue.info?.name ?? 'Minha Padaria'
  const menuUrl = queue.info?.menuUrl ?? ''
  const clientLink = `${window.location.origin}/fila/${bakeryId}`

  function openMenuModal() {
    setMenuInput(menuUrl)
    setShowMenu(true)
  }

  async function saveMenu() {
    try {
      await setMenuUrlOp(bakeryId, menuInput)
      setShowMenu(false)
    } catch (e) {
      alert(`Erro ao salvar o cardápio (${e?.code ?? e?.message}).`)
    }
  }

  async function handleCallNext() {
    if (!hasNext || busy) return
    setBusy(true)
    try { await callNextOp(bakeryId, sortedWaiting[0]) }
    finally { setBusy(false) }
  }

  async function handleMarkServed() {
    if (!isServing || busy) return
    setBusy(true)
    try { await markServedOp(bakeryId, sortedWaiting[0] ?? null) }
    finally { setBusy(false) }
  }

  async function handleReset() {
    if (!confirm('Resetar a fila? Isso irá remover todos os clientes e começar do zero.')) return
    await resetQueueOp(bakeryId)
  }

  async function handleLogout() {
    await signOut(auth)
    navigate('/painel/login', { replace: true })
  }

  function copyLink() {
    navigator.clipboard?.writeText(clientLink)
      .then(() => alert('Link copiado!'))
      .catch(() => {})
  }

  return (
    <div className="att-wrapper">
      <div className="att-content">

        {/* Header */}
        <div className="att-header">
          <div className="att-header-left">
            <h1 className="att-title">{bakeryName}</h1>
            <span className="att-badge">{totalWaiting} aguardando</span>
          </div>
          <div className="att-header-actions">
            {isSuper && (
              <button className="att-logout-btn" onClick={() => navigate('/admin')} title="Administração">
                ⚙️ Admin
              </button>
            )}
            <button className="att-logout-btn" onClick={handleLogout} title="Sair">
              🚪 Sair
            </button>
          </div>
        </div>

        {/* Share QR + menu link */}
        <button className="att-share-btn" onClick={() => setShowShare(true)}>
          📲 Mostrar QR Code para os clientes
        </button>
        <button className="att-menu-btn" onClick={openMenuModal}>
          {menuUrl ? '🔗 Editar link do cardápio' : '➕ Adicionar link do cardápio'}
        </button>

        {/* Currently serving */}
        <div className={`att-serving-card ${isServing ? 'att-serving-active' : ''}`}>
          <span className="att-serving-label">Atendendo agora</span>
          {isServing ? (
            <span className="att-serving-number">#{currentlyServing}</span>
          ) : (
            <>
              <span className="att-serving-dash">—</span>
              <span className="att-serving-hint">
                {hasNext ? 'Chame o próximo cliente abaixo ↓' : 'Nenhum cliente na fila'}
              </span>
            </>
          )}
        </div>

        {/* Queue list */}
        <div className="att-queue-section">
          <div className="att-queue-header">
            Fila de espera &mdash; {totalWaiting} {totalWaiting === 1 ? 'pessoa' : 'pessoas'}
          </div>
          {totalWaiting === 0 ? (
            <div className="att-queue-empty">
              <span>😊</span>
              <p>Nenhum cliente aguardando</p>
            </div>
          ) : (
            <ul className="att-queue-list">
              {sortedWaiting.map((ticket, index) => (
                <li
                  key={ticket.number}
                  className={`att-queue-item ${index === 0 ? 'att-queue-next' : ''}`}
                >
                  <span className="att-queue-pos">{index + 1}º</span>
                  <span className="att-queue-num">#{ticket.number}</span>
                  {index === 0 && <span className="att-next-tag">próximo</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button className="att-reset-btn" onClick={handleReset}>
          🔄 Resetar fila
        </button>
      </div>

      {/* Fixed bottom action */}
      <div className="att-action-bar">
        {!isServing ? (
          <button
            className={`att-fab ${hasNext ? 'att-fab-amber' : 'att-fab-idle'}`}
            onClick={handleCallNext}
            disabled={!hasNext || busy}
          >
            <span className="att-fab-icon">📢</span>
            <span className="att-fab-label">
              {busy ? 'Aguarde...' : hasNext ? 'Chamar Próximo' : 'Fila vazia'}
            </span>
          </button>
        ) : (
          <button className="att-fab att-fab-green" onClick={handleMarkServed} disabled={busy}>
            <span className="att-fab-icon">✅</span>
            <span className="att-fab-label">
              {busy ? 'Aguarde...' : 'Marcar como Atendido'}
            </span>
          </button>
        )}
      </div>

      {/* Share overlay */}
      {showShare && (
        <div className="share-overlay" onClick={() => setShowShare(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="share-title">Fila da {bakeryName}</h2>
            <p className="share-sub">Cole este QR Code no balcão. O cliente escaneia e entra na fila.</p>
            <div className="share-qr">
              <QRCodeSVG value={clientLink} size={220} level="M" includeMargin />
            </div>
            <code className="share-link">{clientLink}</code>
            <div className="share-actions">
              <button className="btn btn-primary w-full" onClick={copyLink}>
                📋 Copiar link
              </button>
              <button className="btn btn-ghost" onClick={() => setShowShare(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu link overlay */}
      {showMenu && (
        <div className="share-overlay" onClick={() => setShowMenu(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="share-title">Link do cardápio</h2>
            <p className="share-sub">
              Cole o link do seu cardápio (PDF, Instagram, site...). Ele aparece
              para o cliente antes de entrar na fila.
            </p>
            <div className="input-group" style={{ width: '100%', textAlign: 'left' }}>
              <label htmlFor="menu" className="input-label">URL do cardápio</label>
              <input
                id="menu"
                type="url"
                inputMode="url"
                value={menuInput}
                onChange={(e) => setMenuInput(e.target.value)}
                placeholder="https://..."
                className="input-field input-text"
              />
            </div>
            <div className="share-actions">
              <button className="btn btn-primary w-full" onClick={saveMenu}>
                💾 Salvar
              </button>
              {menuUrl && (
                <button
                  className="btn btn-danger-ghost"
                  onClick={() => { setMenuInput(''); }}
                >
                  Limpar campo
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setShowMenu(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
