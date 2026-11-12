import { http, HttpResponse, delay } from 'msw'
import { nfts } from './data/nfts'
import { carrinhoDe, salvar, type CarrinhoSalvo } from './db'
import { disponivelDe, LIMITE_POR_ITEM } from './estoque'
import { donoDoCarrinho, erro as erroDaApi } from './auth'
import { deUnidades, multiplicar, paraUnidades } from '../lib/eth'
import type { Carrinho } from '../types/carrinho'
import type { TipoEdicao } from '../types/nft'

export { LIMITE_POR_ITEM }

const TAXA_DE_REDE = '0.016'

const cupons: Record<string, { percentual: number; expirado: boolean }> = {
  KURIO10: { percentual: 10, expirado: false },
  KURIO20: { percentual: 20, expirado: true },
}

function latencia() {
  return delay(250 + Math.random() * 400)
}

function erro(mensagem: string, status: number) {
  return erroDaApi(status, mensagem)
}

function carrinhoDaRequisicao(request: Request) {
  return carrinhoDe(donoDoCarrinho(request))
}

export function montarCarrinho(carrinho: CarrinhoSalvo): Carrinho {
  const itens = carrinho.itens.flatMap((salvo) => {
    const nft = nfts.find((item) => item.id === salvo.nftId)
    if (!nft) return []
    return [{
      id: salvo.id,
      nftId: nft.id,
      nome: nft.nome,
      imagem: nft.imagem,
      tokenId: nft.tokenId,
      edicao: salvo.edicao,
      precoEth: nft.precoEth,
      quantidade: salvo.quantidade,
      disponivel: disponivelDe(nft.id, salvo.edicao),
      totalEth: multiplicar(nft.precoEth, salvo.quantidade),
    }]
  })

  const subtotal = itens.reduce((soma, item) => soma + paraUnidades(item.totalEth), 0n)
  const cupom = carrinho.cupom ? { codigo: carrinho.cupom, percentual: cupons[carrinho.cupom].percentual } : null
  const desconto = cupom ? (subtotal * BigInt(cupom.percentual)) / 100n : 0n
  const taxa = itens.length ? paraUnidades(TAXA_DE_REDE) : 0n

  return {
    itens,
    cupom,
    quantidadeTotal: itens.reduce((soma, item) => soma + item.quantidade, 0),
    resumo: {
      subtotalEth: deUnidades(subtotal),
      descontoEth: deUnidades(desconto),
      taxaRedeEth: deUnidades(taxa),
      totalEth: deUnidades(subtotal - desconto + taxa),
    },
  }
}

export const handlersDoCarrinho = [
  http.get('/api/carrinho', async ({ request }) => {
    await latencia()
    return HttpResponse.json(montarCarrinho(carrinhoDaRequisicao(request)))
  }),

  http.post('/api/carrinho/itens', async ({ request }) => {
    await latencia()
    const carrinho = carrinhoDaRequisicao(request)
    const { nftId, edicao, quantidade } = (await request.json()) as { nftId: string; edicao: TipoEdicao; quantidade: number }
    const disponivel = disponivelDe(nftId, edicao)
    if (!Number.isInteger(quantidade) || quantidade < 1) return erro('Quantidade inválida.', 400)

    const existente = carrinho.itens.find((item) => item.nftId === nftId && item.edicao === edicao)
    const novaQuantidade = (existente?.quantidade ?? 0) + quantidade
    if (disponivel === 0) return erro('Esta edição está esgotada.', 409)
    if (novaQuantidade > disponivel) {
      return erro(`Só é possível ter ${disponivel} unidade${disponivel === 1 ? '' : 's'} desta edição no carrinho.`, 409)
    }

    if (existente) existente.quantidade = novaQuantidade
    else carrinho.itens.push({ id: crypto.randomUUID(), nftId, edicao, quantidade })
    salvar()
    return HttpResponse.json(montarCarrinho(carrinho), { status: 201 })
  }),

  http.patch('/api/carrinho/itens/:itemId', async ({ params, request }) => {
    await latencia()
    const carrinho = carrinhoDaRequisicao(request)
    const { quantidade } = (await request.json()) as { quantidade: number }
    const item = carrinho.itens.find((i) => i.id === params.itemId)
    if (!item) return erro('Item não encontrado no carrinho.', 404)
    const disponivel = disponivelDe(item.nftId, item.edicao)
    if (!Number.isInteger(quantidade) || quantidade < 1) return erro('Quantidade inválida.', 400)
    if (quantidade > disponivel) return erro(`Só há ${disponivel} disponíve${disponivel === 1 ? 'l' : 'is'}.`, 409)
    item.quantidade = quantidade
    salvar()
    return HttpResponse.json(montarCarrinho(carrinho))
  }),

  http.delete('/api/carrinho/itens/:itemId', async ({ params, request }) => {
    await latencia()
    const carrinho = carrinhoDaRequisicao(request)
    carrinho.itens = carrinho.itens.filter((i) => i.id !== params.itemId)
    if (carrinho.itens.length === 0) carrinho.cupom = null
    salvar()
    return HttpResponse.json(montarCarrinho(carrinho))
  }),

  http.post('/api/carrinho/cupom', async ({ request }) => {
    await latencia()
    const carrinho = carrinhoDaRequisicao(request)
    const { codigo } = (await request.json()) as { codigo: string }
    const normalizado = codigo.trim().toUpperCase()
    const cupom = cupons[normalizado]
    if (!cupom) return erro('Cupom inválido.', 400)
    if (cupom.expirado) return erro('Este cupom expirou.', 400)
    if (carrinho.itens.length === 0) return erro('Adicione itens antes de usar um cupom.', 400)
    carrinho.cupom = normalizado
    salvar()
    return HttpResponse.json(montarCarrinho(carrinho))
  }),

  http.delete('/api/carrinho/cupom', async ({ request }) => {
    await latencia()
    const carrinho = carrinhoDaRequisicao(request)
    carrinho.cupom = null
    salvar()
    return HttpResponse.json(montarCarrinho(carrinho))
  }),
]
