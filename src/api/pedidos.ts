import { api } from './client'
import type { Rede } from '../types/nft'
import type { ConexaoDeCarteira, Cotacao, NovoPedido, Pedido } from '../types/pedido'

export async function obterConexao(signal?: AbortSignal) {
  const { data } = await api.get<ConexaoDeCarteira | null>('/carteiras/conexao', { signal })
  return data
}

export async function conectarCarteira({ carteiraId, rede }: { carteiraId: string; rede: Rede }) {
  const { data } = await api.post<ConexaoDeCarteira>(`/carteiras/${carteiraId}/conexao`, { rede })
  return data
}

export async function desconectarCarteira() {
  await api.delete('/carteiras/conexao')
}

export async function criarCotacao() {
  const { data } = await api.post<Cotacao>('/cotacao')
  return data
}

export async function criarPedido({ dados, chave }: { dados: NovoPedido; chave: string }) {
  const { data } = await api.post<Pedido>('/pedidos', dados, {
    headers: { 'Idempotency-Key': chave },
    timeout: 8000,
  })
  return data
}

export async function obterPedido(id: string, signal?: AbortSignal) {
  const { data } = await api.get<Pedido>(`/pedidos/${id}`, { signal })
  return data
}
