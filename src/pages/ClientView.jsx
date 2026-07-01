import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import { ensureAnonAuth } from '../lib/anonClient'
import { normalizeQueue, sortWaiting, joinQueue, leaveQueue } from '../lib/queue'
import BrandLogo from '../components/BrandLogo'

function storageKey(bakeryId) {
  return `minhavez_ticket_${bakeryId}`
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.25
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.35, t + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
      osc.start(t)
      osc.stop(t + 0.6)
    })
  } catch (_) {}
}

export default function ClientView() {
  const { bakeryId } = useParams()
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [queue, setQueue] = useState(null)
  const [exists, setExists] = useState(undefined) // undefined=loading, false=not found
  const [myTicket, setMyTicket] = useState(() => {
    const v = localStorage.getItem(storageKey(bakeryId))
    return v ? parseInt(v, 10) : null
  })
  const [joining, setJoining] = useState(false)
  const prevServing = useRef(null)

  // Sign the visitor in anonymously before any read/write.
  useEffect(() => {
    ensureAnonAuth()
      .then(() => setAuthReady(true))
      .catch((err) => {
        console.error('Anonymous sign-in failed:', err)
        setAuthError(err?.code ?? 'auth-error')
      })
  }, [])

  // Subscribe to this bakery's queue.
  useEffect(() => {
    if (!authReady) return
    const unsub = onValue(ref(db, `bakeries/${bakeryId}`), (snap) => {
      if (!snap.exists()) {
        setExists(false)
        return
      }
      setExists(true)
      setQueue(normalizeQueue(snap.val()))
    })
    return () => unsub()
  }, [authReady, bakeryId])

  // Detect when it's our turn.
  useEffect(() => {
    if (!queue || !myTicket) return
    const serving = queue.state?.currentlyServing
    if (serving === myTicket && prevServing.current !== myTicket) {
      playChime()
      if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 600])
    }
    prevServing.current = serving
  }, [queue, myTicket])

  // Clear ticket if the queue was reset.
  useEffect(() => {
    if (!queue || !myTicket) return
    const nextNum = queue.state?.nextTicketNumber ?? 1
    if (nextNum <= myTicket) {
      setMyTicket(null)
      localStorage.removeItem(storageKey(bakeryId))
    }
  }, [queue, myTicket, bakeryId])

  async function handleJoin() {
    setJoining(true)
    try {
      const ticketNumber = await joinQueue(bakeryId)
      setMyTicket(ticketNumber)
      localStorage.setItem(storageKey(bakeryId), String(ticketNumber))
    } catch (err) {
      console.error('joinQueue failed:', err)
      const isPermission =
        err?.code === 'PERMISSION_DENIED' || /permission/i.test(err?.message ?? '')
      alert(
        isPermission
          ? 'Permissão negada pelo banco. Publique a versão mais recente das regras de segurança no Firebase.'
          : `Erro ao entrar na fila (${err?.code ?? err?.message ?? 'desconhecido'}). Tente novamente.`,
      )
    } finally {
      setJoining(false)
    }
  }

  async function handleLeave() {
    if (!myTicket) return
    if (!confirm('Tem certeza que deseja sair da fila?')) return
    await leaveQueue(bakeryId, myTicket)
    setMyTicket(null)
    localStorage.removeItem(storageKey(bakeryId))
  }

  function clearTicket() {
    setMyTicket(null)
    localStorage.removeItem(storageKey(bakeryId))
  }

  // === ERROR / LOADING STATES ===
  if (authError) {
    const anonDisabled =
      authError === 'auth/operation-not-allowed' ||
      authError === 'auth/admin-restricted-operation' ||
      authError === 'auth/configuration-not-found'
    return (
      <div className="served-view">
        <span className="served-icon">⚠️</span>
        <h2 className="served-title">Não foi possível entrar</h2>
        <p className="served-message">
          {anonDisabled ? (
            <>
              O login anônimo não está habilitado neste projeto Firebase.
              Peça ao responsável para ativar em{' '}
              <strong>Authentication → Sign-in method → Anônimo</strong>.
            </>
          ) : (
            <>
              Não foi possível conectar. Verifique sua internet e recarregue
              a página.<br /><br />
              <code>{authError}</code>
            </>
          )}
        </p>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!authReady || exists === undefined) {
    return (
      <div className="loading">
        <span className="loading-icon">⏳</span>
        <p>Conectando...</p>
      </div>
    )
  }

  if (exists === false) {
    return (
      <div className="served-view">
        <span className="served-icon">🔍</span>
        <h2 className="served-title">Fila não encontrada</h2>
        <p className="served-message">
          Este QR Code não é válido ou o estabelecimento ainda não configurou a fila.
          Peça ajuda a um atendente.
        </p>
      </div>
    )
  }

  const sortedWaiting = sortWaiting(queue.waiting)
  const currentlyServing = queue.state?.currentlyServing ?? null
  const bakeryName = queue.info?.name ?? 'Atendimento'
  const logoUrl = queue.info?.logoUrl ?? null
  const menuUrlRaw = queue.info?.menuUrl ?? null
  const menuUrl = menuUrlRaw && /^https?:\/\/.+/.test(menuUrlRaw) ? menuUrlRaw : null
  const isMyTurn = myTicket !== null && currentlyServing === myTicket
  const myIndex = sortedWaiting.findIndex((t) => t.number === myTicket)
  const isWaiting = myIndex !== -1
  const wasServed = myTicket !== null && !isMyTurn && !isWaiting

  // === IT'S YOUR TURN ===
  if (isMyTurn) {
    return (
      <div className="your-turn-view">
        <span className="turn-bell">🔔</span>
        <h1 className="turn-title">É A SUA VEZ!</h1>
        <div className="turn-ticket-card">
          <span className="turn-ticket-label">Senha</span>
          <span className="turn-ticket-number">{myTicket}</span>
        </div>
        <p className="turn-instruction">Dirija-se ao balcão agora</p>
      </div>
    )
  }

  // === WAITING ===
  if (isWaiting) {
    const position = myIndex + 1
    const ahead = myIndex
    return (
      <div className="view">
        <div className="page-header">
          {logoUrl
            ? <img src={logoUrl} alt={bakeryName} className="bakery-logo" />
            : <BrandLogo size={56} className="page-logo-mark" />
          }
          <h1 className="page-title">{bakeryName}</h1>
        </div>

        <div className="ticket-card">
          <span className="ticket-label">Sua senha</span>
          <span className="ticket-number-display">{myTicket}</span>
        </div>

        <div className="queue-stats">
          <div className="stat-card">
            <span className="stat-value">{position}</span>
            <span className="stat-label">posição na fila</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{ahead}</span>
            <span className="stat-label">{ahead === 1 ? 'pessoa na frente' : 'pessoas na frente'}</span>
          </div>
        </div>

        {currentlyServing && (
          <div className="currently-serving-info">
            Atendendo agora: <strong>#{currentlyServing}</strong>
          </div>
        )}

        <p className="waiting-hint">Aguarde ser chamado...</p>

        <div className="spacer" />
        <button className="btn btn-danger-ghost" onClick={handleLeave}>
          Sair da fila
        </button>
      </div>
    )
  }

  // === SERVED ===
  if (wasServed) {
    return (
      <div className="served-view">
        <span className="served-icon">✅</span>
        <h2 className="served-title">Senha atendida!</h2>
        <p className="served-message">
          Sua senha <strong>#{myTicket}</strong> já foi atendida.
        </p>
        <button className="btn btn-primary btn-huge" onClick={clearTicket}>
          Pegar nova senha
        </button>
      </div>
    )
  }

  // === NO TICKET YET ===
  return (
    <div className="view join-view">
      <div className="page-header">
        {logoUrl
          ? <img src={logoUrl} alt={bakeryName} className="bakery-logo" />
          : <BrandLogo size={56} className="page-logo-mark" />
        }
        <h1 className="page-title">{bakeryName}</h1>
        <p className="page-subtitle">
          {sortedWaiting.length === 0
            ? 'Nenhuma pessoa na fila agora!'
            : `${sortedWaiting.length} ${sortedWaiting.length === 1 ? 'pessoa' : 'pessoas'} aguardando`}
        </p>
      </div>

      <button
        className="btn btn-primary btn-huge join-btn"
        onClick={handleJoin}
        disabled={joining}
      >
        {joining ? '⏳ Aguarde...' : '🎫 Entrar na Fila'}
      </button>

      {menuUrl && (
        <a
          className="btn btn-outline join-btn menu-link"
          href={menuUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          📄 Mais informações
        </a>
      )}
    </div>
  )
}
