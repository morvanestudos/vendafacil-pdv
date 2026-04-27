import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../lib/supabase'
import formatCurrency from '../utils/formatCurrency'

const nomesDiasSemana = [
  'Domingo',
  'Segunda',
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado',
]

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
})
const compactNumberFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function criarChaveData(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function obterPeriodoSemanal() {
  const hoje = new Date()
  const inicioPeriodo = new Date(hoje)

  inicioPeriodo.setHours(0, 0, 0, 0)
  inicioPeriodo.setDate(inicioPeriodo.getDate() - 6)

  return {
    inicioPeriodo,
    fimPeriodo: hoje,
  }
}

function montarResumoInicial(inicioPeriodo) {
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

function formatarMelhorDia(melhorDia) {
  if (!melhorDia || melhorDia.total <= 0) {
    return 'Sem vendas'
  }

  return `${melhorDia.dia} - ${formatCurrency(melhorDia.total)}`
}

function formatarValorCompacto(valor) {
  if (!valor) {
    return 'R$ 0'
  }

  return `R$ ${compactNumberFormatter.format(valor)}`
}

function RelatorioSemanal() {
  const [resumo, setResumo] = useState({
    totalSemana: 0,
    mediaPorDia: 0,
    melhorDia: null,
    dias: [],
  })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    async function carregarRelatorioSemanal() {
      setCarregando(true)
      setErro('')

      try {
        if (!supabase) {
          throw new Error(
            'Cliente Supabase nao inicializado. Confira o arquivo .env na raiz do projeto.',
          )
        }

        const { inicioPeriodo, fimPeriodo } = obterPeriodoSemanal()

        const { data: vendasData, error: vendasError } = await supabase
          .from('vendas')
          .select('total, created_at')
          .gte('created_at', inicioPeriodo.toISOString())
          .lte('created_at', fimPeriodo.toISOString())
          .order('created_at', { ascending: true })

        if (vendasError) {
          throw vendasError
        }

        const diasBase = montarResumoInicial(inicioPeriodo)
        const diasPorChave = new Map(
          diasBase.map((diaResumo) => [diaResumo.chave, diaResumo]),
        )

        for (const venda of vendasData ?? []) {
          const dataVenda = new Date(venda.created_at)
          const chaveDia = criarChaveData(dataVenda)
          const diaResumo = diasPorChave.get(chaveDia)

          if (!diaResumo) {
            continue
          }

          diaResumo.total += Number(venda.total) || 0
          diaResumo.quantidade += 1
        }

        const dias = Array.from(diasPorChave.values())
        const totalSemana = dias.reduce((acumulador, dia) => acumulador + dia.total, 0)
        const melhorDia = dias.reduce((maiorDia, diaAtual) => {
          if (!maiorDia || diaAtual.total > maiorDia.total) {
            return diaAtual
          }

          return maiorDia
        }, null)

        if (!ativo) {
          return
        }

        setResumo({
          totalSemana,
          mediaPorDia: totalSemana / 7,
          melhorDia,
          dias,
        })
      } catch (error) {
        console.error('Erro ao carregar relatorio semanal', error)

        if (!ativo) {
          return
        }

        setErro(error.message || 'Nao foi possivel carregar o relatorio semanal.')
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    carregarRelatorioSemanal()

    return () => {
      ativo = false
    }
  }, [])

  if (carregando) {
    return (
      <section className="panel weekly-report-panel">
        <div className="panel-heading">
          <div>
            <span className="section-label">Relatorio</span>
            <h2>Resumo semanal</h2>
            <p className="section-copy">
              Carregando as vendas dos ultimos 7 dias.
            </p>
          </div>
        </div>

        <div className="history-state">
          <strong>Carregando relatorio...</strong>
          <p>Consolidando totais, media diaria e desempenho por dia.</p>
        </div>
      </section>
    )
  }

  if (erro) {
    return (
      <section className="panel weekly-report-panel">
        <div className="panel-heading">
          <div>
            <span className="section-label">Relatorio</span>
            <h2>Resumo semanal</h2>
            <p className="section-copy">
              Nao foi possivel montar o relatorio semanal.
            </p>
          </div>
        </div>

        <div className="history-state history-state--error" role="alert">
          <strong>Erro ao carregar o relatorio</strong>
          <p>{erro}</p>
        </div>
      </section>
    )
  }

  if (!resumo.totalSemana) {
    return (
      <section className="panel weekly-report-panel">
        <div className="panel-heading">
          <div>
            <span className="section-label">Relatorio</span>
            <h2>Resumo semanal</h2>
            <p className="section-copy">
              Visualize os ultimos 7 dias de vendas em um unico painel.
            </p>
          </div>
        </div>

        <div className="empty-state weekly-report-empty">
          <h3>Nenhuma venda na semana</h3>
          <p>As vendas dos ultimos 7 dias aparecerao aqui quando forem registradas.</p>
        </div>
      </section>
    )
  }

  const dadosGrafico = resumo.dias.map((dia) => ({
    dia: dia.dia,
    total: Number(dia.total.toFixed(2)),
  }))

  return (
    <section className="panel weekly-report-panel">
      <div className="panel-heading">
        <div>
          <span className="section-label">Relatorio</span>
          <h2>Resumo semanal</h2>
          <p className="section-copy">
            Panorama dos ultimos 7 dias, incluindo total, media e melhor dia de
            faturamento.
          </p>
        </div>

        <span className="pill">{resumo.dias.length} dias</span>
      </div>

      <div className="weekly-report-grid">
        <article className="weekly-report-card weekly-report-card--total">
          <span className="weekly-report-card__label">Total da semana</span>
          <strong>{formatCurrency(resumo.totalSemana)}</strong>
          <p>Somatorio de todas as vendas registradas no periodo.</p>
        </article>

        <article className="weekly-report-card weekly-report-card--average">
          <span className="weekly-report-card__label">Media por dia</span>
          <strong>{formatCurrency(resumo.mediaPorDia)}</strong>
          <p>Media considerando os 7 dias do relatorio.</p>
        </article>

        <article className="weekly-report-card weekly-report-card--best">
          <span className="weekly-report-card__label">Melhor dia</span>
          <strong>{formatarMelhorDia(resumo.melhorDia)}</strong>
          <p>Dia com maior total de vendas dentro da semana.</p>
        </article>
      </div>

      <article className="weekly-report-chart-card">
        <div className="weekly-report-chart-card__header">
          <div>
            <span className="weekly-report-chart-card__label">Grafico</span>
            <h3>Vendas por dia</h3>
          </div>

          <p>Comparativo visual do valor vendido em cada dia da semana.</p>
        </div>

        <div className="weekly-report-chart">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={dadosGrafico}
              margin={{
                top: 8,
                right: 8,
                left: -18,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(22, 50, 59, 0.09)" />
              <XAxis
                dataKey="dia"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#5f737b', fontSize: 12 }}
              />
              <YAxis
                tickFormatter={formatarValorCompacto}
                tickLine={false}
                axisLine={false}
                width={58}
                tick={{ fill: '#5f737b', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(21, 127, 103, 0.08)' }}
                formatter={(value) => formatCurrency(Number(value) || 0)}
                contentStyle={{
                  borderRadius: '16px',
                  border: '1px solid rgba(22, 50, 59, 0.08)',
                  boxShadow: '0 16px 32px rgba(16, 31, 35, 0.12)',
                }}
                labelStyle={{
                  color: '#16323b',
                  fontWeight: 700,
                }}
              />
              <Bar
                dataKey="total"
                radius={[12, 12, 6, 6]}
                fill="url(#weeklySalesGradient)"
                maxBarSize={52}
              />
              <defs>
                <linearGradient id="weeklySalesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1aa57f" />
                  <stop offset="100%" stopColor="#0f6a56" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <div className="weekly-report-list">
        {resumo.dias.map((dia) => (
          <article key={dia.chave} className="weekly-report-day">
            <div className="weekly-report-day__copy">
              <strong>{dia.dia}</strong>
              <span>{shortDateFormatter.format(dia.data)}</span>
            </div>

            <div className="weekly-report-day__meta">
              <strong>{formatCurrency(dia.total)}</strong>
              <span>{dia.quantidade} venda(s)</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default RelatorioSemanal
