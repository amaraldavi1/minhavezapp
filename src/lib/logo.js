import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { ref as dbRef, update } from 'firebase/database'
import { storage, db } from '../firebase'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const EXT_MAP = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

export async function uploadLogo(bakeryId, ownerUid, file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato não suportado. Use JPG, PNG ou WebP.')
  }
  const ext = EXT_MAP[file.type]
  const path = `logos/${ownerUid}/logo.${ext}`
  const fileRef = sRef(storage, path)
  await uploadBytes(fileRef, file)
  const url = await getDownloadURL(fileRef)
  await update(dbRef(db, `bakeries/${bakeryId}/info`), { logoUrl: url })
  return url
}

export async function removeLogo(bakeryId, ownerUid) {
  await Promise.allSettled(
    Object.values(EXT_MAP).map((ext) =>
      deleteObject(sRef(storage, `logos/${ownerUid}/logo.${ext}`))
    )
  )
  await update(dbRef(db, `bakeries/${bakeryId}/info`), { logoUrl: null })
}
