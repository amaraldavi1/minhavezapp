'use strict'

// Minimal service worker. It carries NO background logic — service workers are
// terminated when idle and can't keep a connection alive, so background polling
// is impossible without a push service (FCM). Its only jobs are:
//   1. Exist, so the open page can call registration.showNotification()
//      (the only way to show notifications on Android/Chrome).
//   2. Focus/open the queue tab when a notification is clicked.
// The page itself detects "your turn" and fires the notification while open.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('notificationclick', (event) => {
  const { bakeryId } = event.notification.data ?? {}
  const url = bakeryId ? `/fila/${bakeryId}` : '/'
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((all) => {
      const match = all.find((c) => c.url.includes('/fila/'))
      if (match && 'focus' in match) return match.focus()
      return self.clients.openWindow(url)
    })
  )
})
