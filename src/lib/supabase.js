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

function normalizarProdutoBanco(produto) {
  if (!produto) {
    return null
  }

  return {
    ...produto,
    preco: Number(produto.preco) || 0,
    estoque:
      produto.estoque === null || produto.estoque === undefined
        ? null
        : Number(produto.estoque),
  }
}

function normalizarEstoqueEntrada(estoque) {
  if (estoque === '' || estoque === null || estoque === undefined) {
    return 0
  }

  return Number(estoque)
}

export async function carregarProdutos() {
  try {
    if (!supabase) {
      throw new Error(
        'Cliente Supabase nao inicializado. Confira o arquivo .env na raiz do projeto.',
      )
    }

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      throw error
    }

    return {
      success: true,
      produtos: (data ?? []).map(normalizarProdutoBanco).filter(Boolean),
    }
  } catch (error) {
    console.log('Erro ao carregar produtos', error)
    console.error('Erro ao carregar produtos', error)

    return {
      success: false,
      error,
      produtos: [],
    }
  }
}

export async function cadastrarProduto(produto) {
  try {
    if (!supabase) {
      throw new Error(
        'Cliente Supabase nao inicializado. Confira o arquivo .env na raiz do projeto.',
      )
    }

    const payload = {
      nome: produto?.nome?.trim(),
      preco: Number(produto?.preco),
      estoque: normalizarEstoqueEntrada(produto?.estoque),
    }

    if (!payload.nome || Number.isNaN(payload.preco) || payload.preco <= 0) {
      throw new Error('Dados invalidos para cadastrar o produto.')
    }

    if (!Number.isInteger(payload.estoque) || payload.estoque < 0) {
      throw new Error('Informe um estoque inicial valido.')
    }

    const { data, error } = await supabase
      .from('produtos')
      .insert([payload])
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      produto: normalizarProdutoBanco(data),
    }
  } catch (error) {
    console.log('Erro ao cadastrar produto', error)
    console.error('Erro ao cadastrar produto', error)

    return {
      success: false,
      error,
      produto: null,
    }
  }
}

export async function atualizarEstoqueProduto(produtoId, novoEstoque) {
  try {
    if (!supabase) {
      throw new Error(
        'Cliente Supabase nao inicializado. Confira o arquivo .env na raiz do projeto.',
      )
    }

    const estoqueNormalizado = normalizarEstoqueEntrada(novoEstoque)

    if (!Number.isInteger(estoqueNormalizado) || estoqueNormalizado < 0) {
      throw new Error('Informe um estoque valido para atualizar o produto.')
    }

    const { data, error } = await supabase
      .from('produtos')
      .update({
        estoque: estoqueNormalizado,
      })
      .eq('id', produtoId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      produto: normalizarProdutoBanco(data),
    }
  } catch (error) {
    console.log('Erro ao atualizar estoque do produto', produtoId, error)
    console.error('Erro ao atualizar estoque do produto', produtoId, error)

    return {
      success: false,
      error,
      produto: null,
    }
  }
}

export async function removerProduto(produtoId) {
  try {
    if (!supabase) {
      throw new Error(
        'Cliente Supabase nao inicializado. Confira o arquivo .env na raiz do projeto.',
      )
    }

    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', produtoId)

    if (error) {
      throw error
    }

    return {
      success: true,
    }
  } catch (error) {
    console.log('Erro ao remover produto', produtoId, error)
    console.error('Erro ao remover produto', produtoId, error)

    return {
      success: false,
      error,
    }
  }
}

function normalizarProdutoId(item) {
  const itemId = item?.id

  if (item?.origem !== 'catalogo') {
    return null
  }

  if (typeof itemId === 'string') {
    if (!itemId.trim() || itemId.startsWith('catalogo-') || itemId.startsWith('avulso-')) {
      return null
    }

    return /^\d+$/.test(itemId) ? Number(itemId) : itemId
  }

  return typeof itemId === 'number' ? itemId : null
}

function normalizarItensVenda(carrinho) {
  return carrinho.map((item, index) => {
    const produtoNome = item?.nome?.trim()
    const quantidade = Number(item?.quantidade)
    const preco = Number(item?.preco)
    const produtoId = normalizarProdutoId(item)

    if (!produtoNome || Number.isNaN(quantidade) || Number.isNaN(preco)) {
      throw new Error(`Item invalido no carrinho na posicao ${index + 1}.`)
    }

    return {
      nome: produtoNome,
      preco,
      produtoId,
      quantidade,
    }
  })
}

async function buscarProdutosBanco(produtoIds) {
  if (!produtoIds.length) {
    return []
  }

  const { data, error } = await supabase
    .from('produtos')
    .select('id, nome, estoque')
    .in('id', produtoIds)

  if (error) {
    throw error
  }

  return data ?? []
}

function validarEstoqueBanco(itensVenda, produtosBanco) {
  const produtosPorId = new Map(
    produtosBanco.map((produto) => [String(produto.id), produto]),
  )

  return itensVenda
    .filter((item) => item.produtoId !== null)
    .map((item) => {
      const produtoBanco = produtosPorId.get(String(item.produtoId))

      if (!produtoBanco) {
        throw new Error(
          `Produto ${item.nome} nao foi encontrado na tabela produtos.`,
        )
      }

      if (typeof produtoBanco.estoque !== 'number') {
        return null
      }

      if (produtoBanco.estoque < item.quantidade) {
        throw new Error(
          `Estoque insuficiente no banco para ${produtoBanco.nome ?? item.nome}.`,
        )
      }

      return {
        estoqueAnterior: produtoBanco.estoque,
        estoqueNovo: produtoBanco.estoque - item.quantidade,
        nome: produtoBanco.nome ?? item.nome,
        produtoId: produtoBanco.id,
      }
    })
    .filter(Boolean)
}

async function inserirItensVenda(vendaId, itensVenda) {
  const itensPayload = itensVenda.map((item) => ({
    venda_id: vendaId,
    produto_id: item.produtoId,
    quantidade: item.quantidade,
    preco: item.preco,
  }))

  const { data, error } = await supabase
    .from('itens_venda')
    .insert(itensPayload)
    .select()

  if (
    error?.code === '23502' &&
    String(error.message ?? '').toLowerCase().includes('produto_id')
  ) {
    throw new Error(
      'Existem itens no carrinho sem produto_id no banco. Cadastre esses produtos antes de finalizar a venda.',
    )
  }

  if (
    error?.code === '42703' ||
    String(error.message ?? '').toLowerCase().includes('produto_id')
  ) {
    console.log(
      'Tabela itens_venda sem suporte a produto_id, tentando payload legado com produto_nome.',
      error,
    )

    const itensLegacyPayload = itensVenda.map((item) => ({
      venda_id: vendaId,
      produto_nome: item.nome,
      quantidade: item.quantidade,
      preco: item.preco,
    }))

    const { data: legacyData, error: legacyError } = await supabase
      .from('itens_venda')
      .insert(itensLegacyPayload)
      .select()

    if (legacyError) {
      throw legacyError
    }

    return legacyData ?? []
  }

  if (error) {
    throw error
  }

  return data ?? []
}

async function atualizarEstoqueBanco(ajustesEstoque) {
  const atualizacoesAplicadas = []

  for (const ajuste of ajustesEstoque) {
    const { data, error } = await supabase
      .from('produtos')
      .update({
        estoque: ajuste.estoqueNovo,
      })
      .eq('id', ajuste.produtoId)
      .eq('estoque', ajuste.estoqueAnterior)
      .select('id, estoque')
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error(
        `O estoque de ${ajuste.nome} mudou antes de concluir a venda. Tente novamente.`,
      )
    }

    atualizacoesAplicadas.push(ajuste)
  }

  return atualizacoesAplicadas
}

async function reverterEstoqueBanco(ajustesEstoque) {
  for (const ajuste of ajustesEstoque) {
    const { error } = await supabase
      .from('produtos')
      .update({
        estoque: ajuste.estoqueAnterior,
      })
      .eq('id', ajuste.produtoId)
      .eq('estoque', ajuste.estoqueNovo)

    if (error) {
      console.log('Falha ao reverter estoque no banco', ajuste, error)
    }
  }
}

async function reverterVenda(vendaId) {
  if (!vendaId) {
    return
  }

  const { error: itensError } = await supabase
    .from('itens_venda')
    .delete()
    .eq('venda_id', vendaId)

  if (itensError) {
    console.log('Falha ao remover itens da venda apos erro', vendaId, itensError)
  }

  const { error: vendaError } = await supabase
    .from('vendas')
    .delete()
    .eq('id', vendaId)

  if (vendaError) {
    console.log('Falha ao remover venda apos erro', vendaId, vendaError)
  }
}

export async function salvarVenda({ carrinho, total, formaPagamento }) {
  console.log('Salvando venda', carrinho, total, formaPagamento)

  let vendaCriada = null
  let estoqueAtualizado = []

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

    const itensVenda = normalizarItensVenda(carrinho)
    const produtoIds = itensVenda
      .filter((item) => item.produtoId !== null)
      .map((item) => item.produtoId)
    const produtosBanco = await buscarProdutosBanco(produtoIds)
    const ajustesEstoque = validarEstoqueBanco(itensVenda, produtosBanco)

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

    vendaCriada = venda
    console.log('Venda criada', vendaCriada)

    const itensCriados = await inserirItensVenda(vendaCriada.id, itensVenda)
    console.log('Itens da venda criados', itensCriados)

    estoqueAtualizado = await atualizarEstoqueBanco(ajustesEstoque)
    console.log('Estoque atualizado no banco', estoqueAtualizado)

    return {
      success: true,
      venda: vendaCriada,
      itens: itensCriados,
    }
  } catch (error) {
    console.error('Erro ao salvar venda', error)
    console.log('Erro ao salvar venda', error)

    if (estoqueAtualizado.length) {
      await reverterEstoqueBanco(estoqueAtualizado)
    }

    if (vendaCriada?.id) {
      await reverterVenda(vendaCriada.id)
    }

    return {
      success: false,
      error,
    }
  }
}
