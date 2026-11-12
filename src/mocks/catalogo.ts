import { nfts } from './data/nfts'
import { banco, salvar } from './db'
import { emitirNftAtualizado } from './tempoReal'
import type { TipoEdicao } from '../types/nft'

const precosOriginais = new Map(nfts.map((nft) => [nft.id, nft.precoEth]))
const estoqueOriginal = new Map(nfts.map((nft) => [nft.id, nft.edicoes.map((e) => ({ ...e }))]))

// Mudanças de preço e estoque ficam no banco, então sobrevivem ao refresh.
export function aplicarAlteracoesDoCatalogo() {
  for (const nft of nfts) {
    const alteracao = banco.catalogo[nft.id]
    nft.precoEth = alteracao?.precoEth ?? precosOriginais.get(nft.id)!
    nft.versao = alteracao?.versao ?? 1
    nft.edicoes = estoqueOriginal.get(nft.id)!.map((edicao) => ({
      ...edicao,
      disponivel: alteracao?.disponivel?.[edicao.tipo] ?? edicao.disponivel,
    }))
  }
}

// Toda mudança sobe a versão do NFT e avisa os conectados pelo Socket.IO.
function registrar(nftId: string, mudanca: (atual: NonNullable<(typeof banco.catalogo)[string]>) => void, pedidoId: string | null = null) {
  const nft = nfts.find((n) => n.id === nftId)
  if (!nft) return
  const precoAnteriorEth = nft.precoEth
  const atual = { ...banco.catalogo[nftId] }
  mudanca(atual)
  atual.versao = (atual.versao ?? 1) + 1
  banco.catalogo[nftId] = atual
  salvar()
  aplicarAlteracoesDoCatalogo()
  emitirNftAtualizado({
    nftId,
    nome: nft.nome,
    versao: nft.versao,
    precoEth: nft.precoEth,
    precoAnteriorEth,
    edicoes: nft.edicoes,
    pedidoId,
  })
}

export function alterarPreco(nftId: string, precoEth: string) {
  registrar(nftId, (atual) => {
    atual.precoEth = precoEth
  })
}

// pedidoId vem preenchido quando a mudança foi causada por uma compra confirmada.
export function alterarDisponibilidade(nftId: string, edicao: TipoEdicao, disponivel: number, pedidoId: string | null = null) {
  registrar(
    nftId,
    (atual) => {
      atual.disponivel = { ...atual.disponivel, [edicao]: Math.max(0, disponivel) }
    },
    pedidoId,
  )
}

export function disponibilidadeReal(nftId: string, edicao: TipoEdicao) {
  return nfts.find((n) => n.id === nftId)?.edicoes.find((e) => e.tipo === edicao)?.disponivel ?? 0
}
