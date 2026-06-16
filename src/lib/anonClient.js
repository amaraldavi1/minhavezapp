import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'

/**
 * Ensures the visitor has a Firebase identity. Customers never log in, so we
 * sign them in anonymously — this gives each device a stable uid that the
 * security rules can key off, without any friction for the customer.
 *
 * Resolves with the current user (existing session reused if present).
 */
export function ensureAnonAuth() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub()
      if (user) {
        resolve(user)
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user))
          .catch(reject)
      }
    })
  })
}
