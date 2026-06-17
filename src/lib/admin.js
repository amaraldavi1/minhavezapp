import { ref, get, push, onValue, update } from 'firebase/database'
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

/** Creates an unclaimed bakery, an invite, and authorizes the owner's e-mail.
 *  Done atomically so the e-mail is never authorized without a matching bakery. */
export async function createBakeryAdmin(name, ownerEmail) {
  const email = ownerEmail.trim().toLowerCase()
  const bakeryId = push(ref(db, 'bakeries')).key
  const encoded = encodeEmail(email)
  await update(ref(db), {
    [`bakeries/${bakeryId}/info`]: {
      name: name.trim(),
      ownerUid: 'unclaimed',
      ownerEmail: email,
      createdAt: Date.now(),
    },
    [`invites/${encoded}`]: {
      bakeryId,
      bakeryName: name.trim(),
      ownerEmail: email,
      createdAt: Date.now(),
    },
    [`allowedEmails/${encoded}`]: true,
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

/** Deletes a bakery, unlinks its owner, removes the invite, and revokes the
 *  owner's e-mail authorization so they can no longer request a sign-in link. */
export function deleteBakery(bakeryId, ownerUid, ownerEmail) {
  const updates = { [`bakeries/${bakeryId}`]: null }
  if (ownerUid && ownerUid !== 'unclaimed') {
    updates[`users/${ownerUid}/bakeryId`] = null
  }
  if (ownerEmail) {
    const encoded = encodeEmail(ownerEmail)
    updates[`invites/${encoded}`] = null
    updates[`allowedEmails/${encoded}`] = null
  }
  return update(ref(db), updates)
}

/** Fully removes an administrator: user record, bakery, and e-mail authorization. */
export function deleteAdmin(uid, bakeryId, email) {
  const updates = { [`users/${uid}`]: null }
  if (bakeryId) updates[`bakeries/${bakeryId}`] = null
  if (email) updates[`allowedEmails/${encodeEmail(email)}`] = null
  return update(ref(db), updates)
}
