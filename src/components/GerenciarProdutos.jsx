import { useState } from 'react'

function GerenciarProdutos({ onCadastrarProduto }) {
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [feedback, setFeedback] = useState({
    mensagem: '',
    tipo: '',
  })

  function limparFeedback() {
    setFeedback({
      mensagem: '',
      tipo: '',
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nomeProduto = nome.trim()
    const precoDigitado = preco.trim()
    const precoNormalizado = Number(precoDigitado.replace(',', '.'))

    if (!nomeProduto) {
      setFeedback({
        mensagem: 'Informe o nome do produto.',
        tipo: 'erro',
      })
      return
    }

    if (!precoDigitado) {
      setFeedback({
        mensagem: 'Informe o preco do produto.',
        tipo: 'erro',
      })
      return
    }

    if (Number.isNaN(precoNormalizado) || precoNormalizado <= 0) {
      setFeedback({
        mensagem: 'Informe um preco valido.',
        tipo: 'erro',
      })
      return
    }

    const resultado = await onCadastrarProduto({
      nome: nomeProduto,
      preco: precoNormalizado,
    })

    if (!resultado?.success || !resultado.produto) {
      setFeedback({
        mensagem:
          resultado?.error || 'Nao foi possivel adicionar o produto no banco.',
        tipo: 'erro',
      })
      return
    }

    setNome('')
    setPreco('')
    setFeedback({
      mensagem: `${resultado.produto.nome} adicionado ao catalogo.`,
      tipo: 'sucesso',
    })
  }

  return (
    <form className="quick-add-panel product-management-card" onSubmit={handleSubmit}>
      <div className="panel-heading panel-heading--compact">
        <div>
          <span className="section-label">Catalogo</span>
          <h2>Gerenciar produtos</h2>
        </div>
      </div>

      <p className="quick-add-copy">
        Cadastre novos itens para o catalogo sem alterar a logica atual da venda.
      </p>

      {feedback.mensagem ? (
        <div
          className={`inline-feedback${feedback.tipo === 'erro' ? ' inline-feedback--error' : ''}`}
          role={feedback.tipo === 'erro' ? 'alert' : 'status'}
        >
          {feedback.mensagem}
        </div>
      ) : null}

      <div className="quick-add-fields">
        <label className="field">
          <span>Nome do produto</span>
          <input
            placeholder="Ex.: Combo cafe da tarde"
            value={nome}
            onChange={(event) => {
              if (feedback.mensagem) {
                limparFeedback()
              }

              setNome(event.target.value)
            }}
          />
        </label>

        <label className="field">
          <span>Preco</span>
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={preco}
            onChange={(event) => {
              if (feedback.mensagem) {
                limparFeedback()
              }

              setPreco(event.target.value)
            }}
          />
        </label>
      </div>

      <button type="submit" className="primary-button">
        Adicionar produto
      </button>
    </form>
  )
}

export default GerenciarProdutos
