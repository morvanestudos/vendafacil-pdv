import { useEffect, useState } from 'react'
import Caixa from './components/Caixa'
import Carrinho from './components/Carrinho'
import Dashboard from './components/Dashboard'
import FinalizarVenda from './components/FinalizarVenda'
import HistoricoVendas from './components/HistoricoVendas'
import Logo from './components/Logo'
import Produtos from './components/Produtos'
import RelatorioSemanal from './components/RelatorioSemanal'
import produtosMock from './data/produtosMock'
import {
  atualizarEstoqueProduto as atualizarEstoqueProdutoBanco,
  cadastrarProduto,
  carregarProdutos,
  removerProduto,
  salvarVenda,
} from './lib/supabase'
import formatCurrency from './utils/formatCurrency'

function App({ initialScreen = 'pdv', onLogout }) {
  const [produto, setProduto] = useState('')
  const [preco, setPreco] = useState('')
  const [produtos, setProdutos] = useState([])
  const [carrinho, setCarrinho] = useState([])
  const [mostrarPagamento, setMostrarPagamento] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState('')
  const [mensagemVenda, setMensagemVenda] = useState('')
  const [tipoMensagemVenda, setTipoMensagemVenda] = useState('')
  const [salvandoVenda, setSalvandoVenda] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [dashboardRefreshToken, setDashboardRefreshToken] = useState(0)
  const [telaAtiva, setTelaAtiva] = useState(initialScreen)

  useEffect(() => {
    document.title = 'VendaFácil PDV'
  }, [])

  useEffect(() => {
    let ativo = true

    async function carregarCatalogo() {
      const resultado = await carregarProdutos()

      if (!ativo) {
        return
      }

      if (!resultado.success) {
        setProdutos(produtosMock)
        return
      }

      setProdutos(resultado.produtos)
    }

    carregarCatalogo()

    return () => {
      ativo = false
    }
  }, [])

  function mostrarErroVenda(mensagem) {
    setTipoMensagemVenda('erro')
    setMensagemVenda(mensagem)
  }

  function obterProdutoCatalogo(produtoId) {
    return produtos.find((item) => item.id === produtoId)
  }

  function produtoCatalogoFoiRemovido(itemCarrinho) {
    return itemCarrinho?.origem === 'catalogo' && !obterProdutoCatalogo(itemCarrinho.id)
  }

  function obterEstoqueLimite(produtoId) {
    const produtoCatalogo = obterProdutoCatalogo(produtoId)

    return typeof produtoCatalogo?.estoque === 'number'
      ? produtoCatalogo.estoque
      : null
  }

  function obterQuantidadeReservadaNoCarrinho(produtoId) {
    return (
      carrinho.find(
        (item) => item.id === produtoId && item.origem === 'catalogo',
      )?.quantidade ?? 0
    )
  }

  function ajustarEstoqueProdutoDisponivel(produtoId, variacao) {
    setProdutos((produtosAtuais) =>
      produtosAtuais.map((produtoAtual) => {
        if (
          produtoAtual.id !== produtoId ||
          typeof produtoAtual.estoque !== 'number'
        ) {
          return produtoAtual
        }

        return {
          ...produtoAtual,
          estoque: Math.max(0, produtoAtual.estoque + variacao),
        }
      }),
    )
  }

  function devolverEstoqueItem(itemCarrinho, quantidade) {
    if (itemCarrinho?.origem !== 'catalogo') {
      return
    }

    ajustarEstoqueProdutoDisponivel(itemCarrinho.id, quantidade)
  }

  function validarEstoqueCarrinho(carrinhoAtual) {
    for (const item of carrinhoAtual) {
      const estoqueLimite = obterEstoqueLimite(item.id)

      if (estoqueLimite === null || estoqueLimite >= 0) {
        continue
      }

      return item
    }

    return null
  }

  function resetarFinalizacao() {
    // Se o carrinho muda, a etapa de pagamento volta ao inicio para evitar estado antigo.
    setMostrarPagamento(false)
    setFormaPagamento('')
  }

  function limparFeedbackVenda() {
    setMensagemVenda('')
    setTipoMensagemVenda('')
  }

  function adicionarAoCarrinho(produtoSelecionado) {
    limparFeedbackVenda()
    resetarFinalizacao()

    const estoqueLimite = obterEstoqueLimite(produtoSelecionado.id)

    if (estoqueLimite !== null && estoqueLimite <= 0) {
      mostrarErroVenda(`Sem estoque para ${produtoSelecionado.nome}.`)
      return
    }

    setCarrinho((carrinhoAtual) => {
      // Mantemos um item por produto para o operador controlar a quantidade com rapidez.
      const itemExistente = carrinhoAtual.find(
        (item) => item.id === produtoSelecionado.id,
      )

      if (itemExistente) {
        return carrinhoAtual.map((item) =>
          item.id === produtoSelecionado.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
        )
      }

      return [
        ...carrinhoAtual,
        {
          ...produtoSelecionado,
          origem: produtoSelecionado.origem ?? 'catalogo',
          quantidade: 1,
        },
      ]
    })

    if (estoqueLimite !== null) {
      ajustarEstoqueProdutoDisponivel(produtoSelecionado.id, -1)
    }
  }

  async function cadastrarProdutoCatalogo({
    nome,
    preco: precoProduto,
    estoque,
  }) {
    const resultado = await cadastrarProduto({
      nome,
      preco: precoProduto,
      estoque,
    })

    if (!resultado.success || !resultado.produto) {
      return {
        success: false,
        error:
          resultado.error?.message || 'Nao foi possivel cadastrar o produto no banco.',
      }
    }

    const novoProduto = {
      ...resultado.produto,
      categoria: resultado.produto.categoria ?? 'Cadastro manual',
      descricao:
        resultado.produto.descricao ?? 'Produto adicionado pelo operador.',
    }

    setProdutos((produtosAtuais) => [novoProduto, ...produtosAtuais])
    setDashboardRefreshToken((tokenAtual) => tokenAtual + 1)

    return {
      success: true,
      produto: novoProduto,
    }
  }

  async function editarEstoqueProdutoCatalogo(produtoId, estoqueDisponivel) {
    const estoqueNormalizado = Number(estoqueDisponivel)

    if (!Number.isInteger(estoqueNormalizado) || estoqueNormalizado < 0) {
      return {
        success: false,
        error: 'Informe um estoque valido para o produto.',
      }
    }

    const quantidadeReservada = obterQuantidadeReservadaNoCarrinho(produtoId)
    const resultado = await atualizarEstoqueProdutoBanco(
      produtoId,
      estoqueNormalizado + quantidadeReservada,
    )

    if (!resultado.success || !resultado.produto) {
      return {
        success: false,
        error:
          resultado.error?.message || 'Nao foi possivel atualizar o estoque no banco.',
      }
    }

    setProdutos((produtosAtuais) =>
      produtosAtuais.map((item) => {
        if (item.id !== produtoId) {
          return item
        }

        return {
          ...item,
          ...resultado.produto,
          estoque: estoqueNormalizado,
          categoria: resultado.produto.categoria ?? item.categoria,
          descricao: resultado.produto.descricao ?? item.descricao,
        }
      }),
    )
    setDashboardRefreshToken((tokenAtual) => tokenAtual + 1)

    return {
      success: true,
      produto: {
        ...resultado.produto,
        estoque: estoqueNormalizado,
      },
    }
  }

  async function removerProdutoCatalogo(produtoId) {
    const resultado = await removerProduto(produtoId)

    if (!resultado.success) {
      return
    }

    setProdutos((produtosAtuais) =>
      produtosAtuais.filter((item) => item.id !== produtoId),
    )
    setDashboardRefreshToken((tokenAtual) => tokenAtual + 1)
  }

  function adicionarProdutoAvulso(event) {
    event.preventDefault()

    const nomeProduto = produto.trim()
    const precoNormalizado = Number(preco.replace(',', '.'))

    if (!nomeProduto || Number.isNaN(precoNormalizado) || precoNormalizado <= 0) {
      return
    }

    adicionarAoCarrinho({
      id: `avulso-${nomeProduto.toLowerCase().replace(/\s+/g, '-')}-${precoNormalizado.toFixed(2)}`,
      nome: nomeProduto,
      preco: precoNormalizado,
      origem: 'avulso',
    })

    setProduto('')
    setPreco('')
  }

  function alterarQuantidade(id, variacao) {
    limparFeedbackVenda()
    resetarFinalizacao()

    const itemCarrinho = carrinho.find((item) => item.id === id)

    if (!itemCarrinho) {
      return
    }

    if (variacao > 0 && produtoCatalogoFoiRemovido(itemCarrinho)) {
      mostrarErroVenda(`${itemCarrinho.nome} nao esta mais disponivel no catalogo.`)
      return
    }

    if (variacao > 0) {
      const estoqueLimite = obterEstoqueLimite(id)

      if (estoqueLimite !== null && estoqueLimite <= 0) {
        const produtoCatalogo = obterProdutoCatalogo(id)
        mostrarErroVenda(`Sem estoque para ${produtoCatalogo?.nome ?? 'este item'}.`)
        return
      }

      setCarrinho((carrinhoAtual) =>
        carrinhoAtual.map((item) =>
          item.id === id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
        ),
      )

      if (estoqueLimite !== null) {
        ajustarEstoqueProdutoDisponivel(id, -1)
      }

      return
    }

    setCarrinho((carrinhoAtual) =>
      carrinhoAtual
        .map((item) =>
          item.id === id
            ? { ...item, quantidade: item.quantidade + variacao }
            : item,
        )
        .filter((item) => item.quantidade > 0),
    )
    devolverEstoqueItem(itemCarrinho, Math.abs(variacao))
  }

  function removerItem(id) {
    limparFeedbackVenda()
    resetarFinalizacao()

    const itemCarrinho = carrinho.find((item) => item.id === id)

    if (itemCarrinho) {
      devolverEstoqueItem(itemCarrinho, itemCarrinho.quantidade)
    }

    setCarrinho((carrinhoAtual) => carrinhoAtual.filter((item) => item.id !== id))
  }

  function iniciarFinalizacao() {
    if (!carrinho.length) {
      return
    }

    limparFeedbackVenda()
    setMostrarPagamento(true)
  }

  function selecionarFormaPagamento(novaFormaPagamento) {
    limparFeedbackVenda()
    setFormaPagamento(novaFormaPagamento)
  }

  async function confirmarVenda() {
    if (!carrinho.length || !formaPagamento || salvandoVenda) {
      return
    }

    const itemSemEstoque = validarEstoqueCarrinho(carrinho)

    if (itemSemEstoque) {
      mostrarErroVenda(
        `Venda bloqueada: estoque insuficiente para ${itemSemEstoque.nome}.`,
      )
      return
    }

    setSalvandoVenda(true)

    const resultado = await salvarVenda({
      carrinho,
      total,
      formaPagamento,
    })

    if (!resultado.success) {
      setTipoMensagemVenda('erro')
      setMensagemVenda(
        resultado.error?.message || 'Nao foi possivel salvar a venda no banco.',
      )
      setSalvandoVenda(false)
      return
    }

    setCarrinho([])
    setMostrarPagamento(false)
    setFormaPagamento('')
    setTipoMensagemVenda('sucesso')
    setMensagemVenda('Venda realizada com sucesso')
    setDashboardRefreshToken((tokenAtual) => tokenAtual + 1)
    setSalvandoVenda(false)
  }

  async function handleLogoutClick() {
    if (saindo) {
      return
    }

    const confirmarSaida = window.confirm('Deseja sair da sua conta?')

    if (!confirmarSaida) {
      return
    }

    try {
      setSaindo(true)
      await onLogout?.()
      setSaindo(false)
    } catch (error) {
      console.error('Erro ao realizar logout', error)
      setSaindo(false)
    }
  }

  const total = carrinho.reduce(
    (acumulador, item) => acumulador + item.preco * item.quantidade,
    0,
  )
  const quantidadeItens = carrinho.reduce(
    (acumulador, item) => acumulador + item.quantidade,
    0,
  )
  const estoqueDisponivelPorItem = carrinho.reduce((acumulador, item) => {
    if (produtoCatalogoFoiRemovido(item)) {
      acumulador[item.id] = 0
      return acumulador
    }

    acumulador[item.id] = obterEstoqueLimite(item.id)

    return acumulador
  }, {})
  const conteudoHero =
    telaAtiva === 'dashboard'
      ? {
          eyebrow: 'Visao executiva em tempo real',
          descricao:
            'Acompanhe faturamento, produtos em destaque, estoque critico e a evolucao das vendas em um dashboard com cara de produto SaaS.',
        }
      : telaAtiva === 'pdv'
      ? {
          eyebrow: 'Operacao de caixa com identidade profissional',
          descricao:
            'Controle pedidos, ajuste quantidades e finalize vendas com uma experiencia de produto pronta para o dia a dia do caixa.',
        }
      : telaAtiva === 'historico'
        ? {
            eyebrow: 'Historico centralizado de atendimento',
            descricao:
              'Acompanhe as vendas ja registradas com total, forma de pagamento e itens de cada atendimento em uma leitura mais profissional.',
          }
        : telaAtiva === 'caixa'
          ? {
              eyebrow: 'Resumo financeiro em tempo real',
              descricao:
                'Visualize o total vendido hoje, a distribuicao por forma de pagamento e a quantidade de vendas do caixa com foco operacional.',
            }
          : {
            eyebrow: 'Leitura rapida de desempenho',
            descricao:
              'Confira o desempenho da ultima semana, com total vendido, media diaria e os resultados de cada dia em um painel de produto.',
          }

  return (
    <div className="app-shell">
      <main className="pdv-app">
        <header className="hero-banner">
          <button
            type="button"
            className="logout-button"
            onClick={handleLogoutClick}
            disabled={saindo}
          >
            {saindo ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Saindo...
              </>
            ) : (
              'Sair'
            )}
          </button>

          <div className="hero-copy">
            <span className="eyebrow">{conteudoHero.eyebrow}</span>
            <h1 className="hero-title">
              <Logo />
            </h1>
            <p>{conteudoHero.descricao}</p>
          </div>

          <div className="hero-metrics">
            <article className="metric-card">
              <span>Itens no carrinho</span>
              <strong>{quantidadeItens}</strong>
            </article>

            <article className="metric-card metric-card--highlight">
              <span>Total parcial</span>
              <strong>{formatCurrency(total)}</strong>
            </article>
          </div>
        </header>

        {mensagemVenda ? (
          <div
            className={`status-banner${tipoMensagemVenda === 'erro' ? ' status-banner--error' : ''}`}
            role={tipoMensagemVenda === 'erro' ? 'alert' : 'status'}
          >
            <span className="status-indicator" aria-hidden="true" />
            {mensagemVenda}
          </div>
        ) : null}

        <section className="view-switcher" aria-label="Alternar entre telas">
          <button
            type="button"
            className={`view-switcher__button${telaAtiva === 'dashboard' ? ' is-active' : ''}`}
            onClick={() => setTelaAtiva('dashboard')}
          >
            Dashboard
          </button>

          <button
            type="button"
            className={`view-switcher__button${telaAtiva === 'pdv' ? ' is-active' : ''}`}
            onClick={() => setTelaAtiva('pdv')}
          >
            Tela PDV
          </button>

          <button
            type="button"
            className={`view-switcher__button${telaAtiva === 'historico' ? ' is-active' : ''}`}
            onClick={() => setTelaAtiva('historico')}
          >
            Ver historico
          </button>

          <button
            type="button"
            className={`view-switcher__button${telaAtiva === 'caixa' ? ' is-active' : ''}`}
            onClick={() => setTelaAtiva('caixa')}
          >
            Caixa do dia
          </button>

          <button
            type="button"
            className={`view-switcher__button${telaAtiva === 'relatorio' ? ' is-active' : ''}`}
            onClick={() => setTelaAtiva('relatorio')}
          >
            Relatorio
          </button>
        </section>

        {telaAtiva === 'dashboard' ? (
          <Dashboard refreshKey={dashboardRefreshToken} />
        ) : telaAtiva === 'pdv' ? (
          <section className="pdv-layout">
            <Produtos
              preco={preco}
              produto={produto}
              produtos={produtos}
              onAdicionarProduto={adicionarAoCarrinho}
              onCadastrarProdutoCatalogo={cadastrarProdutoCatalogo}
              onEditarEstoqueProduto={editarEstoqueProdutoCatalogo}
              onAdicionarProdutoAvulso={adicionarProdutoAvulso}
              onPrecoChange={setPreco}
              onProdutoChange={setProduto}
              onRemoverProdutoCatalogo={removerProdutoCatalogo}
            />

            <div className="sales-panel">
              <Carrinho
                carrinho={carrinho}
                estoqueDisponivelPorItem={estoqueDisponivelPorItem}
                quantidadeItens={quantidadeItens}
                total={total}
                onAlterarQuantidade={alterarQuantidade}
                onRemoverItem={removerItem}
              />

              <FinalizarVenda
                formaPagamento={formaPagamento}
                mostrarPagamento={mostrarPagamento}
                salvandoVenda={salvandoVenda}
                temItens={carrinho.length > 0}
                total={total}
                onConfirmarVenda={confirmarVenda}
                onIniciarFinalizacao={iniciarFinalizacao}
                onSelecionarFormaPagamento={selecionarFormaPagamento}
              />
            </div>
          </section>
        ) : telaAtiva === 'historico' ? (
          <HistoricoVendas />
        ) : telaAtiva === 'caixa' ? (
          <Caixa />
        ) : (
          <RelatorioSemanal />
        )}
      </main>
    </div>
  )
}

export default App
