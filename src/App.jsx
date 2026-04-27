import { useEffect, useState } from 'react'
import Caixa from './components/Caixa'
import Carrinho from './components/Carrinho'
import FinalizarVenda from './components/FinalizarVenda'
import HistoricoVendas from './components/HistoricoVendas'
import Logo from './components/Logo'
import Produtos from './components/Produtos'
import RelatorioSemanal from './components/RelatorioSemanal'
import produtosMock from './data/produtosMock'
import { salvarVenda } from './lib/supabase'
import formatCurrency from './utils/formatCurrency'

function criarSlugProduto(nome) {
  return (
    nome
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'produto'
  )
}

function App() {
  const [produto, setProduto] = useState('')
  const [preco, setPreco] = useState('')
  const [produtos, setProdutos] = useState(produtosMock)
  const [carrinho, setCarrinho] = useState([])
  const [mostrarPagamento, setMostrarPagamento] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState('')
  const [mensagemVenda, setMensagemVenda] = useState('')
  const [tipoMensagemVenda, setTipoMensagemVenda] = useState('')
  const [salvandoVenda, setSalvandoVenda] = useState(false)
  const [telaAtiva, setTelaAtiva] = useState('pdv')

  useEffect(() => {
    document.title = 'VendaFácil PDV'
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

  function atualizarEstoqueProduto(produtoId, variacao) {
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

    atualizarEstoqueProduto(itemCarrinho.id, quantidade)
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
      atualizarEstoqueProduto(produtoSelecionado.id, -1)
    }
  }

  function cadastrarProdutoCatalogo({ nome, preco: precoProduto }) {
    const novoProduto = {
      id: `catalogo-${criarSlugProduto(nome)}-${Date.now()}`,
      nome,
      preco: precoProduto,
      categoria: 'Cadastro manual',
      descricao: 'Produto adicionado pelo operador.',
      estoque: null,
    }

    setProdutos((produtosAtuais) => [novoProduto, ...produtosAtuais])

    return novoProduto
  }

  function removerProdutoCatalogo(produtoId) {
    setProdutos((produtosAtuais) =>
      produtosAtuais.filter((item) => item.id !== produtoId),
    )
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
        atualizarEstoqueProduto(id, -1)
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
    setSalvandoVenda(false)
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
    telaAtiva === 'pdv'
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

        {telaAtiva === 'pdv' ? (
          <section className="pdv-layout">
            <Produtos
              preco={preco}
              produto={produto}
              produtos={produtos}
              onAdicionarProduto={adicionarAoCarrinho}
              onCadastrarProdutoCatalogo={cadastrarProdutoCatalogo}
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
