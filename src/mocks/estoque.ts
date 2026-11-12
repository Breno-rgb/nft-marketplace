import { nfts } from './data/nfts'

export const LIMITE_POR_ITEM = 10

export function disponivelDe(nftId: string, edicao: string) {
  const nft = nfts.find((item) => item.id === nftId)
  return Math.min(nft?.edicoes.find((e) => e.tipo === edicao)?.disponivel ?? 0, LIMITE_POR_ITEM)
}
