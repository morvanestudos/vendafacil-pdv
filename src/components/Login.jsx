import Logo from './Logo'

function Login({
  email = '',
  senha = '',
  erro = '',
  carregando = false,
  onEmailChange,
  onSenhaChange,
  onSubmit,
  onEsqueciSenhaClick,
}) {
  function handleSubmit(event) {
    event.preventDefault()
    onSubmit?.(event)
  }

  return (
    <section className="login-screen">
      <div className="login-card">
        <Logo className="login-logo" />

        <div className="login-copy">
          <span className="section-label login-label">Acesso</span>
          <h1>Acesse o VendaFácil PDV</h1>
          <p>
            Entre com suas credenciais para continuar operando o caixa com
            seguranca e rapidez.
          </p>
        </div>

        {erro ? (
          <div className="login-error" role="alert">
            {erro}
          </div>
        ) : null}

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(event) => onEmailChange?.(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(event) => onSenhaChange?.(event.target.value)}
            />
          </label>

          <button type="submit" className="primary-button login-submit" disabled={carregando}>
            {carregando ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <button
          type="button"
          className="login-link"
          onClick={onEsqueciSenhaClick}
        >
          Esqueci minha senha
        </button>
      </div>
    </section>
  )
}

export default Login
