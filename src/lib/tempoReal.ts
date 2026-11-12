import { useSyncExternalStore } from 'react'
import type { Socket } from 'socket.io-client'
import { mocksProntos } from './ambiente'
import { queryClient } from './queryClient'
import { obterToken } from './sessao'
import { avisar } from './avisos'
import type { EventoNftAtualizado, EventoPedidoAtualizado } from '../types/eventos'
import type { Nft, PaginaDeNfts } from '../types/nft'
import type { Carrinho } from '../types/carrinho'
import type { Pedido } from '../types/pedido'

export type EstadoDoTempoReal = 'desligado' | 'conectando' | 'conectado' | 'reconectando'

let socket: Socket | null = null
let estado: EstadoDoTempoReal = 'desligado'
let jaConectou = false
const ouvintesDoEstado = new Set<() => void>()
const ouvintesDeNft = new Set<(evento: EventoNftAtualizado) => void>()
const eventosVistos = new Set<string>()
const versoesDosNfts = new Map<string, number>()

export const estatisticas = { aplicados: 0, repetidos: 0, antigos: 0, reconexoes: 0 }

// Enquanto o próprio usuário envia um pedido, a resposta pode chegar depois do evento de estoque dessa compra.
let enviandoPedido = false
export function marcarEnvioDePedido(ativo: boolean) {
  enviandoPedido = ativo
}

function mudarEstado(novo: EstadoDoTempoReal) {
  estado = novo
  ouvintesDoEstado.forEach((ouvinte) => ouvinte())
}

export function estadoDoTempoReal() {
  return estado
}

export function useEstadoDoTempoReal() {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintesDoEstado.add(ouvinte)
      return () => ouvintesDoEstado.delete(ouvinte)
    },
    () => estado,
  )
}

export function ouvirMudancasDeNft(callback: (evento: EventoNftAtualizado) => void) {
  ouvintesDeNft.add(callback)
  return () => {
    ouvintesDeNft.delete(callback)
  }
}

// Cada evento tem um id: se chegar repetido, é ignorado.
function jaVisto(id: string) {
  if (eventosVistos.has(id)) {
    estatisticas.repetidos++
    return true
  }
  eventosVistos.add(id)
  if (eventosVistos.size > 300) eventosVistos.delete(eventosVistos.values().next().value!)
  return false
}

function versaoConhecida(nftId: string) {
  const doDetalhe = queryClient.getQueryData<Nft>(['nft', nftId])?.versao ?? 0
  return Math.max(versoesDosNfts.get(nftId) ?? 0, doDetalhe)
}

function receberNft(evento: EventoNftAtualizado) {
  if (jaVisto(evento.id)) return
  // Versão menor ou igual à que já temos = evento atrasado. Aplicar faria a tela voltar no tempo.
  if (evento.versao <= versaoConhecida(evento.nftId)) {
    estatisticas.antigos++
    return
  }
  estatisticas.aplicados++
  versoesDosNfts.set(evento.nftId, evento.versao)

  const atualizar = (nft: Nft): Nft =>
    nft.id === evento.nftId ? { ...nft, precoEth: evento.precoEth, edicoes: evento.edicoes, versao: evento.versao } : nft
  queryClient.setQueryData<Nft>(['nft', evento.nftId], (nft) => nft && atualizar(nft))
  queryClient.setQueriesData<PaginaDeNfts>({ queryKey: ['nfts'] }, (pagina) => pagina && { ...pagina, itens: pagina.itens.map(atualizar) })

  const mudouPreco = evento.precoEth !== evento.precoAnteriorEth
  const noCarrinho = queryClient.getQueryData<Carrinho>(['carrinho'])?.itens.some((item) => item.nftId === evento.nftId)
  const vendoAgora = queryClient.getQueryCache().find({ queryKey: ['nft', evento.nftId] })?.isActive()

  // Estoque que baixou por causa de uma compra sua: atualiza a tela sem avisar, o recibo já conta a história.
  const compraPropria =
    evento.pedidoId !== null &&
    (enviandoPedido || queryClient.getQueriesData({ queryKey: ['pedidos'] }).some(([chave]) => chave.includes(evento.pedidoId)))

  if (compraPropria) {
    queryClient.invalidateQueries({ queryKey: ['carrinho'] })
  } else if (noCarrinho) {
    queryClient.invalidateQueries({ queryKey: ['carrinho'] })
    avisar(
      mudouPreco
        ? `O preço de ${evento.nome} mudou de ${evento.precoAnteriorEth} para ${evento.precoEth} ETH. O total do carrinho foi atualizado.`
        : `A disponibilidade de ${evento.nome} mudou. Confira seu carrinho.`,
      'info',
    )
  } else if (vendoAgora) {
    avisar(mudouPreco ? `O preço deste NFT mudou para ${evento.precoEth} ETH.` : 'A disponibilidade deste NFT mudou.', 'info')
  }
  if (!compraPropria) ouvintesDeNft.forEach((ouvinte) => ouvinte(evento))
}

function receberPedido(evento: EventoPedidoAtualizado, usuarioId: string | null) {
  if (!usuarioId || jaVisto(evento.id)) return
  const chave = ['pedidos', usuarioId, evento.pedidoId]
  const atual = queryClient.getQueryData<Pedido>(chave)
  if (atual && evento.versao <= atual.versao) {
    estatisticas.antigos++
    return
  }
  estatisticas.aplicados++
  queryClient.setQueryData(chave, evento.pedido)
}

// Depois de uma queda, eventos podem ter se perdido: busca o estado atual pela API REST.
function reconciliar() {
  estatisticas.reconexoes++
  for (const queryKey of [['nfts'], ['nft'], ['carrinho'], ['pedidos'], ['conexao']]) {
    queryClient.invalidateQueries({ queryKey })
  }
}

let geracao = 0

// socket.io-client é carregado sob demanda, depois que o MSW já está ativo.
// Importado no topo, ele guardaria o WebSocket original do navegador antes do MSW interceptar.
export async function conectarTempoReal(usuarioId: string | null) {
  desconectarTempoReal()
  const minha = ++geracao
  await mocksProntos
  const { io } = await import('socket.io-client')
  if (minha !== geracao) return
  const token = obterToken()
  const atual = io({
    path: '/socket.io',
    transports: ['websocket'],
    query: token ? { token } : {},
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  })
  socket = atual
  mudarEstado('conectando')

  atual.on('connect', () => {
    if (socket !== atual) return
    if (jaConectou) reconciliar()
    jaConectou = true
    mudarEstado('conectado')
  })
  atual.on('disconnect', () => {
    if (socket === atual) mudarEstado('reconectando')
  })
  atual.on('nft.updated', (evento: EventoNftAtualizado) => {
    if (socket === atual) receberNft(evento)
  })
  atual.on('order.updated', (evento: EventoPedidoAtualizado) => {
    if (socket === atual) receberPedido(evento, usuarioId)
  })
}

// No logout ou troca de usuário a conexão antiga é fechada: nenhum evento dela chega na nova sessão.
export function desconectarTempoReal() {
  geracao++
  const antigo = socket
  socket = null
  jaConectou = false
  antigo?.removeAllListeners()
  antigo?.disconnect()
  mudarEstado('desligado')
}

Object.assign(window, { kurioTempoReal: estatisticas })
