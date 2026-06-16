import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      <div className="landing-hero">
        <span className="landing-logo">🍞</span>
        <h1 className="landing-title">Minha Vez</h1>
        <p className="landing-tagline">
          Fila digital para sua padaria.<br />Sem papelzinho, sem confusão.
        </p>
      </div>

      <div className="landing-cta">
        <button
          className="btn btn-primary btn-huge"
          onClick={() => navigate('/painel/login')}
        >
          👩‍🍳 Acessar painel
        </button>
        <p className="landing-owner-hint">
          Para donos e atendentes da padaria
        </p>
      </div>

      <div className="landing-client-note">
        <span className="landing-qr-icon">📱</span>
        <p>
          <strong>É cliente?</strong> Escaneie o QR Code exposto no balcão
          da padaria para entrar na fila.
        </p>
      </div>
    </div>
  )
}
