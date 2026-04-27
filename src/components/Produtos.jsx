import { useState } from 'react'
import formatCurrency from '../utils/formatCurrency'
import GerenciarProdutos from './GerenciarProdutos'

function Produtos({
  produtos,
  produto,
  preco,
  onProdutoChange,
  onPrecoChange,
  onAdicionarProduto,
  onCadastrarProdutoCatalogo,
  onAdicionarProdutoAvulso,
  onEditarEstoqueProduto,
  onRemoverProdutoCatalogo,
}) {
  const [produtoEditandoId, setProdutoEditandoId] = useState(null)
  const [estoqueEdicao, setEstoqueEdicao] = useState('')
  const [salvandoEstoqueId, setSalvandoEstoqueId] = useState(null)
  const [feedbackEstoque, setFeedbackEstoque] = useState({
    produtoId: null,
    mensagem: '',
    tipo: '',
  })

  function limparFeedbackEstoque(produtoId = null) {
    setFeedbackEstoque((feedbackAtual) =>
      produtoId === null || feedbackAtual.produtoId === produtoId
        ? {
            produtoId: null,
            mensagem: '',
            tipo: '',
          }
        : feedbackAtual,
    )
  }

  function iniciarEdicaoEstoque(item) {
    setProdutoEditandoId(item.id)
    setEstoqueEdicao(
      typeof item.estoque === 'number' ? String(item.estoque) : '0',
    )
    limparFeedbackEstoque(item.id)
  }

  function cancelarEdicaoEstoque() {
    setProdutoEditandoId(null)
    setEstoqueEdicao('')
  }

  async function salvarEdicaoEstoque(item) {
    const estoqueDigitado = estoqueEdicao.trim()
    const estoqueNormalizado =
      estoqueDigitado === '' ? 0 : Number(estoqueDigitado.replace(',', '.'))

    if (!Number.isInteger(estoqueNormalizado) || estoqueNormalizado < 0) {
      setFeedbackEstoque({
        produtoId: item.id,
        mensagem: 'Informe um estoque valido.',
        tipo: 'erro',
      })
      return
    }

    setSalvandoEstoqueId(item.id)

    const resultado = await onEditarEstoqueProduto(item.id, estoqueNormalizado)

    setSalvandoEstoqueId(null)

    if (!resultado?.success || !resultado.produto) {
      setFeedbackEstoque({
        produtoId: item.id,
        mensagem:
          resultado?.error || 'Nao foi possivel atualizar o estoque do produto.',
        tipo: 'erro',
      })
      return
    }

    setProdutoEditandoId(null)
    setEstoqueEdicao('')
    setFeedbackEstoque({
      produtoId: item.id,
      mensagem: `Estoque de ${resultado.produto.nome} atualizado.`,
      tipo: 'sucesso',
    })
  }

  return (
    <section className="panel products-panel">
      <div className="panel-heading">
        <div>
          <span className="section-label">Produtos</span>
          <h2>Selecione os itens da venda</h2>
          <p className="section-copy">
            Catalogo inicial com produtos mock e cadastro manual para ampliar o atendimento.
          </p>
        </div>

        <span className="pill">{produtos.length} opcoes</span>
      </div>

      <GerenciarProdutos onCadastrarProduto={onCadastrarProdutoCatalogo} />

      {produtos.length ? (
        <div className="products-grid">
          {produtos.map((item) => {
            const controlaEstoque = typeof item.estoque === 'number'
            const produtoSemEstoque = controlaEstoque && item.estoque <= 0
            const estaEditandoEstoque = produtoEditandoId === item.id

            return (
              <article
                key={item.id}
                className={`product-card${produtoSemEstoque ? ' product-card--out' : ''}`}
              >
                <div className="product-card__top">
                  <span className="product-tag">{item.categoria ?? 'Catalogo'}</span>
                  <strong className="product-card__price">
                    {formatCurrency(item.preco)}
                  </strong>
                </div>

                <div className="product-card__body">
                  <h3>{item.nome}</h3>
                  <p>{item.descricao ?? 'Produto disponivel no catalogo.'}</p>
                  <span
                    className={`product-stock${produtoSemEstoque ? ' product-stock--empty' : ''}`}
                  >
                    {produtoSemEstoque
                      ? 'Sem estoque'
                      : controlaEstoque
                        ? `Estoque: ${item.estoque}`
                        : 'Sem controle de estoque'}
                  </span>
                </div>

                {estaEditandoEstoque ? (
                  <div className="product-card__editor">
                    <label className="field">
                      <span>Editar estoque</span>
                      <input
                        min="0"
                        step="1"
                        type="number"
                        value={estoqueEdicao}
                        onChange={(event) => {
                          limparFeedbackEstoque(item.id)
                          setEstoqueEdicao(event.target.value)
                        }}
                      />
                    </label>

                    <div className="product-card__editor-actions">
                      <button
                        type="button"
                        className="primary-button product-card__button"
                        disabled={salvandoEstoqueId === item.id}
                        onClick={() => salvarEdicaoEstoque(item)}
                      >
                        {salvandoEstoqueId === item.id
                          ? 'Salvando estoque...'
                          : 'Salvar estoque'}
                      </button>

                      <button
                        type="button"
                        className="secondary-button product-card__button"
                        disabled={salvandoEstoqueId === item.id}
                        onClick={cancelarEdicaoEstoque}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}

                {feedbackEstoque.produtoId === item.id && feedbackEstoque.mensagem ? (
                  <div
                    className={`inline-feedback product-card__feedback${
                      feedbackEstoque.tipo === 'erro'
                        ? ' inline-feedback--error'
                        : ''
                    }`}
                    role={feedbackEstoque.tipo === 'erro' ? 'alert' : 'status'}
                  >
                    {feedbackEstoque.mensagem}
                  </div>
                ) : null}

                <div className="product-card__actions">
                  <button
                    type="button"
                    className="primary-button product-card__button"
                    disabled={produtoSemEstoque}
                    onClick={() => onAdicionarProduto(item)}
                  >
                    {produtoSemEstoque ? 'Sem estoque' : 'Adicionar'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button product-card__button"
                    onClick={() => iniciarEdicaoEstoque(item)}
                  >
                    Editar estoque
                  </button>

                  <button
                    type="button"
                    className="text-button text-button--danger product-card__remove"
                    onClick={() => onRemoverProdutoCatalogo(item.id)}
                  >
                    Remover
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Nenhum produto no catalogo</h3>
          <p>Use o formulario acima para adicionar um novo item ao PDV.</p>
        </div>
      )}

      <form className="panel quick-add-panel" onSubmit={onAdicionarProdutoAvulso}>
        <div className="panel-heading panel-heading--compact">
          <div>
            <span className="section-label">Produto avulso</span>
            <h2>Cadastro rapido</h2>
          </div>
        </div>

        <p className="quick-add-copy">
          A entrada manual do app atual continua disponivel para vendas fora da
          lista fixa.
        </p>

        <div className="quick-add-fields">
          <label className="field">
            <span>Nome do produto</span>
            <input
              placeholder="Ex.: Agua sem gas"
              value={produto}
              onChange={(event) => onProdutoChange(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Preco</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={preco}
              onChange={(event) => onPrecoChange(event.target.value)}
            />
          </label>
        </div>

        <button type="submit" className="primary-button">
          Adicionar ao carrinho
        </button>
      </form>
    </section>
  )
}

export default Produtos
