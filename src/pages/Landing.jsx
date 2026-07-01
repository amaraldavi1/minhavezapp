import { useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'

const FEATURES = [
  { icon: '📱', title: 'Entrada por QR Code', desc: 'O cliente escaneia e entra na fila pelo próprio celular.' },
  { icon: '⚡', title: 'Tempo real', desc: 'Senhas e chamadas atualizam na hora, sem recarregar.' },
  { icon: '📺', title: 'Painel de senhas', desc: 'Exiba a senha atual em qualquer TV ou monitor.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      <div className="landing-hero">
        <BrandLogo size={76} className="landing-logo-mark" />
        <h1 className="landing-title">Minha Vez</h1>
        <p className="landing-tagline">
          Gestão de filas digitais para o seu negócio.<br />
          Sem senha de papel, sem aglomeração.
        </p>
      </div>

      <div className="landing-cta">
        <button
          className="btn btn-primary btn-huge"
          onClick={() => navigate('/painel/login')}
        >
          Acessar painel →
        </button>
        <p className="landing-owner-hint">
          Para gestores e atendentes do estabelecimento
        </p>
      </div>

      <div className="landing-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="landing-feature">
            <span className="landing-feature-icon">{f.icon}</span>
            <div>
              <span className="landing-feature-title">{f.title}</span>
              <span className="landing-feature-desc">{f.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="landing-client-note">
        <span className="landing-qr-icon">📷</span>
        <p>
          <strong>É cliente?</strong> Escaneie o QR Code exposto no
          balcão do estabelecimento para entrar na fila.
        </p>
      </div>
    </div>
  )
}
