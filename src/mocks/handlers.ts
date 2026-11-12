import { http, HttpResponse, delay } from 'msw'
import { nfts } from './data/nfts'
import type { Nft, Ordenacao, PaginaDeNfts } from '../types/nft'

function latencia() {
  return delay(300 + Math.random() * 600)
}

function ordenar(lista: Nft[], ordem: Ordenacao) {
  const copia = [...lista]
  if (ordem === 'menor-preco') return copia.sort((a, b) => Number(a.precoEth) - Number(b.precoEth))
  if (ordem === 'maior-preco') return copia.sort((a, b) => Number(b.precoEth) - Number(a.precoEth))
  if (ordem === 'nome') return copia.sort((a, b) => a.nome.localeCompare(b.nome))
  return copia.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
}

export const handlers = [
  http.get('/api/nfts', async ({ request }) => {
    await latencia()

    const url = new URL(request.url)
    const busca = (url.searchParams.get('busca') ?? '').toLowerCase()
    const categorias = url.searchParams.get('categorias')?.split(',').filter(Boolean) ?? []
    const colecao = url.searchParams.get('colecao')
    const rede = url.searchParams.get('rede')
    const precoMin = Number(url.searchParams.get('precoMin') ?? 0)
    const precoMax = Number(url.searchParams.get('precoMax') ?? Infinity)
    const ordem = (url.searchParams.get('ordenar') ?? 'recentes') as Ordenacao
    const pagina = Math.max(1, Number(url.searchParams.get('pagina') ?? 1))
    const porPagina = Number(url.searchParams.get('porPagina') ?? 12)

    const semCategoria = nfts.filter((nft) => {
      const preco = Number(nft.precoEth)
      return (
        nft.nome.toLowerCase().includes(busca) &&
        (!colecao || nft.colecao === colecao) &&
        (!rede || nft.rede === rede) &&
        preco >= precoMin &&
        preco <= precoMax
      )
    })

    const contagem = new Map<string, number>()
    for (const nft of semCategoria) {
      contagem.set(nft.categoria, (contagem.get(nft.categoria) ?? 0) + 1)
    }

    const filtrados = semCategoria.filter(
      (nft) => categorias.length === 0 || categorias.includes(nft.categoria),
    )
    const ordenados = ordenar(filtrados, ordem)
    const inicio = (pagina - 1) * porPagina

    const resposta: PaginaDeNfts = {
      itens: ordenados.slice(inicio, inicio + porPagina),
      pagina,
      porPagina,
      total: ordenados.length,
      totalPaginas: Math.max(1, Math.ceil(ordenados.length / porPagina)),
      categorias: [...new Set(nfts.map((nft) => nft.categoria))]
        .sort()
        .map((nome) => ({ nome, total: contagem.get(nome) ?? 0 })),
    }
    return HttpResponse.json(resposta)
  }),

  http.get('/api/nfts/:id', async ({ params }) => {
    await latencia()
    const nft = nfts.find((item) => item.id === params.id)
    if (!nft) {
      return HttpResponse.json({ mensagem: 'NFT não encontrado' }, { status: 404 })
    }
    return HttpResponse.json(nft)
  }),
]
