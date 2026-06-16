import { useState, useEffect, useRef } from 'react'
import { ref, onValue, runTransaction, update, remove } from 'firebase/database'
import { db } from '../firebase'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'minhavez_ticket'

function padTicket(n) {
  return String(n).padStart(4, '0')
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
  const [queueData, setQueueData] = useState(null)
  const [myTicket, setMyTicket] = useState(() => {
    const v = localStorage.getItem(STORAGE_KEY)
    return v ? parseInt(v, 10) : null
  })
  const [joining, setJoining] = useState(false)
  const prevServing = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'bakeryQueue'), (snap) => {
      const data = snap.val() ?? {
        state: { nextTicketNumber: 1, currentlyServing: null },
        waiting: {},
      }
      if (!data.state) data.state = { nextTicketNumber: 1, currentlyServing: null }
      if (!data.waiting) data.waiting = {}
      setQueueData(data)
    })
    return () => unsubscribe()
  }, [])

  // Detect when it's our turn
  useEffect(() => {
    if (!queueData || !myTicket) return
    const serving = queueData.state?.currentlyServing
    if (serving === myTicket && prevServing.current !== myTicket) {
      playChime()
      if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 600])
    }
    prevServing.current = serving
  }, [queueData, myTicket])

  // Clear ticket if queue was reset
  useEffect(() => {
    if (!queueData || !myTicket) return
    const nextNum = queueData.state?.nextTicketNumber ?? 1
    if (nextNum <= myTicket) {
      setMyTicket(null)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [queueData, myTicket])

  async function joinQueue() {
    setJoining(true)
    try {
      let ticketNumber = null
      await runTransaction(ref(db, 'bakeryQueue/state'), (state) => {
        if (state === null) state = { nextTicketNumber: 1, currentlyServing: null }
        ticketNumber = state.nextTicketNumber
        return { ...state, nextTicketNumber: state.nextTicketNumber + 1 }
      })
      await update(ref(db, `bakeryQueue/waiting/${padTicket(ticketNumber)}`), {
        number: ticketNumber,
        joinedAt: Date.now(),
      })
      setMyTicket(ticketNumber)
      localStorage.setItem(STORAGE_KEY, String(ticketNumber))
    } catch (err) {
      alert('Erro ao entrar na fila. Verifique sua conexão e tente novamente.')
    } finally {
      setJoining(false)
    }
  }

  async function leaveQueue() {
    if (!myTicket) return
    if (!confirm('Tem certeza que deseja sair da fila?')) return
    await remove(ref(db, `bakeryQueue/waiting/${padTicket(myTicket)}`))
    setMyTicket(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  function clearTicketAndRejoin() {
    setMyTicket(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  if (!queueData) {
    return (
      <div className="loading">
        <span className="loading-icon">⏳</span>
        <p>Conectando...</p>
      </div>
    )
  }

  const waiting = queueData.waiting ?? {}
  const sortedWaiting = Object.values(waiting).sort((a, b) => a.number - b.number)
  const currentlyServing = queueData.state?.currentlyServing ?? null
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

  // === WAITING IN QUEUE ===
  if (isWaiting) {
    const position = myIndex + 1
    const ahead = myIndex
    return (
      <div className="view">
        <div className="page-header">
          <span className="page-icon">🍞</span>
          <h1 className="page-title">Sua Senha</h1>
        </div>

        <div className="ticket-card">
          <span className="ticket-label">Nº</span>
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
        <button className="btn btn-danger-ghost" onClick={leaveQueue}>
          Sair da fila
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          ← Voltar
        </button>
      </div>
    )
  }

  // === TICKET WAS SERVED ===
  if (wasServed) {
    return (
      <div className="served-view">
        <span className="served-icon">✅</span>
        <h2 className="served-title">Senha atendida!</h2>
        <p className="served-message">
          Sua senha <strong>#{myTicket}</strong> já foi atendida.
        </p>
        <button className="btn btn-primary btn-huge" onClick={clearTicketAndRejoin}>
          Pegar nova senha
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          ← Voltar
        </button>
      </div>
    )
  }

  // === NO TICKET YET ===
  return (
    <div className="view join-view">
      <div className="page-header">
        <span className="page-icon">🍞</span>
        <h1 className="page-title">Fila da Padaria</h1>
        <p className="page-subtitle">
          {sortedWaiting.length === 0
            ? 'Nenhuma pessoa na fila agora!'
            : `${sortedWaiting.length} ${sortedWaiting.length === 1 ? 'pessoa' : 'pessoas'} aguardando`}
        </p>
      </div>

      <button
        className="btn btn-primary btn-huge join-btn"
        onClick={joinQueue}
        disabled={joining}
      >
        {joining ? '⏳ Aguarde...' : '🎫 Entrar na Fila'}
      </button>

      <button className="btn btn-ghost" onClick={() => navigate('/')}>
        ← Voltar
      </button>
    </div>
  )
}
