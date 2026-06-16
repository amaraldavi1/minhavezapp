import { useState, useEffect } from 'react'
import { ref, onValue, update, set } from 'firebase/database'
import { db } from '../firebase'
import { useNavigate } from 'react-router-dom'
import { logout } from '../components/ProtectedRoute'

function padTicket(n) {
  return String(n).padStart(4, '0')
}

export default function AttendantView() {
  const [queueData, setQueueData] = useState(null)
  const [busy, setBusy] = useState(false)
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

  const waiting = queueData?.waiting ?? {}
  const sortedWaiting = Object.values(waiting).sort((a, b) => a.number - b.number)
  const currentlyServing = queueData?.state?.currentlyServing ?? null

  async function callNext() {
    if (sortedWaiting.length === 0 || busy) return
    setBusy(true)
    try {
      const next = sortedWaiting[0]
      await update(ref(db, 'bakeryQueue'), {
        'state/currentlyServing': next.number,
        [`waiting/${padTicket(next.number)}`]: null,
      })
    } finally {
      setBusy(false)
    }
  }

  async function markAsServed() {
    if (!currentlyServing || busy) return
    setBusy(true)
    try {
      if (sortedWaiting.length > 0) {
        const next = sortedWaiting[0]
        await update(ref(db, 'bakeryQueue'), {
          'state/currentlyServing': next.number,
          [`waiting/${padTicket(next.number)}`]: null,
        })
      } else {
        await update(ref(db, 'bakeryQueue/state'), { currentlyServing: null })
      }
    } finally {
      setBusy(false)
    }
  }

  async function resetQueue() {
    if (!confirm('Resetar a fila? Isso irá remover todos os clientes e começar do zero.')) return
    await set(ref(db, 'bakeryQueue'), {
      state: { nextTicketNumber: 1, currentlyServing: null },
      waiting: {},
    })
  }

  function handleLogout() {
    logout()
    navigate('/atendente/login', { replace: true })
  }

  if (!queueData) {
    return (
      <div className="loading">
        <span className="loading-icon">⏳</span>
        <p>Conectando...</p>
      </div>
    )
  }

  const totalWaiting = sortedWaiting.length
  const hasNext = totalWaiting > 0
  const isServing = currentlyServing !== null

  return (
    <div className="att-wrapper">
      {/* ── Scrollable content ── */}
      <div className="att-content">

        {/* Header */}
        <div className="att-header">
          <div className="att-header-left">
            <h1 className="att-title">Painel</h1>
            <span className="att-badge">
              {totalWaiting} aguardando
            </span>
          </div>
          <button className="att-logout-btn" onClick={handleLogout} title="Sair">
            🚪 Sair
          </button>
        </div>

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

        {/* Reset — secondary action, bottom of scroll */}
        <button className="att-reset-btn" onClick={resetQueue}>
          🔄 Resetar fila
        </button>

      </div>

      {/* ── Fixed bottom action bar ── */}
      <div className="att-action-bar">
        {!isServing ? (
          <button
            className={`att-fab ${hasNext ? 'att-fab-amber' : 'att-fab-idle'}`}
            onClick={callNext}
            disabled={!hasNext || busy}
          >
            <span className="att-fab-icon">📢</span>
            <span className="att-fab-label">
              {busy ? 'Aguarde...' : hasNext ? 'Chamar Próximo' : 'Fila vazia'}
            </span>
          </button>
        ) : (
          <button
            className="att-fab att-fab-green"
            onClick={markAsServed}
            disabled={busy}
          >
            <span className="att-fab-icon">✅</span>
            <span className="att-fab-label">
              {busy ? 'Aguarde...' : 'Marcar como Atendido'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
