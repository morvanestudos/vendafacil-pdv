import { useEffect, useState } from 'react'
import LoginForm from '../components/Login'
import { supabase } from '../lib/supabase'

function LoginPage({ onAuthenticated }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [modoCadastro, setModoCadastro] = useState(false)

  useEffect(() => {
    document.title = modoCadastro
      ? 'Criar Conta | VendaFácil PDV'
      : 'Login | VendaFácil PDV'
  }, [modoCadastro])

  function limparFeedback() {
    setErro('')
    setMensagem('')
  }

  function alternarModo() {
    limparFeedback()
    setModoCadastro((modoAtual) => !modoAtual)
    setSenha('')
  }

  async function handleSubmit() {
    limparFeedback()

    const emailNormalizado = email.trim()
    const senhaNormalizada = senha.trim()

    if (!emailNormalizado || !senhaNormalizada) {
      setErro(
        modoCadastro
          ? 'Preencha e-mail e senha para criar sua conta.'
          : 'Preencha e-mail e senha para entrar.',
      )
      return
    }

    try {
      if (!supabase) {
        throw new Error(
          'Cliente Supabase nao inicializado. Confira o arquivo .env na raiz do projeto.',
        )
      }

      setCarregando(true)

      if (modoCadastro) {
        const { data, error } = await supabase.auth.signUp({
          email: emailNormalizado,
          password: senhaNormalizada,
        })

        if (error) {
          throw error
        }

        if (data.session) {
          onAuthenticated?.(data.session)
          return
        }

        setMensagem(
          'Conta criada com sucesso. Verifique seu e-mail para concluir o acesso.',
        )
        setModoCadastro(false)
        setSenha('')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailNormalizado,
        password: senhaNormalizada,
      })

      if (error || !data.session) {
        throw error ?? new Error('Sessao nao retornada pelo Supabase Auth.')
      }

      onAuthenticated?.(data.session)
    } catch (error) {
      console.error('Erro ao autenticar usuario', error)
      setErro(
        modoCadastro
          ? error.message || 'Nao foi possivel criar sua conta.'
          : 'Email ou senha invalidos',
      )
    } finally {
      setCarregando(false)
    }
  }

  function handleEsqueciSenhaClick() {
    limparFeedback()
    setMensagem(
      'A recuperacao de senha ainda nao foi configurada. Entre em contato com o administrador.',
    )
  }

  return (
    <LoginForm
      email={email}
      senha={senha}
      erro={erro}
      mensagem={mensagem}
      carregando={carregando}
      modoCadastro={modoCadastro}
      onEmailChange={(valor) => {
        if (erro || mensagem) {
          limparFeedback()
        }

        setEmail(valor)
      }}
      onSenhaChange={(valor) => {
        if (erro || mensagem) {
          limparFeedback()
        }

        setSenha(valor)
      }}
      onSubmit={handleSubmit}
      onEsqueciSenhaClick={handleEsqueciSenhaClick}
      onAlternarModo={alternarModo}
    />
  )
}

export default LoginPage
