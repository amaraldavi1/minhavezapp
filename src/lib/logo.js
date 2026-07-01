import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { ref as dbRef, update } from 'firebase/database'
import { storage, db } from '../firebase'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const EXT_MAP = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
const MAX_BYTES = 2 * 1024 * 1024
const MAX_DIM = 512

/**
 * Downscales large images to keep uploads small, fast and within the Storage
 * rule's 2 MB cap. Exports to WebP so transparency (logos!) is preserved.
 * Falls back to the original file when the canvas path isn't available.
 * Returns { blob, type, ext }.
 */
async function prepareImage(file) {
  const original = { blob: file, type: file.type, ext: EXT_MAP[file.type] }
  // Animated GIFs would lose animation through a canvas — leave them as-is.
  if (file.type === 'image/gif') return original
  if (typeof document === 'undefined' || !document.createElement) return original

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.onerror = () => reject(new Error('read-failed'))
      r.readAsDataURL(file)
    })
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('decode-failed'))
      i.src = dataUrl
    })

    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
    // Already small enough in both dimensions and bytes — no need to touch it.
    if (scale === 1 && file.size <= MAX_BYTES) return original

    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9))
    if (!blob) return original
    return { blob, type: 'image/webp', ext: 'webp' }
  } catch (_) {
    return original
  }
}

export async function uploadLogo(bakeryId, ownerUid, file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato não suportado. Use JPG, PNG, WebP ou GIF.')
  }
  const { blob, type, ext } = await prepareImage(file)
  if (blob.size >= MAX_BYTES) {
    throw new Error('A imagem é muito grande (máx. 2 MB). Escolha uma imagem menor.')
  }
  const path = `logos/${ownerUid}/logo.${ext}`
  const fileRef = sRef(storage, path)
  await uploadBytes(fileRef, blob, { contentType: type })
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
