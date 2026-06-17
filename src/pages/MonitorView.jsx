import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import { normalizeQueue, sortWaiting } from '../lib/queue'

function Clock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="monitor-clock">
      {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}

export default function MonitorView() {
  const { bakeryId } = useParams()
  const [queue, setQueue] = useState(null)
  const [exists, setExists] = useState(undefined)
  const [flash, setFlash] = useState(false)
  const prevServing = useRef(null)

  useEffect(() => {
    const unsub = onValue(ref(db, `bakeries/${bakeryId}`), (snap) => {
      if (!snap.exists()) { setExists(false); return }
      setExists(true)
      setQueue(normalizeQueue(snap.val()))
    })
    return () => unsub()
  }, [bakeryId])

  useEffect(() => {
    if (!queue) return
    const serving = queue.state?.currentlyServing ?? null
    if (serving !== null && serving !== prevServing.current) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 1800)
      return () => clearTimeout(t)
    }
    prevServing.current = serving
  }, [queue])

  if (exists === undefined) {
    return (
      <div className="monitor-view monitor-loading-state">
        <span className="monitor-loading-dot" />
      </div>
    )
  }

  if (exists === false) {
    return (
      <div className="monitor-view monitor-error-state">
        <p>Fila não encontrada</p>
      </div>
    )
  }

  const sortedWaiting = sortWaiting(queue.waiting)
  const currentlyServing = queue.state?.currentlyServing ?? null
  const bakeryName = queue.info?.name ?? 'Padaria'
  const logoUrl = queue.info?.logoUrl ?? null
  const nextTickets = sortedWaiting.slice(0, 6)

  return (
    <div className="monitor-view">

      {/* Header */}
      <header className="monitor-header">
        <div className="monitor-header-left">
          {logoUrl && <img src={logoUrl} alt="Logo" className="monitor-logo" />}
          <span className="monitor-bakery-name">{bakeryName}</span>
        </div>
        <Clock />
      </header>

      {/* Main — currently serving */}
      <main className="monitor-main">
        <p className="monitor-serving-label">ATENDENDO AGORA</p>
        <div className={`monitor-serving-card ${flash ? 'monitor-flash' : ''}`}>
          {currentlyServing !== null ? (
            <span className="monitor-serving-number">{currentlyServing}</span>
          ) : (
            <span className="monitor-serving-idle">—</span>
          )}
        </div>
        {!currentlyServing && (
          <p className="monitor-idle-hint">
            {sortedWaiting.length === 0 ? 'Nenhum cliente na fila' : 'Aguardando chamada'}
          </p>
        )}
      </main>

      {/* Footer — queue */}
      <footer className="monitor-footer">
        <span className="monitor-footer-label">
          PRÓXIMOS — {sortedWaiting.length} {sortedWaiting.length === 1 ? 'pessoa' : 'pessoas'} aguardando
        </span>
        <div className="monitor-next-row">
          {nextTickets.length === 0 ? (
            <span className="monitor-next-empty">Fila vazia</span>
          ) : (
            nextTickets.map((t, i) => (
              <span key={t.number} className={`monitor-next-ticket ${i === 0 ? 'monitor-next-first' : ''}`}>
                {t.number}
              </span>
            ))
          )}
        </div>
      </footer>
    </div>
  )
}
