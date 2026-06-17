import { ref, get, update } from 'firebase/database'
import { db } from '../firebase'

/** Encodes an e-mail into a Firebase-safe key (lowercased, dots → commas). */
export function encodeEmail(email) {
  return email.trim().toLowerCase().replace(/\./g, ',')
}

export async function getInviteByEmail(email) {
  if (!email) return null
  try {
    const snap = await get(ref(db, `invites/${encodeEmail(email)}`))
    return snap.exists() ? snap.val() : null
  } catch (_) {
    return null
  }
}

/**
 * Checks the public allowlist to see if an e-mail may request a sign-in link.
 * Readable without authentication so the login page can gate the magic link.
 */
export async function isAllowedEmail(email) {
  if (!email) return false
  try {
    const snap = await get(ref(db, `allowedEmails/${encodeEmail(email)}`))
    return snap.exists() && Boolean(snap.val())
  } catch (_) {
    return false
  }
}

export async function claimInvite(uid, email, bakeryId) {
  await update(ref(db), {
    [`bakeries/${bakeryId}/info/ownerUid`]: uid,
    [`users/${uid}`]: { bakeryId, email },
    [`invites/${encodeEmail(email)}`]: null,
  })
  return bakeryId
}
