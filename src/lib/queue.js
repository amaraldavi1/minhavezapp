import { ref, get, set, push, update, remove, runTransaction } from 'firebase/database'
import { db } from '../firebase'

export function padTicket(n) {
  return String(n).padStart(4, '0')
}

const emptyQueue = () => ({
  state: { nextTicketNumber: 1, currentlyServing: null },
  waiting: {},
})

/** Normalizes a raw snapshot so pages never deal with missing nodes. */
export function normalizeQueue(raw) {
  const data = raw ?? {}
  return {
    info: data.info ?? null,
    state: data.state ?? { nextTicketNumber: 1, currentlyServing: null },
    waiting: data.waiting ?? {},
  }
}

/** Returns waiting tickets sorted by arrival (ticket number ascending). */
export function sortWaiting(waiting) {
  return Object.values(waiting ?? {}).sort((a, b) => a.number - b.number)
}

/** Reads the bakery id this owner manages, or null if they have none yet.
 *  Races against a 10-second timeout so the UI never hangs on DB issues. */
export async function getOwnerBakeryId(uid) {
  const fetchPromise = get(ref(db, `users/${uid}/bakeryId`))
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('db-timeout')), 10_000),
  )
  const snap = await Promise.race([fetchPromise, timeoutPromise])
  return snap.exists() ? snap.val() : null
}

/** Creates a fresh bakery owned by `uid` and links it to the user record. */
export async function createBakery(uid, email, name) {
  const bakeryRef = push(ref(db, 'bakeries'))
  const bakeryId = bakeryRef.key
  await set(bakeryRef, {
    info: {
      name: name.trim(),
      ownerUid: uid,
      createdAt: Date.now(),
    },
    ...emptyQueue(),
  })
  await set(ref(db, `users/${uid}`), { bakeryId, email: email ?? null })
  return bakeryId
}

/** Customer joins: claims the next sequential ticket via a transaction.
 *  The transaction targets ONLY state/nextTicketNumber — never the whole
 *  state node — so it doesn't touch currentlyServing, which the security
 *  rules reserve for the owner. */
export async function joinQueue(bakeryId) {
  const result = await runTransaction(
    ref(db, `bakeries/${bakeryId}/state/nextTicketNumber`),
    (current) => (current ?? 1) + 1,
  )
  // The committed value is the next ticket; ours is one below it.
  const ticketNumber = result.snapshot.val() - 1
  await update(ref(db, `bakeries/${bakeryId}/waiting/${padTicket(ticketNumber)}`), {
    number: ticketNumber,
    joinedAt: Date.now(),
  })
  return ticketNumber
}

export function leaveQueue(bakeryId, ticketNumber) {
  return remove(ref(db, `bakeries/${bakeryId}/waiting/${padTicket(ticketNumber)}`))
}

/** Moves the first waiting ticket into "currently serving". */
export function callNext(bakeryId, next) {
  return update(ref(db, `bakeries/${bakeryId}`), {
    'state/currentlyServing': next.number,
    [`waiting/${padTicket(next.number)}`]: null,
  })
}

/** Finishes the current ticket and pulls the next one in (if any). */
export function markServed(bakeryId, next) {
  if (next) {
    return update(ref(db, `bakeries/${bakeryId}`), {
      'state/currentlyServing': next.number,
      [`waiting/${padTicket(next.number)}`]: null,
    })
  }
  return update(ref(db, `bakeries/${bakeryId}/state`), { currentlyServing: null })
}

/** Clears the queue for end of day, preserving the bakery's info/ownership.
 *  Uses explicit paths so each write hits the correct security rule. */
export function resetQueue(bakeryId) {
  return update(ref(db, `bakeries/${bakeryId}`), {
    'state/nextTicketNumber': 1,
    'state/currentlyServing': null,
    'waiting': null,
  })
}
