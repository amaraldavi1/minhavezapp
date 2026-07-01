import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ref, onValue } from 'firebase/database'
import { QRCodeSVG } from 'qrcode.react'
import { db } from '../firebase'
import { normalizeQueue, sortWaiting } from '../lib/queue'
import BrandLogo from '../components/BrandLogo'

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
  const servingName = queue.state?.servingName ?? null
  const bakeryName = queue.info?.name ?? 'Atendimento'
  const logoUrl = queue.info?.logoUrl ?? null
  const nextTickets = sortedWaiting.slice(0, 6)
  const clientLink = `${window.location.origin}/fila/${bakeryId}`

  const isServing = currentlyServing !== null

  return (
    <div className="monitor-view">
      <div className="monitor-ambient" aria-hidden="true" />

      {/* Header */}
      <header className="monitor-header">
        <div className="monitor-header-left">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="monitor-logo" />
            : <BrandLogo size={56} className="monitor-logo-mark" />
          }
          <div className="monitor-header-titles">
            <span className="monitor-bakery-name">{bakeryName}</span>
            <span className="monitor-bakery-sub">Painel de senhas</span>
          </div>
        </div>
        <div className="monitor-header-right">
          <span className="monitor-live">
            <span className="monitor-live-dot" />
            AO VIVO
          </span>
          <Clock />
        </div>
      </header>

      {/* Main — currently serving + QR to join */}
      <main className="monitor-main">
        <div className="monitor-serving-block">
          <p className="monitor-serving-label">
            <span className="monitor-serving-label-dot" />
            ATENDENDO AGORA
          </p>
          <div className={`monitor-serving-card ${isServing ? 'monitor-serving-on' : ''} ${flash ? 'monitor-flash' : ''}`}>
            {isServing ? (
              <>
                <span className="monitor-serving-hash">Nº</span>
                <span className="monitor-serving-number">{currentlyServing}</span>
                {servingName && (
                  <span className="monitor-serving-name">{servingName}</span>
                )}
              </>
            ) : (
              <span className="monitor-serving-idle">—</span>
            )}
          </div>
          {!isServing && (
            <p className="monitor-idle-hint">
              {sortedWaiting.length === 0 ? 'Nenhum cliente na fila' : 'Aguardando chamada'}
            </p>
          )}
        </div>

        <aside className="monitor-qr-panel">
          <span className="monitor-qr-badge">ENTRE NA FILA</span>
          <span className="monitor-qr-title">Retire sua senha aqui</span>
          <div className="monitor-qr-box">
            <QRCodeSVG value={clientLink} size={240} level="M" includeMargin />
          </div>
          <span className="monitor-qr-hint">
            <span className="monitor-qr-hint-icon">📷</span>
            Aponte a câmera do celular
          </span>
        </aside>
      </main>

      {/* Footer — queue */}
      <footer className="monitor-footer">
        <span className="monitor-footer-label">
          Próximos na fila
          <span className="monitor-footer-count">
            {sortedWaiting.length} {sortedWaiting.length === 1 ? 'aguardando' : 'aguardando'}
          </span>
        </span>
        <div className="monitor-next-row">
          {nextTickets.length === 0 ? (
            <span className="monitor-next-empty">Nenhuma senha aguardando</span>
          ) : (
            nextTickets.map((t, i) => (
              <div key={t.number} className={`monitor-next-ticket ${i === 0 ? 'monitor-next-first' : ''}`}>
                {i === 0
                  ? <span className="monitor-next-tag">PRÓXIMO</span>
                  : <span className="monitor-next-pos">{i + 1}º</span>
                }
                <span className="monitor-next-num">{t.number}</span>
                {t.name && <span className="monitor-next-name">{t.name}</span>}
              </div>
            ))
          )}
        </div>
      </footer>
    </div>
  )
}
