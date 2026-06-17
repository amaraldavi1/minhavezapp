import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import OwnerLogin from './pages/OwnerLogin.jsx'
import OwnerPanel from './pages/OwnerPanel.jsx'
import ClientView from './pages/ClientView.jsx'
import MonitorView from './pages/MonitorView.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import RequireAuth from './auth/RequireAuth.jsx'
import RequireSuperadmin from './auth/RequireSuperadmin.jsx'
import { firebaseConfigured } from './firebase.js'

function ConfigError() {
  return (
    <div className="served-view">
      <span className="served-icon">⚙️</span>
      <h2 className="served-title">Firebase não configurado</h2>
      <p className="served-message">
        Crie o arquivo <code>.env.local</code> na raiz do projeto com as
        credenciais do Firebase.<br /><br />
        Copie o arquivo <code>.env.example</code> como ponto de partida e
        preencha com os valores do seu projeto no&nbsp;
        <strong>Console Firebase → Configurações → Seus apps</strong>.
      </p>
    </div>
  )
}

export default function App() {
  if (!firebaseConfigured) return <ConfigError />

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/fila/:bakeryId" element={<ClientView />} />
      <Route path="/monitor/:bakeryId" element={<MonitorView />} />
      <Route path="/painel/login" element={<OwnerLogin />} />
      <Route
        path="/painel"
        element={
          <RequireAuth>
            <OwnerPanel />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireSuperadmin>
              <AdminDashboard />
            </RequireSuperadmin>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
