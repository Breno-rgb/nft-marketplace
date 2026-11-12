import type { Cupom } from './carrinho'
import type { Rede, TipoEdicao } from './nft'

export type ItemDoPedido = {
  nftId: string
  nome: string
  imagem: string
  tokenId: string
  edicao: TipoEdicao
  precoEth: string
  quantidade: number
  totalEth: string
}

export type ResumoDeValores = {
  subtotalEth: string
  descontoEth: string
  taxaRedeEth: string
  totalEth: string
}

export type Cotacao = {
  id: string
  itens: ItemDoPedido[]
  cupom: Cupom | null
  resumo: ResumoDeValores
  criadaEm: string
  expiraEm: string
}

export type Comprador = {
  nome: string
  email: string
  telefone: string
}

export type ConexaoDeCarteira = {
  carteiraId: string
  rede: Rede
  conectadaEm: string
}

export type NovoPedido = {
  cotacaoId: string
  carteiraId: string
  rede: Rede
  comprador: Comprador
}

export type StatusDoPedido = 'pendente' | 'confirmado' | 'recusado'

export type Pedido = {
  id: string
  status: StatusDoPedido
  versao: number
  criadoEm: string
  atualizadoEm: string
  itens: ItemDoPedido[]
  cupom: Cupom | null
  resumo: ResumoDeValores
  comprador: Comprador
  carteira: { apelido: string; endereco: string }
  rede: Rede
  transacao: { hash: string; bloco: number | null }
  motivoRecusa: string | null
}
