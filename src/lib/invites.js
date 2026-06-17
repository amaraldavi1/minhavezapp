import { ref, get, update } from 'firebase/database'
import { db } from '../firebase'

export function encodeEmail(email) {
  return email.replace(/\./g, ',')
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

export async function claimInvite(uid, email, bakeryId) {
  await update(ref(db), {
    [`bakeries/${bakeryId}/info/ownerUid`]: uid,
    [`users/${uid}`]: { bakeryId, email },
    [`invites/${encodeEmail(email)}`]: null,
  })
  return bakeryId
}
