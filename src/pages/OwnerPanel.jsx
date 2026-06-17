import { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { signOut } from 'firebase/auth'
import { QRCodeSVG } from 'qrcode.react'
import { Navigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useSuperadmin } from '../auth/useSuperadmin'
import Onboarding from './Onboarding'
import {
  getOwnerBakeryId,
  normalizeQueue,
  sortWaiting,
  joinQueue,
  callNext as callNextOp,
  markServed as markServedOp,
  resetQueue as resetQueueOp,
  setMenuUrl as setMenuUrlOp,
} from '../lib/queue'
import { uploadLogo, removeLogo } from '../lib/logo'

export default function OwnerPanel() {
  const { user } = useAuth()
  const { checking: superChecking, isSuper } = useSuperadmin()
  const navigate = useNavigate()
  const [bakeryId, setBakeryId] = useState(undefined)
  const [queue, setQueue] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuInput, setMenuInput] = useState('')
  const [showLogo, setShowLogo] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateName, setGenerateName] = useState('')
  const [generatedTicket, setGeneratedTicket] = useState(null) // { number, name }
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    getOwnerBakeryId(user.uid)
      .then((id) => { if (active) setBakeryId(id) })
      .catch(() => { if (active) setBakeryId(null) })
    return () => { active = false }
  }, [user])

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
    if (superChecking) {
      return (
        <div className="loading">
          <span className="loading-icon">⏳</span>
          <p>Verificando permissões...</p>
        </div>
      )
    }
    if (isSuper) return <Navigate to="/admin" replace />
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
  const servingName = queue.state?.servingName ?? null
  const isServing = currentlyServing !== null
  const totalWaiting = sortedWaiting.length
  const hasNext = totalWaiting > 0
  const bakeryName = queue.info?.name ?? 'Minha Padaria'
  const menuUrl = queue.info?.menuUrl ?? ''
  const logoUrl = queue.info?.logoUrl ?? null
  const clientLink = `${window.location.origin}/fila/${bakeryId}`
  const monitorLink = `${window.location.origin}/monitor/${bakeryId}`

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

  function openLogoModal() {
    setLogoFile(null)
    setLogoPreview(null)
    setShowLogo(true)
  }

  function handleLogoFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleLogoUpload() {
    if (!logoFile || logoUploading) return
    setLogoUploading(true)
    try {
      await uploadLogo(bakeryId, logoFile)
      setShowLogo(false)
      setLogoFile(null)
      setLogoPreview(null)
    } catch (e) {
      alert(`Erro ao enviar a logomarca (${e?.code ?? e?.message}).`)
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleLogoRemove() {
    if (!confirm('Remover a logomarca do estabelecimento?')) return
    try {
      await removeLogo(bakeryId, logoUrl)
      setShowLogo(false)
    } catch (e) {
      alert(`Erro ao remover a logomarca (${e?.code ?? e?.message}).`)
    }
  }

  function openGenerateModal() {
    setGenerateName('')
    setShowGenerateModal(true)
  }

  async function handleGenerateTicket() {
    if (generating) return
    setGenerating(true)
    try {
      const number = await joinQueue(bakeryId, generateName)
      setGeneratedTicket({ number, name: generateName.trim() || null })
      setShowGenerateModal(false)
      setGenerateName('')
    } catch (e) {
      alert(`Erro ao gerar senha (${e?.code ?? e?.message}).`)
    } finally {
      setGenerating(false)
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
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="att-logo" onClick={openLogoModal} title="Editar logomarca" />
            )}
            <div>
              <h1 className="att-title">{bakeryName}</h1>
              <span className="att-badge">{totalWaiting} aguardando</span>
            </div>
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

        {/* Share QR + logo + menu link */}
        <button className="att-share-btn" onClick={() => setShowShare(true)}>
          📲 Mostrar QR Code para os clientes
        </button>
        <div className="att-tool-row">
          <button className="att-tool-btn" onClick={openLogoModal}>
            {logoUrl ? '🖼️ Editar logomarca' : '🖼️ Adicionar logomarca'}
          </button>
          <button className="att-tool-btn" onClick={openMenuModal}>
            {menuUrl ? '🔗 Editar cardápio' : '➕ Adicionar cardápio'}
          </button>
        </div>

        {/* Manual ticket generation */}
        <button className="att-generate-btn" onClick={openGenerateModal}>
          <span>🎫</span>
          <span>Gerar senha para cliente sem celular</span>
        </button>

        {/* Currently serving */}
        <div className={`att-serving-card ${isServing ? 'att-serving-active' : ''}`}>
          <span className="att-serving-label">Atendendo agora</span>
          {isServing ? (
            <>
              <span className="att-serving-number">#{currentlyServing}</span>
              {servingName && <span className="att-serving-client-name">{servingName}</span>}
            </>
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
                  {ticket.name && <span className="att-queue-name">{ticket.name}</span>}
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
                📋 Copiar link da fila
              </button>
              <a
                className="btn btn-outline w-full"
                href={monitorLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                📺 Abrir monitor (balcão)
              </a>
              <button className="btn btn-ghost" onClick={() => setShowShare(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate ticket modal — name input */}
      {showGenerateModal && (
        <div className="share-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="share-title">Gerar senha manual</h2>
            <p className="share-sub">Nome do cliente (opcional)</p>
            <div className="input-group" style={{ width: '100%', textAlign: 'left', marginTop: '0.75rem' }}>
              <label htmlFor="gname" className="input-label">Nome</label>
              <input
                id="gname"
                type="text"
                value={generateName}
                onChange={(e) => setGenerateName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateTicket()}
                placeholder="Ex: Maria Silva"
                maxLength={80}
                autoFocus
                className="input-field input-text"
              />
            </div>
            <div className="share-actions" style={{ marginTop: '1.25rem' }}>
              <button
                className="btn btn-primary w-full"
                onClick={handleGenerateTicket}
                disabled={generating}
              >
                {generating ? '⏳ Gerando...' : '🎫 Gerar senha'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowGenerateModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated ticket confirmation */}
      {generatedTicket !== null && (
        <div className="share-overlay" onClick={() => setGeneratedTicket(null)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="share-title">Senha gerada!</h2>
            <p className="share-sub">Informe este número ao cliente:</p>
            <div className="generated-ticket-number">
              #{generatedTicket.number}
            </div>
            {generatedTicket.name && (
              <p className="generated-ticket-name">{generatedTicket.name}</p>
            )}
            <p className="share-sub" style={{ marginTop: '0.5rem' }}>
              O cliente já está na fila de espera.
            </p>
            <div className="share-actions" style={{ marginTop: '1.25rem' }}>
              <button
                className="btn btn-primary w-full"
                onClick={() => { setGeneratedTicket(null); openGenerateModal() }}
              >
                🎫 Gerar outra senha
              </button>
              <button className="btn btn-ghost" onClick={() => setGeneratedTicket(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logo overlay */}
      {showLogo && (
        <div className="share-overlay" onClick={() => setShowLogo(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="share-title">Logomarca do estabelecimento</h2>
            <p className="share-sub">
              Aparece na tela do cliente ao entrar na fila.
              Formatos aceitos: JPG, PNG, WebP (máx. 2 MB).
            </p>

            {(logoPreview || logoUrl) && (
              <div className="logo-preview-wrap">
                <img
                  src={logoPreview ?? logoUrl}
                  alt="Preview da logo"
                  className="logo-preview-img"
                />
              </div>
            )}

            <label className="logo-file-label">
              {logoPreview ? '🔄 Trocar imagem' : logoUrl ? '🔄 Substituir logomarca' : '📁 Escolher imagem'}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                style={{ display: 'none' }}
              />
            </label>

            <div className="share-actions">
              {logoFile && (
                <button
                  className="btn btn-primary w-full"
                  onClick={handleLogoUpload}
                  disabled={logoUploading}
                >
                  {logoUploading ? '⏳ Enviando...' : '☁️ Salvar logomarca'}
                </button>
              )}
              {logoUrl && !logoFile && (
                <button className="btn btn-danger-ghost" onClick={handleLogoRemove}>
                  🗑️ Remover logomarca
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setShowLogo(false)}>
                Cancelar
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
