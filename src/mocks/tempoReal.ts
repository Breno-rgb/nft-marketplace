import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { banco } from './db'
import type { EventoNftAtualizado, EventoPedidoAtualizado } from '../types/eventos'

type Conexao = {
  id: string
  usuarioId: string | null
  io: ReturnType<typeof toSocketIo>
  fechar: () => void
}

const conexoes = new Map<string, Conexao>()
const historico: (EventoNftAtualizado | EventoPedidoAtualizado)[] = []

// O socket.io-client abre ws://<site>/socket.io/?EIO=4&transport=websocket&token=...
// O MSW ignora o "/socket.io/" do caminho ao comparar, por isso o link é a raiz do site.
const canal = ws.link(`${location.origin.replace(/^http/, 'ws')}/`)

function usuarioDoToken(token: string | null) {
  if (!token) return null
  const sessao = banco.sessoes.find((s) => s.token === token && s.expiraEm > Date.now())
  return sessao?.usuarioId ?? null
}

export const handlerDeTempoReal = canal.addEventListener('connection', (conexao) => {
  const { client } = conexao
  const token = new URL(client.url).searchParams.get('token')
  const registro: Conexao = {
    id: client.id,
    usuarioId: usuarioDoToken(token),
    io: toSocketIo(conexao),
    fechar: () => client.close(),
  }
  conexoes.set(client.id, registro)
  // Engine.IO: o servidor manda "ping" (2) de tempos em tempos; sem isso o cliente acha que caiu.
  const batimento = setInterval(() => client.send('2'), 20000)
  client.addEventListener('close', () => {
    clearInterval(batimento)
    conexoes.delete(client.id)
  })
})

function guardar(evento: EventoNftAtualizado | EventoPedidoAtualizado) {
  historico.push(evento)
  if (historico.length > 50) historico.shift()
}

// Mudança de catálogo é pública: vai para todos os conectados.
export function emitirNftAtualizado(evento: Omit<EventoNftAtualizado, 'id' | 'tipo' | 'emitidoEm'>) {
  const completo: EventoNftAtualizado = { ...evento, id: crypto.randomUUID(), tipo: 'nft.updated', emitidoEm: new Date().toISOString() }
  guardar(completo)
  conexoes.forEach((c) => c.io.client.emit('nft.updated', completo))
}

// Pedido é privado: só as conexões do dono recebem.
export function emitirPedidoAtualizado(usuarioId: string, evento: Omit<EventoPedidoAtualizado, 'id' | 'tipo' | 'emitidoEm'>) {
  const completo: EventoPedidoAtualizado = { ...evento, id: crypto.randomUUID(), tipo: 'order.updated', emitidoEm: new Date().toISOString() }
  guardar(completo)
  conexoes.forEach((c) => {
    if (c.usuarioId === usuarioId) c.io.client.emit('order.updated', completo)
  })
}

// Ferramentas do painel de cenários para testar as regras do cliente.
export function repetirUltimoEvento() {
  const ultimo = historico.at(-1)
  if (!ultimo) return false
  conexoes.forEach((c) => {
    if (ultimo.tipo === 'nft.updated') c.io.client.emit('nft.updated', ultimo)
    else if (c.usuarioId && banco.pedidos.some((p) => p.id === ultimo.pedidoId && p.usuarioId === c.usuarioId)) c.io.client.emit('order.updated', ultimo)
  })
  return true
}

export function enviarEventoAntigo() {
  const ultimo = [...historico].reverse().find((e): e is EventoNftAtualizado => e.tipo === 'nft.updated')
  if (!ultimo) return false
  const antigo: EventoNftAtualizado = {
    ...ultimo,
    id: crypto.randomUUID(),
    versao: ultimo.versao - 1,
    precoEth: ultimo.precoAnteriorEth,
  }
  conexoes.forEach((c) => c.io.client.emit('nft.updated', antigo))
  return true
}

export function derrubarConexoes() {
  conexoes.forEach((c) => c.fechar())
  conexoes.clear()
}
