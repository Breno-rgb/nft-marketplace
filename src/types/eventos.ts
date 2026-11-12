import type { Edicao } from './nft'
import type { Pedido } from './pedido'

export type EventoNftAtualizado = {
  id: string
  tipo: 'nft.updated'
  nftId: string
  nome: string
  versao: number
  precoEth: string
  precoAnteriorEth: string
  edicoes: Edicao[]
  pedidoId: string | null
  emitidoEm: string
}

export type EventoPedidoAtualizado = {
  id: string
  tipo: 'order.updated'
  pedidoId: string
  versao: number
  pedido: Pedido
  emitidoEm: string
}
