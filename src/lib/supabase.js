import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const supabaseProjectUrl = supabaseUrl?.replace(/\/rest\/v1\/?$/, '')

console.log('[supabase] Config carregada', {
  hasUrl: Boolean(supabaseProjectUrl),
  hasAnonKey: Boolean(supabaseAnonKey),
  url: supabaseProjectUrl ?? null,
})

if (!supabaseProjectUrl || !supabaseAnonKey) {
  console.error(
    '[supabase] Variaveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas no arquivo .env da raiz do projeto.',
  )
}

export const supabase =
  supabaseProjectUrl && supabaseAnonKey
    ? createClient(supabaseProjectUrl, supabaseAnonKey)
    : null

export async function salvarVenda({ carrinho, total, formaPagamento }) {
  console.log('Salvando venda', carrinho, total, formaPagamento)

  try {
    if (!supabase) {
      throw new Error(
        'Cliente Supabase nao inicializado. Confira o arquivo .env na raiz do projeto.',
      )
    }

    if (!Array.isArray(carrinho) || carrinho.length === 0) {
      throw new Error('O carrinho precisa ter pelo menos um item para salvar.')
    }

    if (!formaPagamento) {
      throw new Error('Selecione uma forma de pagamento antes de finalizar.')
    }

    const itensVenda = carrinho.map((item, index) => {
      const produtoNome = item?.nome?.trim()
      const quantidade = Number(item?.quantidade)
      const preco = Number(item?.preco)

      if (!produtoNome || Number.isNaN(quantidade) || Number.isNaN(preco)) {
        throw new Error(`Item invalido no carrinho na posicao ${index + 1}.`)
      }

      return {
        produto_nome: produtoNome,
        quantidade,
        preco,
      }
    })

    const { data: venda, error: vendaError } = await supabase
      .from('vendas')
      .insert([
        {
          total: Number(total),
          forma_pagamento: formaPagamento,
        },
      ])
      .select()
      .single()

    if (vendaError) {
      throw vendaError
    }

    console.log('Venda criada', venda)

    const itensPayload = itensVenda.map((item) => ({
      venda_id: venda.id,
      ...item,
    }))

    const { data: itensCriados, error: itensError } = await supabase
      .from('itens_venda')
      .insert(itensPayload)
      .select()

    if (itensError) {
      throw itensError
    }

    console.log('Itens da venda criados', itensCriados)

    return {
      success: true,
      venda,
      itens: itensCriados,
    }
  } catch (error) {
    console.error('Erro ao salvar venda', error)

    return {
      success: false,
      error,
    }
  }
}
