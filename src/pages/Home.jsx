import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home">
      <div className="home-hero">
        <span className="home-logo">🍞</span>
        <h1 className="home-title">Padaria</h1>
        <p className="home-subtitle">Bem-vindo! Como posso ajudar?</p>
      </div>

      <div className="home-buttons">
        <button className="btn btn-primary btn-huge" onClick={() => navigate('/cliente')}>
          🎫 Sou Cliente
        </button>
        <button className="btn btn-brown btn-huge" onClick={() => navigate('/atendente')}>
          👩‍🍳 Sou Atendente
        </button>
      </div>
    </div>
  )
}
