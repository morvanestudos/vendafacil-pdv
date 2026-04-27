import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../lib/supabase'
import formatCurrency from '../utils/formatCurrency'

const compactNumberFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
})

const nomesDiasSemana = [
  'Domingo',
  'Segunda',
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado',
]

function criarChaveData(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function criarResumoVazio() {
  return {
    totalHoje: 0,
    quantidadeVendasHoje: 0,
    totalProdutos: 0,
    quantidadeEstoqueBaixo: 0,
    topProdutos: [],
    vendasPorDia: [],
    estoqueCritico: [],
  }
}

function obterPeriodoDashboard() {
  const agora = new Date()
  const inicioHoje = new Date(agora)
  const inicioAmanha = new Date(agora)
  const inicioPeriodo = new Date(agora)

  inicioHoje.setHours(0, 0, 0, 0)
  inicioAmanha.setHours(24, 0, 0, 0)
  inicioPeriodo.setHours(0, 0, 0, 0)
  inicioPeriodo.setDate(inicioPeriodo.getDate() - 6)

  return {
    inicioHoje,
    inicioAmanha,
    inicioPeriodo,
  }
}

function montarDiasBase(inicioPeriodo) {
  return Array.from({ length: 7 }, (_, indice) => {
    const data = new Date(inicioPeriodo)
    data.setDate(inicioPeriodo.getDate() + indice)

    return {
      chave: criarChaveData(data),
      data,
      dia: nomesDiasSemana[data.getDay()],
      total: 0,
      quantidade: 0,
    }
  })
}

function obterNomeProdutoItem(item, produtosPorId) {
  if (item?.produto_nome) {
    return item.produto_nome
  }

  if (item?.produto_id !== null && item?.produto_id !== undefined) {
    return produtosPorId.get(String(item.produto_id)) ?? `Produto ${item.produto_id}`
  }

  return 'Produto sem identificacao'
}

function agruparTopProdutos(itensVenda, produtosPorId) {
  const acumuladoPorProduto = new Map()

  for (const item of itensVenda ?? []) {
    const quantidade = Number(item?.quantidade) || 0
    const preco = Number(item?.preco) || 0
    const chaveProduto =
      item?.produto_id !== null && item?.produto_id !== undefined
        ? `id:${item.produto_id}`
        : `nome:${item?.produto_nome ?? 'sem-identificacao'}`

    if (!quantidade) {
      continue
    }

    const nome = obterNomeProdutoItem(item, produtosPorId)
    const acumuladoAtual = acumuladoPorProduto.get(chaveProduto) ?? {
      chave: chaveProduto,
      nome,
      quantidade: 0,
      faturamento: 0,
    }

    acumuladoAtual.quantidade += quantidade
    acumuladoAtual.faturamento += preco * quantidade

    acumuladoPorProduto.set(chaveProduto, acumuladoAtual)
  }

  return Array.from(acumuladoPorProduto.values())
    .sort((produtoA, produtoB) => {
      if (produtoB.quantidade !== produtoA.quantidade) {
        return produtoB.quantidade - produtoA.quantidade
      }

      return produtoB.faturamento - produtoA.faturamento
    })
    .slice(0, 5)
}

function formatarValorCompacto(valor) {
  if (!valor) {
    return 'R$ 0'
  }

  return `R$ ${compactNumberFormatter.format(valor)}`
}

function Dashboard({ refreshKey = 0 }) {
  const [resumo, setResumo] = useState(criarResumoVazio)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    async function carregarDashboard() {
      setCarregando(true)
      setErro('')

      try {
        if (!supabase) {
          throw new Error(
            'Cliente Supabase nao inicializado. Confira o arquivo .env na raiz do projeto.',
          )
        }

        const { inicioHoje, inicioAmanha, inicioPeriodo } = obterPeriodoDashboard()

        const [vendasResultado, produtosResultado, itensResultado] = await Promise.all([
          supabase
            .from('vendas')
            .select('total, created_at')
            .gte('created_at', inicioPeriodo.toISOString())
            .lt('created_at', inicioAmanha.toISOString())
            .order('created_at', { ascending: true }),
          supabase
            .from('produtos')
            .select('id, nome, estoque')
            .order('nome', { ascending: true }),
          supabase.from('itens_venda').select('*'),
        ])

        if (vendasResultado.error) {
          throw vendasResultado.error
        }

        if (produtosResultado.error) {
          throw produtosResultado.error
        }

        if (itensResultado.error) {
          throw itensResultado.error
        }

        const produtos = produtosResultado.data ?? []
        const produtosPorId = new Map(
          produtos.map((produto) => [String(produto.id), produto.nome]),
        )
        const diasBase = montarDiasBase(inicioPeriodo)
        const diasPorChave = new Map(
          diasBase.map((diaResumo) => [diaResumo.chave, diaResumo]),
        )

        let totalHoje = 0
        let quantidadeVendasHoje = 0

        for (const venda of vendasResultado.data ?? []) {
          const dataVenda = new Date(venda.created_at)
          const totalVenda = Number(venda.total) || 0
          const chaveDia = criarChaveData(dataVenda)
          const diaResumo = diasPorChave.get(chaveDia)

          if (diaResumo) {
            diaResumo.total += totalVenda
            diaResumo.quantidade += 1
          }

          if (dataVenda >= inicioHoje && dataVenda < inicioAmanha) {
            totalHoje += totalVenda
            quantidadeVendasHoje += 1
          }
        }

        const estoqueCritico = produtos
          .filter((produto) => typeof produto.estoque === 'number' && produto.estoque <= 5)
          .sort((produtoA, produtoB) => {
            if (produtoA.estoque !== produtoB.estoque) {
              return produtoA.estoque - produtoB.estoque
            }

            return produtoA.nome.localeCompare(produtoB.nome, 'pt-BR')
          })

        const topProdutos = agruparTopProdutos(itensResultado.data, produtosPorId)

        if (!ativo) {
          return
        }

        setResumo({
          totalHoje,
          quantidadeVendasHoje,
          totalProdutos: produtos.length,
          quantidadeEstoqueBaixo: estoqueCritico.length,
          topProdutos,
          vendasPorDia: Array.from(diasPorChave.values()),
          estoqueCritico,
        })
      } catch (error) {
        console.error('Erro ao carregar dashboard', error)

        if (!ativo) {
          return
        }

        setErro(error.message || 'Nao foi possivel carregar o dashboard.')
        setResumo(criarResumoVazio())
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    carregarDashboard()

    return () => {
      ativo = false
    }
  }, [refreshKey])

  if (carregando) {
    return (
      <section className="panel dashboard-panel">
        <div className="panel-heading">
          <div>
            <span className="section-label">Dashboard</span>
            <h2>Visao geral do negocio</h2>
            <p className="section-copy">
              Carregando vendas, produtos e indicadores em tempo real.
            </p>
          </div>
        </div>

        <div className="history-state">
          <strong>Carregando dashboard...</strong>
          <p>Buscando metricas, grafico, produtos em destaque e estoque critico.</p>
        </div>
      </section>
    )
  }

  if (erro) {
    return (
      <section className="panel dashboard-panel">
        <div className="panel-heading">
          <div>
            <span className="section-label">Dashboard</span>
            <h2>Visao geral do negocio</h2>
            <p className="section-copy">
              Nao foi possivel montar a leitura executiva do PDV.
            </p>
          </div>
        </div>

        <div className="history-state history-state--error" role="alert">
          <strong>Erro ao carregar o dashboard</strong>
          <p>{erro}</p>
        </div>
      </section>
    )
  }

  const dadosGrafico = resumo.vendasPorDia.map((dia) => ({
    chave: dia.chave,
    dia: shortDateFormatter.format(dia.data),
    total: Number(dia.total.toFixed(2)),
    quantidade: dia.quantidade,
  }))

  return (
    <section className="panel dashboard-panel">
      <div className="panel-heading">
        <div>
          <span className="section-label">Dashboard</span>
          <h2>Visao geral do negocio</h2>
          <p className="section-copy">
            Panorama com faturamento, catalogo, giro de produtos e estoque critico.
          </p>
        </div>

        <span className="pill">{resumo.vendasPorDia.length} dias monitorados</span>
      </div>

      <div className="dashboard-metrics-grid">
        <article className="dashboard-metric-card dashboard-metric-card--primary">
          <div className="dashboard-metric-card__label">
            <span className="dashboard-metric-card__icon" aria-hidden="true">
              💰
            </span>
            <span>Total hoje</span>
          </div>

          <strong>{formatCurrency(resumo.totalHoje)}</strong>
          <p>Faturamento registrado nas vendas concluidas desde 00:00.</p>
        </article>

        <article className="dashboard-metric-card dashboard-metric-card--info">
          <div className="dashboard-metric-card__label">
            <span className="dashboard-metric-card__icon" aria-hidden="true">
              🧾
            </span>
            <span>Vendas hoje</span>
          </div>

          <strong>{resumo.quantidadeVendasHoje}</strong>
          <p>Quantidade total de atendimentos finalizados hoje.</p>
        </article>

        <article className="dashboard-metric-card dashboard-metric-card--neutral">
          <div className="dashboard-metric-card__label">
            <span className="dashboard-metric-card__icon" aria-hidden="true">
              📦
            </span>
            <span>Produtos</span>
          </div>

          <strong>{resumo.totalProdutos}</strong>
          <p>Total de itens cadastrados no catalogo conectado ao Supabase.</p>
        </article>

        <article className="dashboard-metric-card dashboard-metric-card--warning">
          <div className="dashboard-metric-card__label">
            <span className="dashboard-metric-card__icon" aria-hidden="true">
              ⚠️
            </span>
            <span>Estoque baixo</span>
          </div>

          <strong>{resumo.quantidadeEstoqueBaixo}</strong>
          <p>Produtos com saldo igual ou inferior a 5 unidades.</p>
        </article>
      </div>

      <div className="dashboard-analytics-grid">
        <article className="dashboard-card dashboard-card--chart">
          <div className="dashboard-card__header">
            <div>
              <span className="dashboard-card__eyebrow">Grafico</span>
              <h3>Vendas dos ultimos 7 dias</h3>
            </div>

            <p>Leitura diaria do faturamento para acompanhar ritmo e tendencia.</p>
          </div>

          <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={dadosGrafico}
                margin={{
                  top: 10,
                  right: 12,
                  left: -18,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.14)"
                />
                <XAxis
                  dataKey="dia"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={formatarValorCompacto}
                  tickLine={false}
                  axisLine={false}
                  width={62}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value) || 0)}
                  labelFormatter={(label, payload) => {
                    const dado = payload?.[0]?.payload

                    if (!dado?.chave) {
                      return label
                    }

                    return `${label} - ${dado.quantidade} venda(s)`
                  }}
                  cursor={{ stroke: 'rgba(96, 165, 250, 0.24)', strokeWidth: 1.5 }}
                  contentStyle={{
                    borderRadius: '18px',
                    border: '1px solid rgba(148, 163, 184, 0.14)',
                    background: 'rgba(15, 23, 42, 0.96)',
                    boxShadow: '0 18px 38px rgba(2, 6, 23, 0.34)',
                  }}
                  labelStyle={{
                    color: '#e2e8f0',
                    fontWeight: 700,
                  }}
                  itemStyle={{
                    color: '#bfdbfe',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    strokeWidth: 2,
                    fill: '#0f172a',
                    stroke: '#60a5fa',
                  }}
                  activeDot={{
                    r: 6,
                    fill: '#93c5fd',
                    stroke: '#0f172a',
                    strokeWidth: 3,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <span className="dashboard-card__eyebrow">Ranking</span>
              <h3>Top 5 produtos</h3>
            </div>

            <p>Itens com maior volume vendido a partir da base de itens da venda.</p>
          </div>

          {resumo.topProdutos.length ? (
            <div className="dashboard-top-list">
              {resumo.topProdutos.map((produtoTop, indice) => (
                <article key={produtoTop.chave} className="dashboard-top-item">
                  <div className="dashboard-top-item__copy">
                    <span className="dashboard-top-item__rank">#{indice + 1}</span>

                    <div>
                      <strong>{produtoTop.nome}</strong>
                      <p>{produtoTop.quantidade} unidade(s) vendidas</p>
                    </div>
                  </div>

                  <strong className="dashboard-top-item__value">
                    {formatCurrency(produtoTop.faturamento)}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Nenhum item vendido ainda</h3>
              <p>Os produtos mais vendidos aparecerao aqui quando houver historico.</p>
            </div>
          )}
        </article>
      </div>

      <article className="dashboard-card">
        <div className="dashboard-card__header">
          <div>
            <span className="dashboard-card__eyebrow">Estoque</span>
            <h3>Produtos com estoque critico</h3>
          </div>

          <p>Lista de itens com saldo baixo para facilitar reposicao e priorizacao.</p>
        </div>

        {resumo.estoqueCritico.length ? (
          <div className="dashboard-stock-list">
            {resumo.estoqueCritico.map((produtoEstoque) => (
              <article key={produtoEstoque.id} className="dashboard-stock-item">
                <div className="dashboard-stock-item__copy">
                  <strong>{produtoEstoque.nome}</strong>
                  <span>
                    {produtoEstoque.estoque === 0
                      ? 'Reposicao imediata recomendada'
                      : 'Acompanhar reposicao do catalogo'}
                  </span>
                </div>

                <span
                  className={`dashboard-stock-badge${
                    produtoEstoque.estoque === 0
                      ? ' dashboard-stock-badge--critical'
                      : ''
                  }`}
                >
                  {produtoEstoque.estoque} un.
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Nenhum produto com estoque baixo</h3>
            <p>O catalogo atual esta com todos os itens acima do limite critico.</p>
          </div>
        )}
      </article>
    </section>
  )
}

export default Dashboard
