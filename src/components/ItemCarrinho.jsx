import formatCurrency from '../utils/formatCurrency'

function ItemCarrinho({
  item,
  podeAumentarQuantidade,
  onAumentarQuantidade,
  onDiminuirQuantidade,
  onRemoverItem,
}) {
  const subtotal = item.preco * item.quantidade

  return (
    <article className="cart-item">
      <div className="cart-item__copy">
        <h3>{item.nome}</h3>
        <p>{formatCurrency(item.preco)} por unidade</p>
      </div>

      <div className="cart-item__meta">
        <strong className="cart-item__subtotal">{formatCurrency(subtotal)}</strong>

        <div className="cart-item__actions">
          <div className="quantity-controls">
            <button
              type="button"
              className="icon-button"
              aria-label={`Diminuir quantidade de ${item.nome}`}
              onClick={onDiminuirQuantidade}
            >
              -
            </button>

            <span>{item.quantidade}</span>

            <button
              type="button"
              className="icon-button"
              aria-label={`Aumentar quantidade de ${item.nome}`}
              disabled={!podeAumentarQuantidade}
              onClick={onAumentarQuantidade}
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="text-button text-button--danger cart-item__remove"
            onClick={onRemoverItem}
          >
            Remover item
          </button>
        </div>
      </div>
    </article>
  )
}

export default ItemCarrinho
