import { useEffect, useState } from 'react'
import { getUser, supabase } from '../lib/supabase'
import formatCurrency from '../utils/formatCurrency'

const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'full',
})

function obterIntervaloDoDiaAtual() {
  const agora = new Date()
  const inicioDoDia = new Date(agora)
  const inicioDoProximoDia = new Date(agora)

  inicioDoDia.setHours(0, 0, 0, 0)
  inicioDoProximoDia.setHours(24, 0, 0, 0)

  return {
    inicioDoDia,
    inicioDoProximoDia,
  }
}

function Caixa() {
  const [resumo, setResumo] = useState({
    totalDia: 0,
    totalDinheiro: 0,
    totalPix: 0,
    quantidadeVendas: 0,
  })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    async function carregarCaixaDoDia() {
      setCarregando(true)
      setErro('')

      try {
        if (!supabase) {
          throw new Error(
            'Cliente Supabase nao inicializado. Confira o arquivo .env na raiz do projeto.',
          )
        }

        const user = await getUser()

        if (!user?.id) {
          throw new Error('Usuario nao autenticado. Faca login novamente.')
        }

        const { inicioDoDia, inicioDoProximoDia } = obterIntervaloDoDiaAtual()

        const { data: vendasData, error: vendasError } = await supabase
          .from('vendas')
          .select('total, forma_pagamento, created_at')
          .eq('user_id', user.id)
          .gte('created_at', inicioDoDia.toISOString())
          .lt('created_at', inicioDoProximoDia.toISOString())
          .order('created_at', { ascending: false })

        if (vendasError) {
          throw vendasError
        }

        const resumoCalculado = (vendasData ?? []).reduce(
          (acumulador, venda) => {
            const totalVenda = Number(venda.total) || 0
            const formaPagamento = venda.forma_pagamento?.toLowerCase()

            acumulador.totalDia += totalVenda
            acumulador.quantidadeVendas += 1

            if (formaPagamento === 'dinheiro') {
              acumulador.totalDinheiro += totalVenda
            }

            if (formaPagamento === 'pix') {
              acumulador.totalPix += totalVenda
            }

            return acumulador
          },
          {
            totalDia: 0,
            totalDinheiro: 0,
            totalPix: 0,
            quantidadeVendas: 0,
          },
        )

        if (!ativo) {
          return
        }

        setResumo(resumoCalculado)
      } catch (error) {
        console.log('Erro ao carregar caixa do dia', error)
        console.error('Erro ao carregar caixa do dia', error)

        if (!ativo) {
          return
        }

        setErro(error.message || 'Nao foi possivel carregar o caixa do dia.')
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    carregarCaixaDoDia()

    return () => {
      ativo = false
    }
  }, [])

  if (carregando) {
    return (
      <section className="panel cashbox-panel">
        <div className="panel-heading">
          <div>
            <span className="section-label">Caixa</span>
            <h2>Caixa do dia</h2>
            <p className="section-copy">
              Carregando o resumo financeiro das vendas de hoje.
            </p>
          </div>
        </div>

        <div className="history-state">
          <strong>Carregando caixa do dia...</strong>
          <p>Buscando as vendas registradas desde 00:00.</p>
        </div>
      </section>
    )
  }

  if (erro) {
    return (
      <section className="panel cashbox-panel">
        <div className="panel-heading">
          <div>
            <span className="section-label">Caixa</span>
            <h2>Caixa do dia</h2>
            <p className="section-copy">
              Nao foi possivel montar o resumo do dia.
            </p>
          </div>
        </div>

        <div className="history-state history-state--error" role="alert">
          <strong>Erro ao carregar o caixa</strong>
          <p>{erro}</p>
        </div>
      </section>
    )
  }

  if (!resumo.quantidadeVendas) {
    return (
      <section className="panel cashbox-panel">
        <div className="panel-heading">
          <div>
            <span className="section-label">Caixa</span>
            <h2>Caixa do dia</h2>
            <p className="section-copy">
              Acompanhe o total vendido e a distribuicao por pagamento.
            </p>
          </div>
        </div>

        <div className="empty-state cashbox-empty">
          <h3>Nenhuma venda hoje</h3>
          <p>As vendas do dia aparecerao aqui assim que forem registradas.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel cashbox-panel">
      <div className="panel-heading">
        <div>
          <span className="section-label">Caixa</span>
          <h2>Caixa do dia</h2>
          <p className="section-copy">
            Resumo atualizado das vendas registradas em{' '}
            {fullDateFormatter.format(new Date())}.
          </p>
        </div>

        <span className="pill">{resumo.quantidadeVendas} vendas</span>
      </div>

      <div className="cashbox-grid">
        <article className="cashbox-card cashbox-card--total">
          <span className="cashbox-card__label">Total do dia</span>
          <strong>{formatCurrency(resumo.totalDia)}</strong>
          <p>Somatorio de todas as vendas registradas hoje.</p>
        </article>

        <article className="cashbox-card cashbox-card--dinheiro">
          <span className="cashbox-card__label">Dinheiro</span>
          <strong>{formatCurrency(resumo.totalDinheiro)}</strong>
          <p>Total recebido em pagamentos no caixa fisico.</p>
        </article>

        <article className="cashbox-card cashbox-card--pix">
          <span className="cashbox-card__label">Pix</span>
          <strong>{formatCurrency(resumo.totalPix)}</strong>
          <p>Total recebido por transferencias instantaneas.</p>
        </article>

        <article className="cashbox-card cashbox-card--quantidade">
          <span className="cashbox-card__label">Quantidade de vendas</span>
          <strong>{resumo.quantidadeVendas}</strong>
          <p>Numero total de atendimentos concluidos no dia.</p>
        </article>
      </div>
    </section>
  )
}

export default Caixa
