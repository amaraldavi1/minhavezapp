'use strict'

// Background queue watcher.
// Keeps a Firebase REST SSE connection alive so the user receives a
// native notification even when the browser tab is closed or backgrounded.

let eventSource = null
let currentWatch = null

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

self.addEventListener('message', ({ data }) => {
  if (!data) return
  if (data.type === 'WATCH_TICKET') {
    const { dbUrl, bakeryId, ticketNumber } = data
    if (dbUrl && bakeryId && ticketNumber != null) {
      startWatch(dbUrl, bakeryId, ticketNumber)
    }
  }
  if (data.type === 'CANCEL_WATCH') {
    stopWatch()
  }
})

function stopWatch() {
  if (eventSource) { eventSource.close(); eventSource = null }
  currentWatch = null
}

function startWatch(dbUrl, bakeryId, ticketNumber) {
  stopWatch()
  currentWatch = { ticketNumber, bakeryId }

  const base = dbUrl.replace(/\/$/, '')
  const url = `${base}/bakeries/${bakeryId}/state.json`

  try {
    eventSource = new EventSource(url)

    function checkServing(state) {
      if (!currentWatch || !state) return
      if (state.currentlyServing === currentWatch.ticketNumber) {
        fireNotification(currentWatch.ticketNumber, currentWatch.bakeryId)
      }
    }

    eventSource.addEventListener('put', (e) => {
      try { checkServing(JSON.parse(e.data).data) } catch (_) {}
    })

    // Firebase may send partial updates as 'patch'
    eventSource.addEventListener('patch', (e) => {
      try { checkServing(JSON.parse(e.data).data) } catch (_) {}
    })
  } catch (_) {}
}

function fireNotification(ticketNumber, bakeryId) {
  self.registration.showNotification('É a sua vez!', {
    body: `Senha #${ticketNumber} — Dirija-se ao balcão agora.`,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [400, 150, 400, 150, 600],
    tag: 'queue-turn',
    requireInteraction: true,
    data: { ticketNumber, bakeryId },
  })
}

self.addEventListener('notificationclick', (event) => {
  const { bakeryId } = event.notification.data ?? {}
  const url = bakeryId ? `/fila/${bakeryId}` : '/'
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((all) => {
      const match = all.find((c) => c.url.includes('/fila/'))
      if (match && 'focus' in match) return match.focus()
      return clients.openWindow(url)
    })
  )
})
