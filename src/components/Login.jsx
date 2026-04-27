import Logo from './Logo'

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
          <h1>
            {modoCadastro
              ? 'Crie sua conta no VendaFácil PDV'
              : 'Acesse o VendaFácil PDV'}
          </h1>
          <p>
            {modoCadastro
              ? 'Cadastre seu acesso para entrar no painel e operar o caixa com seguranca.'
              : 'Entre com suas credenciais para continuar operando o caixa com seguranca e rapidez.'}
          </p>
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
                {modoCadastro ? 'Criando conta...' : 'Entrando...'}
              </>
            ) : (
              modoCadastro ? 'Criar conta' : 'Entrar'
            )}
          </button>
        </form>

        <div className="login-link-group">
          {onEsqueciSenhaClick ? (
            <button
              type="button"
              className="login-link"
              onClick={onEsqueciSenhaClick}
            >
              Esqueci minha senha
            </button>
          ) : null}

          {onAlternarModo ? (
            <button
              type="button"
              className="login-link login-link--secondary"
              onClick={onAlternarModo}
            >
              {modoCadastro ? 'Ja tem conta? Entrar' : 'Nao tem conta? Criar conta'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default Login
