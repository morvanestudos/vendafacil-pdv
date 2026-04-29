import { useEffect, useRef } from 'react'
import Logo from './Logo'

const beneficios = [
  'Controle de vendas',
  'Estoque automatico',
  'Dashboard inteligente',
]

function Login({
  email = '',
  senha = '',
  erro = '',
  mensagem = '',
  carregando = false,
  modoCadastro = false,
  onEmailChange,
  onSenhaChange,
  onSubmit,
  onEsqueciSenhaClick,
  onAlternarModo,
}) {
  const emailInputRef = useRef(null)

  useEffect(() => {
    emailInputRef.current?.focus()
  }, [modoCadastro])

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit?.(event)
  }

  const tituloFormulario = modoCadastro ? 'Criar sua conta' : 'Entrar na sua conta'
  const descricaoFormulario = modoCadastro
    ? 'Cadastre seu acesso para liberar o painel e operar o caixa com seguranca.'
    : 'Use seu e-mail e senha para acessar o painel e acompanhar sua operacao em tempo real.'

  return (
    <section className="login-screen">
      <div className="login-layout">
        <aside className="login-showcase">
          <div className="login-showcase__content">
            <span className="login-showcase__eyebrow">PDV moderno para vender melhor</span>
            <h1>Controle seu negocio e aumente suas vendas</h1>
            <p>
              Organize clientes, controle estoque e veja quanto voce vendeu em
              tempo real.
            </p>
          </div>

          <ul className="login-benefits" aria-label="Beneficios do VendaFacil PDV">
            {beneficios.map((beneficio) => (
              <li key={beneficio} className="login-benefit">
                <span className="login-benefit__icon" aria-hidden="true" />
                <span>{beneficio}</span>
              </li>
            ))}
          </ul>

          <div className="login-proof-card">
            <span className="login-proof-card__label">Painel em tempo real</span>
            <strong>
              Tenha vendas, estoque e indicadores na mesma experiencia de operacao.
            </strong>
            <p>
              Um acesso profissional para quem quer vender com previsibilidade,
              controle e confianca.
            </p>
          </div>
        </aside>

        <div className="login-panel">
          <div className="login-card" aria-busy={carregando}>
            <div className="login-card__brand">
              <Logo className="login-logo" />
              <span className="login-card__tagline">Acesso seguro ao painel</span>
            </div>

            <div className="login-copy">
              <span className="section-label login-label">
                {modoCadastro ? 'Criar conta' : 'Entrar'}
              </span>
              <h2>{tituloFormulario}</h2>
              <p>{descricaoFormulario}</p>
            </div>

            {erro ? (
              <div className="login-error" role="alert">
                {erro}
              </div>
            ) : null}

            {mensagem ? (
              <div className="login-note" role="status">
                {mensagem}
              </div>
            ) : null}

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>E-mail</span>
                <input
                  ref={emailInputRef}
                  type="email"
                  autoComplete="email"
                  autoFocus
                  enterKeyHint="next"
                  placeholder="voce@empresa.com"
                  value={email}
                  disabled={carregando}
                  onChange={(event) => onEmailChange?.(event.target.value)}
                />
              </label>

              <label className="field">
                <span>Senha</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  placeholder="Digite sua senha"
                  value={senha}
                  disabled={carregando}
                  onChange={(event) => onSenhaChange?.(event.target.value)}
                />
              </label>

              <button
                type="submit"
                className="primary-button login-submit"
                disabled={carregando}
              >
                {carregando ? (
                  <>
                    <span className="button-spinner" aria-hidden="true" />
                    {modoCadastro ? 'Criando conta...' : 'Entrando...'}
                  </>
                ) : modoCadastro ? (
                  'Criar conta'
                ) : (
                  'Entrar'
                )}
              </button>

              <p className="login-microcopy">Teste gratis • Sem compromisso</p>
            </form>

            <div className="login-link-group">
              {onAlternarModo ? (
                <button type="button" className="login-link" onClick={onAlternarModo}>
                  {modoCadastro ? 'Ja tem conta? Entrar' : 'Criar conta'}
                </button>
              ) : null}

              {onEsqueciSenhaClick ? (
                <button
                  type="button"
                  className="login-link login-link--secondary"
                  onClick={onEsqueciSenhaClick}
                >
                  Esqueci minha senha
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Login
