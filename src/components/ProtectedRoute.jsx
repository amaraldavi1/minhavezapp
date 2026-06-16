import { Navigate } from 'react-router-dom'

const AUTH_KEY = 'minhavez_attendant_auth'

export function isAuthenticated() {
  return sessionStorage.getItem(AUTH_KEY) === 'true'
}

export function login() {
  sessionStorage.setItem(AUTH_KEY, 'true')
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY)
}

export default function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/atendente/login" replace />
  }
  return children
}
