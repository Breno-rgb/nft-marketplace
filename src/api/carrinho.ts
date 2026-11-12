import { api } from './client'
import type { Carrinho } from '../types/carrinho'
import type { TipoEdicao } from '../types/nft'

export type NovoItem = {
  nftId: string
  edicao: TipoEdicao
  quantidade: number
}

export async function obterCarrinho(signal?: AbortSignal) {
  const resposta = await api.get<Carrinho>('/carrinho', { signal })
  return resposta.data
}

export async function adicionarItem(item: NovoItem) {
  const resposta = await api.post<Carrinho>('/carrinho/itens', item)
  return resposta.data
}

export async function alterarQuantidade(itemId: string, quantidade: number) {
  const resposta = await api.patch<Carrinho>(`/carrinho/itens/${itemId}`, { quantidade })
  return resposta.data
}

export async function removerItem(itemId: string) {
  const resposta = await api.delete<Carrinho>(`/carrinho/itens/${itemId}`)
  return resposta.data
}

export async function aplicarCupom(codigo: string) {
  const resposta = await api.post<Carrinho>('/carrinho/cupom', { codigo })
  return resposta.data
}

export async function removerCupom() {
  const resposta = await api.delete<Carrinho>('/carrinho/cupom')
  return resposta.data
}
