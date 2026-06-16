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

  return (
    <div className="attendant-view">
      <div className="attendant-header">
        <div>
          <h1 className="attendant-title">Painel da Atendente</h1>
          <p className="attendant-sub">🏪 Gerenciamento de fila</p>
        </div>
        <div className="waiting-badge">
          {totalWaiting} {totalWaiting === 1 ? 'aguardando' : 'aguardando'}
        </div>
      </div>

      {/* Currently Serving Card */}
      <div className={`serving-card ${currentlyServing ? 'serving-active' : ''}`}>
        <span className="serving-label">Atendendo Agora</span>
        {currentlyServing ? (
          <span className="serving-number">#{currentlyServing}</span>
        ) : (
          <span className="serving-empty">—</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-area">
        {!currentlyServing ? (
          <button
            className="btn btn-primary w-full"
            onClick={callNext}
            disabled={!hasNext || busy}
          >
            📢 Chamar Próximo
          </button>
        ) : (
          <button
            className="btn btn-success w-full"
            onClick={markAsServed}
            disabled={busy}
          >
            ✅ Marcar como Atendido
          </button>
        )}
      </div>

      {/* Queue List */}
      <div className="queue-list-section">
        <div className="queue-list-header">
          Fila de espera — {totalWaiting} {totalWaiting === 1 ? 'pessoa' : 'pessoas'}
        </div>
        {totalWaiting === 0 ? (
          <div className="queue-empty-msg">
            <span>😊</span>
            <p>Nenhum cliente aguardando</p>
          </div>
        ) : (
          <ul className="queue-list">
            {sortedWaiting.map((ticket, index) => (
              <li
                key={ticket.number}
                className={`queue-item ${index === 0 ? 'queue-item-next' : ''}`}
              >
                <span className="queue-pos">{index + 1}º</span>
                <span className="queue-ticket-num">#{ticket.number}</span>
                {index === 0 && <span className="next-tag">próximo</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bottom actions */}
      <div className="bottom-actions">
        <button className="btn btn-danger w-full" onClick={resetQueue}>
          🔄 Resetar Fila
        </button>
        <button
          className="btn btn-ghost logout-btn"
          onClick={() => {
            logout()
            navigate('/atendente/login', { replace: true })
          }}
        >
          🚪 Sair
        </button>
      </div>
    </div>
  )
}
