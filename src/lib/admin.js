import { ref, get, set, push, onValue, update } from 'firebase/database'
import { sendSignInLinkToEmail } from 'firebase/auth'
import { db, auth } from '../firebase'
import { encodeEmail } from './invites'

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

/** Creates an unclaimed bakery and a matching invite for the owner email. */
export async function createBakeryAdmin(name, ownerEmail) {
  const email = ownerEmail.trim().toLowerCase()
  const bakeryRef = push(ref(db, 'bakeries'))
  const bakeryId = bakeryRef.key
  await set(bakeryRef, {
    info: {
      name: name.trim(),
      ownerUid: 'unclaimed',
      ownerEmail: email,
      createdAt: Date.now(),
    },
  })
  await set(ref(db, `invites/${encodeEmail(email)}`), {
    bakeryId,
    bakeryName: name.trim(),
    ownerEmail: email,
    createdAt: Date.now(),
  })
  return bakeryId
}

/** Sends a magic-link sign-in email to the prospective bakery owner. */
export function sendOwnerInvite(email, origin) {
  return sendSignInLinkToEmail(auth, email, {
    url: `${origin}/painel/login?email=${encodeURIComponent(email)}`,
    handleCodeInApp: true,
  })
}

/** Renames a bakery (superadmin override). */
export function renameBakery(bakeryId, name) {
  return update(ref(db, `bakeries/${bakeryId}/info`), { name: name.trim() })
}

/** Deletes a bakery and unlinks it from its owner.
 *  Also removes the invite if the bakery was unclaimed. */
export function deleteBakery(bakeryId, ownerUid, ownerEmail) {
  const updates = { [`bakeries/${bakeryId}`]: null }
  if (ownerUid && ownerUid !== 'unclaimed') {
    updates[`users/${ownerUid}/bakeryId`] = null
  }
  if (ownerEmail) {
    updates[`invites/${encodeEmail(ownerEmail)}`] = null
  }
  return update(ref(db), updates)
}

/** Fully removes an administrator: their user record and their bakery. */
export function deleteAdmin(uid, bakeryId) {
  const updates = { [`users/${uid}`]: null }
  if (bakeryId) updates[`bakeries/${bakeryId}`] = null
  return update(ref(db), updates)
}
