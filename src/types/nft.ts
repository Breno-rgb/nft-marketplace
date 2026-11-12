export type Rede = 'Ethereum' | 'Polygon'

export type TipoEdicao = '1/1' | '1/10' | '1/50' | 'Aberta'

export type Edicao = {
  tipo: TipoEdicao
  disponivel: number
}

export type Nft = {
  id: string
  nome: string
  colecao: string
  categoria: string
  precoEth: string
  imagem: string
  tokenId: string
  descricao: string
  atributos: string[]
  rede: Rede
  edicoes: Edicao[]
  avaliacoes: number
  criadoEm: string
  versao: number
}

export type Ordenacao = 'recentes' | 'menor-preco' | 'maior-preco' | 'nome'

export type Faceta = {
  nome: string
  total: number
}

export type PaginaDeNfts = {
  itens: Nft[]
  pagina: number
  porPagina: number
  total: number
  totalPaginas: number
  categorias: Faceta[]
}
