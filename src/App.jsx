import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import ClientView from './pages/ClientView.jsx'
import AttendantLogin from './pages/AttendantLogin.jsx'
import AttendantView from './pages/AttendantView.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cliente" element={<ClientView />} />
      <Route path="/atendente/login" element={<AttendantLogin />} />
      <Route
        path="/atendente"
        element={
          <ProtectedRoute>
            <AttendantView />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
