import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, firebaseConfigured } from '../firebase'

const AuthContext = createContext({ user: null, loading: true, authError: null })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false)
      return
    }

    // Safety net: if Firebase never responds, stop blocking the UI after 8 s.
    const timeout = window.setTimeout(() => {
      setLoading(false)
      setAuthError('timeout')
    }, 8000)

    let unsub
    try {
      unsub = onAuthStateChanged(
        auth,
        (u) => {
          clearTimeout(timeout)
          setUser(u)
          setLoading(false)
        },
        (err) => {
          clearTimeout(timeout)
          console.error('Firebase Auth error:', err)
          setAuthError(err.code ?? 'auth-error')
          setLoading(false)
        },
      )
    } catch (err) {
      clearTimeout(timeout)
      console.error('Firebase Auth init error:', err)
      setAuthError('init-error')
      setLoading(false)
    }

    return () => {
      clearTimeout(timeout)
      unsub?.()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, authError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
