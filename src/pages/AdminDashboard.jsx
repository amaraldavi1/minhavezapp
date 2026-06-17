import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import {
  subscribeSystem,
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

  useEffect(() => {
    const unsub = subscribeSystem(
      (system) => { setData(system); setError('') },
      (e) => setError(e?.code ?? 'erro ao carregar'),
    )
    return () => unsub()
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
    ownerEmail: (b?.info?.ownerUid && data.users?.[b.info.ownerUid]?.email) || '—',
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

  async function handleRename(b) {
    const name = window.prompt('Novo nome da padaria:', b.name)
    if (name === null) return
    if (!name.trim()) { alert('O nome não pode ficar vazio.'); return }
    try { await renameBakery(b.id, name) }
    catch (e) { alert(`Erro ao renomear (${e?.code ?? e?.message}).`) }
  }

  async function handleDeleteBakery(b) {
    if (!confirm(`Excluir a padaria "${b.name}"?\n\nA fila será apagada e o dono poderá criar uma nova.`)) return
    try { await deleteBakery(b.id, b.ownerUid) }
    catch (e) { alert(`Erro ao excluir (${e?.code ?? e?.message}).`) }
  }

  async function handleDeleteAdmin(a) {
    if (!confirm(`Remover o administrador "${a.email}"?\n\nIsso apaga o registro do usuário E a padaria dele${a.bakeryName ? ` ("${a.bakeryName}")` : ''}.`)) return
    try { await deleteAdmin(a.uid, a.bakeryId) }
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
          <h1 className="admin-title">⚙️ Administração</h1>
          <p className="admin-sub">Painel do sistema</p>
        </div>
        <button className="att-logout-btn" onClick={handleLogout}>🚪 Sair</button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-value">{bakeries.length}</span>
          <span className="admin-stat-label">padarias</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{admins.length}</span>
          <span className="admin-stat-label">administradores</span>
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
          🏪 Padarias
        </button>
        <button
          className={`admin-tab ${tab === 'admins' ? 'admin-tab-active' : ''}`}
          onClick={() => setTab('admins')}
        >
          👤 Administradores
        </button>
      </div>

      {/* Bakeries */}
      {tab === 'bakeries' && (
        <div className="admin-list">
          {bakeries.length === 0 ? (
            <div className="admin-empty">Nenhuma padaria cadastrada.</div>
          ) : (
            bakeries.map((b) => (
              <div key={b.id} className="admin-card">
                <div className="admin-card-main">
                  <span className="admin-card-name">{b.name}</span>
                  <span className="admin-card-meta">{b.ownerEmail}</span>
                  <div className="admin-card-tags">
                    <span className="admin-tag">🎫 {b.waiting} na fila</span>
                    {b.serving != null && <span className="admin-tag admin-tag-green">🔔 #{b.serving}</span>}
                    <span className="admin-tag admin-tag-muted">desde {fmtDate(b.createdAt)}</span>
                  </div>
                </div>
                <div className="admin-card-actions">
                  <a className="admin-mini-btn" href={`/fila/${b.id}`} target="_blank" rel="noopener noreferrer">Abrir</a>
                  <button className="admin-mini-btn" onClick={() => handleRename(b)}>Renomear</button>
                  <button className="admin-mini-btn admin-mini-danger" onClick={() => handleDeleteBakery(b)}>Excluir</button>
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
            <div className="admin-empty">Nenhum administrador cadastrado.</div>
          ) : (
            admins.map((a) => (
              <div key={a.uid} className="admin-card">
                <div className="admin-card-main">
                  <span className="admin-card-name">{a.email}</span>
                  <span className="admin-card-meta">
                    {a.bakeryName ? `🏪 ${a.bakeryName}` : 'sem padaria'}
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
    </div>
  )
}
