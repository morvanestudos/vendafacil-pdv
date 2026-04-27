import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import formatCurrency from '../utils/formatCurrency'

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const formasPagamento = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
}

function formatarData(data) {
  if (!data) {
    return 'Data indisponivel'
  }

  const dataVenda = new Date(data)

  if (Number.isNaN(dataVenda.getTime())) {
    return 'Data indisponivel'
  }

  return dateTimeFormatter.format(dataVenda)
}

function formatarFormaPagamento(formaPagamento) {
  if (!formaPagamento) {
    return 'Forma nao informada'
  }

  return (
    formasPagamento[formaPagamento] ??
    formaPagamento.charAt(0).toUpperCase() + formaPagamento.slice(1)
  )
}

function HistoricoVendas() {
  const [vendas, setVendas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [vendaExpandidaId, setVendaExpandidaId] = useState(null)

  useEffect(() => {
    let ativo = true

    async function carregarHistorico() {
      setCarregando(true)
      setErro('')

      try {
        if (!supabase) {
          throw new Error(
            'Cliente Supabase nao inicializado. Confira o arquivo .env na raiz do projeto.',
          )
        }

        const { data: vendasData, error: vendasError } = await supabase
          .from('vendas')
          .select('*')
          .order('created_at', { ascending: false })

        if (vendasError) {
          throw vendasError
        }

        const vendasComItens = await Promise.all(
          (vendasData ?? []).map(async (venda) => {
            const { data: itensData, error: itensError } = await supabase
              .from('itens_venda')
              .select('*')
              .eq('venda_id', venda.id)

            if (itensError) {
              throw itensError
            }

            return {
              ...venda,
              itens: itensData ?? [],
            }
          }),
        )

        if (!ativo) {
          return
        }

        setVendas(vendasComItens)
      } catch (error) {
        console.error('Erro ao carregar historico de vendas', error)

        if (!ativo) {
          return
        }

        setErro(error.message || 'Nao foi possivel carregar o historico de vendas.')
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    carregarHistorico()

    return () => {
      ativo = false
    }
  }, [])

  function alternarVendaExpandida(vendaId) {
    setVendaExpandidaId((vendaAtual) => (vendaAtual === vendaId ? null : vendaId))
  }

  if (carregando) {
    return (
      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <span className="section-label">Historico</span>
            <h2>Historico de vendas</h2>
            <p className="section-copy">
              Carregando as vendas registradas no Supabase.
            </p>
          </div>
        </div>

        <div className="history-state">
          <strong>Carregando historico...</strong>
          <p>Buscando as vendas mais recentes e seus respectivos itens.</p>
        </div>
      </section>
    )
  }

  if (erro) {
    return (
      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <span className="section-label">Historico</span>
            <h2>Historico de vendas</h2>
            <p className="section-copy">
              Nao foi possivel montar a listagem das vendas.
            </p>
          </div>
        </div>

        <div className="history-state history-state--error" role="alert">
          <strong>Erro ao carregar o historico</strong>
          <p>{erro}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel history-panel">
      <div className="panel-heading">
        <div>
          <span className="section-label">Historico</span>
          <h2>Historico de vendas</h2>
          <p className="section-copy">
            Consulte vendas recentes e abra cada registro para ver os itens.
          </p>
        </div>

        <span className="pill">{vendas.length} vendas</span>
      </div>

      {vendas.length ? (
        <div className="history-list">
          {vendas.map((venda) => {
            const vendaEstaExpandida = vendaExpandidaId === venda.id

            return (
              <article
                key={venda.id}
                className={`history-card${vendaEstaExpandida ? ' is-open' : ''}`}
              >
                <button
                  type="button"
                  className="history-card__summary"
                  onClick={() => alternarVendaExpandida(venda.id)}
                >
                  <div className="history-card__copy">
                    <span className="history-card__tag">
                      Venda {String(venda.id).slice(0, 8)}
                    </span>

                    <strong>{formatCurrency(Number(venda.total) || 0)}</strong>

                    <div className="history-card__meta">
                      <span>{formatarFormaPagamento(venda.forma_pagamento)}</span>
                      <span>{formatarData(venda.created_at)}</span>
                    </div>
                  </div>

                  <span className="history-card__toggle">
                    {vendaEstaExpandida ? 'Ocultar itens' : 'Ver itens'}
                  </span>
                </button>

                {vendaEstaExpandida ? (
                  <div className="history-card__details">
                    <h3>Itens da venda</h3>

                    {venda.itens.length ? (
                      <div className="history-items">
                        {venda.itens.map((item) => (
                          <div
                            key={`${venda.id}-${item.id ?? item.produto_nome}`}
                            className="history-item"
                          >
                            <div className="history-item__copy">
                              <strong>{item.produto_nome}</strong>
                              <span>
                                {item.quantidade} x{' '}
                                {formatCurrency(Number(item.preco) || 0)}
                              </span>
                            </div>

                            <strong>
                              {formatCurrency(
                                (Number(item.preco) || 0) *
                                  (Number(item.quantidade) || 0),
                              )}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state history-empty">
                        <h3>Sem itens vinculados</h3>
                        <p>Essa venda foi encontrada, mas nao retornou itens.</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-state history-empty">
          <h3>Nenhuma venda ainda</h3>
          <p>Finalize uma venda no PDV para ela aparecer aqui.</p>
        </div>
      )}
    </section>
  )
}

export default HistoricoVendas
