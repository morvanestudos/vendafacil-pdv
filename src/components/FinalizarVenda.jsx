import formatCurrency from '../utils/formatCurrency'

const formasPagamento = [
  {
    id: 'dinheiro',
    nome: 'Dinheiro',
    descricao: 'Pagamento imediato no caixa',
  },
  {
    id: 'pix',
    nome: 'Pix',
    descricao: 'Confirmacao rapida por QR Code',
  },
]

function FinalizarVenda({
  temItens,
  total,
  mostrarPagamento,
  formaPagamento,
  salvandoVenda,
  onIniciarFinalizacao,
  onSelecionarFormaPagamento,
  onConfirmarVenda,
}) {
  return (
    <section className="panel checkout-panel">
      <div className="checkout-total-box">
        <span className="section-label">Fechamento</span>
        <h2>Total da venda</h2>
        <strong className="checkout-total">{formatCurrency(total)}</strong>
        <p>
          {temItens
            ? 'Escolha a forma de pagamento e confirme a venda.'
            : 'O total aparece aqui assim que os itens entram no carrinho.'}
        </p>
      </div>

      {temItens ? (
        mostrarPagamento ? (
          <div className="payment-flow">
            <p className="payment-title">Forma de pagamento</p>

            <div className="payment-options">
              {formasPagamento.map((forma) => (
                <button
                  key={forma.id}
                  type="button"
                  className={`payment-button${formaPagamento === forma.id ? ' is-active' : ''}`}
                  disabled={salvandoVenda}
                  onClick={() => onSelecionarFormaPagamento(forma.id)}
                >
                  <span>{forma.nome}</span>
                  <small>{forma.descricao}</small>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="primary-button checkout-button"
              disabled={!formaPagamento || salvandoVenda}
              onClick={onConfirmarVenda}
            >
              {salvandoVenda ? (
                <span className="button-spinner" aria-hidden="true" />
              ) : null}
              <span>{salvandoVenda ? 'Salvando venda...' : 'Confirmar venda'}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="primary-button checkout-button"
            disabled={salvandoVenda}
            onClick={onIniciarFinalizacao}
          >
            Finalizar venda
          </button>
        )
      ) : (
        <button type="button" className="secondary-button checkout-button" disabled>
          Finalizar venda
        </button>
      )}
    </section>
  )
}

export default FinalizarVenda
