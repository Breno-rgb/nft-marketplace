import { api } from './client'
import type { Nft, Ordenacao, PaginaDeNfts, Rede } from '../types/nft'

export type FiltrosDeNfts = {
  busca?: string
  categorias?: string[]
  colecao?: string
  rede?: Rede
  precoMin?: number
  precoMax?: number
  ordenar?: Ordenacao
  pagina?: number
  porPagina?: number
}

export async function listarNfts(filtros: FiltrosDeNfts, signal?: AbortSignal) {
  const { categorias, ...resto } = filtros
  const params = { ...resto, categorias: categorias?.length ? categorias.join(',') : undefined }
  const resposta = await api.get<PaginaDeNfts>('/nfts', { params, signal })
  return resposta.data
}

export async function buscarNft(id: string, signal?: AbortSignal) {
  const resposta = await api.get<Nft>(`/nfts/${id}`, { signal })
  return resposta.data
}
