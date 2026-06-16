import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import ClientView from './pages/ClientView.jsx'
import AttendantView from './pages/AttendantView.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cliente" element={<ClientView />} />
      <Route path="/atendente" element={<AttendantView />} />
    </Routes>
  )
}
