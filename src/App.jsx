import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import OwnerLogin from './pages/OwnerLogin.jsx'
import OwnerPanel from './pages/OwnerPanel.jsx'
import ClientView from './pages/ClientView.jsx'
import RequireAuth from './auth/RequireAuth.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/fila/:bakeryId" element={<ClientView />} />
      <Route path="/painel/login" element={<OwnerLogin />} />
      <Route
        path="/painel"
        element={
          <RequireAuth>
            <OwnerPanel />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
