import { useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'

const STEPS = [
  {
    num: '01',
    title: 'QR Code no balcão',
    desc: 'O cliente escaneia com o celular e entra na fila — sem papel, sem senha física.',
  },
  {
    num: '02',
    title: 'Acompanha pelo celular',
    desc: 'Vê a posição em tempo real e aguarda onde quiser, sem ficar em pé.',
  },
  {
    num: '03',
    title: 'Você chama, eles aparecem',
    desc: 'Um toque chama o próximo. O cliente recebe aviso e vai ao balcão.',
  },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      <div className="landing-hero">
        <BrandLogo size={52} className="landing-logo-mark" />
        <span className="landing-eyebrow">Gestão de filas digitais</span>
        <h1 className="landing-title">Fila digital<br />para o seu negócio.</h1>
        <p className="landing-tagline">
          Seus clientes entram na fila pelo celular.<br />
          Você chama. Eles aparecem.
        </p>

        <div className="landing-ticket-board">
          <div className="landing-ticket-eyebrow">
            <span className="landing-ticket-live-dot" />
            Atendendo agora
          </div>
          <div className="landing-ticket-number">042</div>
          <div className="landing-ticket-meta">
            <div>
              <span className="landing-ticket-meta-item">Na fila</span>
              <span className="landing-ticket-meta-value">5</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="landing-ticket-meta-item">Próximo</span>
              <span className="landing-ticket-meta-value">#043</span>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-cta">
        <button
          className="btn btn-primary btn-huge w-full"
          onClick={() => navigate('/painel/login')}
        >
          Criar conta grátis →
        </button>
        <p className="landing-owner-hint">Grátis para começar · Sem cartão de crédito</p>
      </div>

      <div className="landing-steps">
        {STEPS.map((s) => (
          <div key={s.num} className="landing-step">
            <div className="landing-step-num">{s.num}</div>
            <div>
              <span className="landing-step-title">{s.title}</span>
              <span className="landing-step-desc">{s.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="landing-client-hint">
        <strong>É cliente?</strong> Escaneie o QR Code exposto no balcão do
        estabelecimento para entrar na fila.
      </div>
    </div>
  )
}
