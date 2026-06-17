import { ref, get, onValue, update } from 'firebase/database'
import { db } from '../firebase'

/** Checks whether a uid is registered as a system superadmin. */
export async function checkSuperadmin(uid) {
  if (!uid) return false
  try {
    const snap = await Promise.race([
      get(ref(db, `superadmins/${uid}`)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ])
    return snap.exists() && Boolean(snap.val())
  } catch (_) {
    return false
  }
}

/**
 * Live-subscribes to the whole system (all bakeries + all user records).
 * Calls `callback({ bakeries, users })` whenever either changes.
 * Returns an unsubscribe function.
 */
export function subscribeSystem(callback, onError) {
  let bakeries = null
  let users = null
  const emit = () => {
    if (bakeries !== null && users !== null) callback({ bakeries, users })
  }
  const u1 = onValue(
    ref(db, 'bakeries'),
    (s) => { bakeries = s.val() ?? {}; emit() },
    (e) => onError?.(e),
  )
  const u2 = onValue(
    ref(db, 'users'),
    (s) => { users = s.val() ?? {}; emit() },
    (e) => onError?.(e),
  )
  return () => { u1(); u2() }
}

/** Renames a bakery (superadmin override). */
export function renameBakery(bakeryId, name) {
  return update(ref(db, `bakeries/${bakeryId}/info`), { name: name.trim() })
}

/** Deletes a bakery and unlinks it from its owner (owner keeps their account). */
export function deleteBakery(bakeryId, ownerUid) {
  const updates = { [`bakeries/${bakeryId}`]: null }
  if (ownerUid) updates[`users/${ownerUid}/bakeryId`] = null
  return update(ref(db), updates)
}

/** Fully removes an administrator: their user record and their bakery. */
export function deleteAdmin(uid, bakeryId) {
  const updates = { [`users/${uid}`]: null }
  if (bakeryId) updates[`bakeries/${bakeryId}`] = null
  return update(ref(db), updates)
}
