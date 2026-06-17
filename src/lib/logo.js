import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { ref as dbRef, update } from 'firebase/database'
import { storage, db } from '../firebase'

export async function uploadLogo(bakeryId, file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `logos/${bakeryId}/logo.${ext}`
  const fileRef = sRef(storage, path)
  await uploadBytes(fileRef, file)
  const url = await getDownloadURL(fileRef)
  await update(dbRef(db, `bakeries/${bakeryId}/info`), { logoUrl: url })
  return url
}

export async function removeLogo(bakeryId, currentUrl) {
  if (currentUrl) {
    try {
      const fileRef = sRef(storage, currentUrl)
      await deleteObject(fileRef)
    } catch (_) {}
  }
  await update(dbRef(db, `bakeries/${bakeryId}/info`), { logoUrl: null })
}
