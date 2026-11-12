import type { TipoEdicao } from './nft'

export type ItemDoCarrinho = {
  id: string
  nftId: string
  nome: string
  imagem: string
  tokenId: string
  edicao: TipoEdicao
  precoEth: string
  quantidade: number
  disponivel: number
  totalEth: string
}

export type Cupom = {
  codigo: string
  percentual: number
}

export type Carrinho = {
  itens: ItemDoCarrinho[]
  cupom: Cupom | null
  quantidadeTotal: number
  resumo: {
    subtotalEth: string
    descontoEth: string
    taxaRedeEth: string
    totalEth: string
  }
}
