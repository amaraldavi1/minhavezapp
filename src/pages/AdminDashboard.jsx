import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import {
  subscribeSystem,
  createBakeryAdmin,
  sendOwnerInvite,
  renameBakery,
  deleteBakery,
  deleteAdmin,
} from '../lib/admin'

function fmtDate(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch (_) {
    return '—'
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('bakeries')

  // New bakery modal
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newBusy, setNewBusy] = useState(false)
  const [newError, setNewError] = useState('')

  // Rename modal
  const [renameModal, setRenameModal] = useState(null) // { id, currentName }
  const [renameValue, setRenameValue] = useState('')
  const [renameBusy, setRenameBusy] = useState(false)
  const [renameError, setRenameError] = useState('')

  // Per-bakery invite send state
  const [inviteSent, setInviteSent] = useState({}) // { [bakeryId]: 'sending' | 'sent' }
  const inviteTimers = useRef({})

  useEffect(() => {
    const unsub = subscribeSystem(
      (system) => { setData(system); setError('') },
      (e) => setError(e?.code ?? 'erro ao carregar'),
    )
    return () => unsub()
  }, [])

  // Clean up invite timers on unmount
  useEffect(() => {
    const timers = inviteTimers.current
    return () => Object.values(timers).forEach(clearTimeout)
  }, [])

  if (error) {
    return (
      <div className="served-view">
        <span className="served-icon">⚠️</span>
        <h2 className="served-title">Erro ao carregar</h2>
        <p className="served-message">
          {error === 'PERMISSION_DENIED'
            ? 'Permissão negada. Confirme que seu uid está em /superadmins e que as regras foram publicadas.'
            : `Código: ${error}`}
        </p>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="loading">
        <span className="loading-icon">⏳</span>
        <p>Carregando sistema...</p>
      </div>
    )
  }

  const bakeries = Object.entries(data.bakeries ?? {}).map(([id, b]) => ({
    id,
    name: b?.info?.name ?? '(sem nome)',
    ownerUid: b?.info?.ownerUid ?? null,
    ownerEmail: b?.info?.ownerUid === 'unclaimed'
      ? (b?.info?.ownerEmail ?? '—')
      : (b?.info?.ownerUid && data.users?.[b.info.ownerUid]?.email) || '—',
    ownerEmailRaw: b?.info?.ownerEmail ?? null,
    unclaimed: b?.info?.ownerUid === 'unclaimed',
    createdAt: b?.info?.createdAt,
    serving: b?.state?.currentlyServing ?? null,
    waiting: Object.keys(b?.waiting ?? {}).length,
  })).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  const admins = Object.entries(data.users ?? {}).map(([uid, u]) => ({
    uid,
    email: u?.email ?? '(sem e-mail)',
    bakeryId: u?.bakeryId ?? null,
    bakeryName: (u?.bakeryId && data.bakeries?.[u.bakeryId]?.info?.name) || null,
  })).sort((a, b) => (a.email > b.email ? 1 : -1))

  const totalWaiting = bakeries.reduce((sum, b) => sum + b.waiting, 0)
  const unclaimedCount = bakeries.filter((b) => b.unclaimed).length

  async function handleCreateBakery() {
    if (!newName.trim() || !newEmail.trim() || newBusy) return
    setNewBusy(true)
    setNewError('')
    try {
      await createBakeryAdmin(newName, newEmail)
      setShowNew(false)
      setNewName('')
      setNewEmail('')
    } catch (e) {
      setNewError(e?.message ?? `Erro ao criar estabelecimento (${e?.code ?? 'desconhecido'}).`)
    } finally {
      setNewBusy(false)
    }
  }

  async function handleSendInvite(b) {
    if (inviteSent[b.id] === 'sending') return
    setInviteSent((prev) => ({ ...prev, [b.id]: 'sending' }))
    try {
      await sendOwnerInvite(b.ownerEmail, window.location.origin)
      setInviteSent((prev) => ({ ...prev, [b.id]: 'sent' }))
      inviteTimers.current[b.id] = setTimeout(() => {
        setInviteSent((prev) => { const n = { ...prev }; delete n[b.id]; return n })
      }, 4000)
    } catch (e) {
      setInviteSent((prev) => { const n = { ...prev }; delete n[b.id]; return n })
      alert(`Erro ao enviar convite (${e?.code ?? e?.message}).`)
    }
  }

  function openRenameModal(b) {
    setRenameModal({ id: b.id })
    setRenameValue(b.name)
    setRenameError('')
    setRenameBusy(false)
  }

  async function handleRename() {
    if (!renameValue.trim() || renameBusy || !renameModal) return
    setRenameBusy(true)
    setRenameError('')
    try {
      await renameBakery(renameModal.id, renameValue)
      setRenameModal(null)
    } catch (e) {
      setRenameError(e?.message ?? `Erro ao renomear (${e?.code ?? 'desconhecido'}).`)
      setRenameBusy(false)
    }
  }

  async function handleDeleteBakery(b) {
    if (!confirm(`Excluir o estabelecimento "${b.name}"?\n\nA fila será apagada e o responsável perderá o acesso.`)) return
    try { await deleteBakery(b.id, b.ownerUid, b.ownerEmailRaw) }
    catch (e) { alert(`Erro ao excluir (${e?.code ?? e?.message}).`) }
  }

  async function handleDeleteAdmin(a) {
    if (!confirm(`Remover o administrador "${a.email}"?\n\nIsso apaga o registro do usuário E o estabelecimento dele${a.bakeryName ? ` ("${a.bakeryName}")` : ''}.`)) return
    try { await deleteAdmin(a.uid, a.bakeryId, a.email) }
    catch (e) { alert(`Erro ao remover (${e?.code ?? e?.message}).`) }
  }

  async function handleLogout() {
    await signOut(auth)
    navigate('/painel/login', { replace: true })
  }

  return (
    <div className="admin-view">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Administração</h1>
          <p className="admin-sub">Painel do sistema</p>
        </div>
        <button className="att-logout-btn" onClick={handleLogout}>Sair</button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-value">{bakeries.length}</span>
          <span className="admin-stat-label">estabelecimentos</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{admins.length}</span>
          <span className="admin-stat-label">admins ativos</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{totalWaiting}</span>
          <span className="admin-stat-label">na fila agora</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'bakeries' ? 'admin-tab-active' : ''}`}
          onClick={() => setTab('bakeries')}
        >
          Estabelecimentos {unclaimedCount > 0 && <span className="admin-tab-badge">{unclaimedCount}</span>}
        </button>
        <button
          className={`admin-tab ${tab === 'admins' ? 'admin-tab-active' : ''}`}
          onClick={() => setTab('admins')}
        >
          Administradores
        </button>
      </div>

      {/* Bakeries */}
      {tab === 'bakeries' && (
        <div className="admin-list">
          <button className="admin-new-btn" onClick={() => { setNewName(''); setNewEmail(''); setNewError(''); setShowNew(true) }}>
            ＋ Novo estabelecimento
          </button>
          {bakeries.length === 0 ? (
            <div className="admin-empty">Nenhum estabelecimento cadastrado.</div>
          ) : (
            bakeries.map((b) => (
              <div key={b.id} className={`admin-card ${b.unclaimed ? 'admin-card-unclaimed' : ''}`}>
                <div className="admin-card-main">
                  <span className="admin-card-name">{b.name}</span>
                  <span className="admin-card-meta">{b.ownerEmail}</span>
                  <div className="admin-card-tags">
                    {b.unclaimed
                      ? <span className="admin-tag admin-tag-orange">Aguardando dono</span>
                      : <span className="admin-tag admin-tag-green">Ativo</span>
                    }
                    <span className="admin-tag">{b.waiting} na fila</span>
                    {b.serving != null && <span className="admin-tag admin-tag-green">Atendendo #{b.serving}</span>}
                    <span className="admin-tag admin-tag-muted">desde {fmtDate(b.createdAt)}</span>
                  </div>
                </div>
                <div className="admin-card-actions">
                  {b.unclaimed ? (
                    <button
                      className="admin-mini-btn admin-mini-invite"
                      onClick={() => handleSendInvite(b)}
                      disabled={inviteSent[b.id] === 'sending'}
                    >
                      {inviteSent[b.id] === 'sent'
                        ? 'Enviado!'
                        : inviteSent[b.id] === 'sending'
                        ? 'Enviando...'
                        : 'Enviar convite'}
                    </button>
                  ) : (
                    <a className="admin-mini-btn" href={`/fila/${b.id}`} target="_blank" rel="noopener noreferrer">
                      Abrir
                    </a>
                  )}
                  <button className="admin-mini-btn" onClick={() => openRenameModal(b)}>
                    Renomear
                  </button>
                  <button className="admin-mini-btn admin-mini-danger" onClick={() => handleDeleteBakery(b)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Admins */}
      {tab === 'admins' && (
        <div className="admin-list">
          {admins.length === 0 ? (
            <div className="admin-empty">Nenhum administrador ativo.</div>
          ) : (
            admins.map((a) => (
              <div key={a.uid} className="admin-card">
                <div className="admin-card-main">
                  <span className="admin-card-name">{a.email}</span>
                  <span className="admin-card-meta">
                    {a.bakeryName ?? 'sem estabelecimento'}
                  </span>
                  <span className="admin-card-uid">{a.uid}</span>
                </div>
                <div className="admin-card-actions">
                  <button className="admin-mini-btn admin-mini-danger" onClick={() => handleDeleteAdmin(a)}>
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* New bakery modal */}
      {showNew && (
        <div className="share-overlay" onClick={() => !newBusy && setShowNew(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="share-title">Novo estabelecimento</h2>
            <p className="share-sub">
              O estabelecimento ficará aguardando até o responsável confirmar o acesso pelo link enviado.
            </p>
            <div className="input-group" style={{ width: '100%', textAlign: 'left', marginTop: '0.75rem' }}>
              <label htmlFor="new-name" className="input-label">Nome do estabelecimento</label>
              <input
                id="new-name"
                type="text"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNewError('') }}
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('new-email').focus()}
                placeholder="Ex: Barbearia Central"
                maxLength={60}
                autoFocus
                className="input-field input-text"
              />
            </div>
            <div className="input-group" style={{ width: '100%', textAlign: 'left', marginTop: '0.75rem' }}>
              <label htmlFor="new-email" className="input-label">E-mail do responsável</label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setNewError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBakery()}
                placeholder="responsavel@empresa.com"
                autoComplete="off"
                className="input-field input-text"
              />
            </div>
            {newError && <span className="error-msg" style={{ marginTop: '0.5rem' }}>❌ {newError}</span>}
            <div className="share-actions" style={{ marginTop: '1.25rem' }}>
              <button
                className="btn btn-primary w-full"
                onClick={handleCreateBakery}
                disabled={newBusy || !newName.trim() || !newEmail.trim()}
              >
                {newBusy ? 'Criando...' : 'Criar estabelecimento'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowNew(false)} disabled={newBusy}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renameModal && (
        <div className="share-overlay" onClick={() => !renameBusy && setRenameModal(null)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="share-title">Renomear estabelecimento</h2>
            <div className="input-group" style={{ width: '100%', textAlign: 'left', marginTop: '0.75rem' }}>
              <label htmlFor="rename-val" className="input-label">Novo nome</label>
              <input
                id="rename-val"
                type="text"
                value={renameValue}
                onChange={(e) => { setRenameValue(e.target.value); setRenameError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                maxLength={60}
                autoFocus
                className="input-field input-text"
              />
            </div>
            {renameError && <span className="error-msg" style={{ marginTop: '0.5rem' }}>❌ {renameError}</span>}
            <div className="share-actions" style={{ marginTop: '1.25rem' }}>
              <button
                className="btn btn-primary w-full"
                onClick={handleRename}
                disabled={renameBusy || !renameValue.trim()}
              >
                {renameBusy ? 'Salvando...' : 'Salvar'}
              </button>
              <button className="btn btn-ghost" onClick={() => setRenameModal(null)} disabled={renameBusy}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
