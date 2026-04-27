import { useEffect, useState } from 'react'
import App from './App'
import { supabase } from './lib/supabase'
import LoginPage from './pages/Login'

const LOGIN_ROUTE = '/login'
const APP_ROUTE = '/app'

function normalizarRota(pathname) {
  if (pathname === APP_ROUTE || pathname.startsWith(`${APP_ROUTE}/`)) {
    return APP_ROUTE
  }

  if (pathname === LOGIN_ROUTE || pathname.startsWith(`${LOGIN_ROUTE}/`)) {
    return LOGIN_ROUTE
  }

  return pathname || '/'
}

function AuthLoadingScreen() {
  return (
    <section className="login-screen">
      <div className="login-card login-card--loading">
        <div className="login-copy">
          <span className="section-label login-label">Autenticacao</span>
          <h1>Carregando VendaFácil PDV</h1>
          <p>Validando sua sessao para liberar o acesso ao painel.</p>
        </div>

        <div className="login-note" role="status">
          <span className="button-spinner" aria-hidden="true" />
          <span>Conferindo autenticacao...</span>
        </div>
      </div>
    </section>
  )
}

function Root() {
  const [sessao, setSessao] = useState(null)
  const [authCarregando, setAuthCarregando] = useState(true)
  const [rotaAtual, setRotaAtual] = useState(() =>
    normalizarRota(window.location.pathname),
  )

  function navegarPara(rota, { replace = false } = {}) {
    if (window.location.pathname !== rota) {
      const metodoHistorico = replace ? 'replaceState' : 'pushState'
      window.history[metodoHistorico]({}, '', rota)
    }

    setRotaAtual(rota)
  }

  useEffect(() => {
    function sincronizarRota() {
      setRotaAtual(normalizarRota(window.location.pathname))
    }

    window.addEventListener('popstate', sincronizarRota)

    return () => {
      window.removeEventListener('popstate', sincronizarRota)
    }
  }, [])

  useEffect(() => {
    let ativo = true

    async function carregarSessao() {
      try {
        if (!supabase) {
          if (ativo) {
            setSessao(null)
          }
          return
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (!ativo) {
          return
        }

        setSessao(session ?? null)
      } catch (error) {
        console.error('Erro ao carregar sessao do usuario', error)

        if (ativo) {
          setSessao(null)
        }
      } finally {
        if (ativo) {
          setAuthCarregando(false)
        }
      }
    }

    carregarSessao()

    if (!supabase) {
      return () => {
        ativo = false
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session ?? null)
    })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (authCarregando) {
      return
    }

    if (sessao?.user) {
      if (rotaAtual !== APP_ROUTE) {
        navegarPara(APP_ROUTE, { replace: true })
      }

      return
    }

    if (rotaAtual !== LOGIN_ROUTE) {
      navegarPara(LOGIN_ROUTE, { replace: true })
    }
  }, [authCarregando, rotaAtual, sessao])

  if (authCarregando) {
    return <AuthLoadingScreen />
  }

  if (!sessao?.user) {
    return (
      <LoginPage
        onAuthenticated={() => {
          navegarPara(APP_ROUTE, { replace: true })
        }}
      />
    )
  }

  return <App initialScreen="dashboard" />
}

export default Root
