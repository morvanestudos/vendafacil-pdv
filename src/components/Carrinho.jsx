import ItemCarrinho from './ItemCarrinho'
import formatCurrency from '../utils/formatCurrency'

function Carrinho({
  carrinho,
  estoqueDisponivelPorItem,
  quantidadeItens,
  total,
  onAlterarQuantidade,
  onRemoverItem,
}) {
  const resumoItens =
    quantidadeItens === 1
      ? '1 item selecionado'
      : `${quantidadeItens} itens selecionados`

  return (
    <section className="panel cart-panel">
      <div className="panel-heading">
        <div>
          <span className="section-label">Carrinho</span>
          <h2>Itens da venda</h2>
          <p className="section-copy">
            {carrinho.length
              ? resumoItens
              : 'Adicione produtos para comecar o atendimento.'}
          </p>
        </div>

        <div className="cart-glance">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
      </div>

      {carrinho.length ? (
        <div className="cart-list">
          {carrinho.map((item) => (
            <ItemCarrinho
              key={item.id}
              item={item}
              podeAumentarQuantidade={estoqueDisponivelPorItem[item.id] !== 0}
              onAumentarQuantidade={() => onAlterarQuantidade(item.id, 1)}
              onDiminuirQuantidade={() => onAlterarQuantidade(item.id, -1)}
              onRemoverItem={() => onRemoverItem(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Nenhum produto no carrinho</h3>
          <p>
            Escolha um item ao lado ou cadastre um produto avulso para iniciar a
            venda.
          </p>
        </div>
      )}
    </section>
  )
}

export default Carrinho
