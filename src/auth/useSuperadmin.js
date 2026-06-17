import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { checkSuperadmin } from '../lib/admin'

/**
 * Resolves whether the current user is a system superadmin.
 * Returns { checking, isSuper }.
 */
export function useSuperadmin() {
  const { user, loading } = useAuth()
  const [state, setState] = useState({ checking: true, isSuper: false })

  useEffect(() => {
    if (loading) return
    if (!user || user.isAnonymous) {
      setState({ checking: false, isSuper: false })
      return
    }
    let active = true
    checkSuperadmin(user.uid).then((ok) => {
      if (active) setState({ checking: false, isSuper: ok })
    })
    return () => { active = false }
  }, [user, loading])

  return state
}
