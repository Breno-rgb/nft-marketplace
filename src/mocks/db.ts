import type { Rede, TipoEdicao } from '../types/nft'
import type { Comprador, ConexaoDeCarteira, Cotacao, Pedido } from '../types/pedido'

export type ItemSalvo = {
  id: string
  nftId: string
  edicao: TipoEdicao
  quantidade: number
}

export type CarrinhoSalvo = {
  itens: ItemSalvo[]
  cupom: string | null
}

export type UsuarioSalvo = {
  id: string
  nome: string
  email: string
  senhaHash: string
  avatar: string | null
  bio: string
  criadoEm: string
}

export type CarteiraSalva = {
  id: string
  apelido: string
  endereco: string
  rede: Rede
  tipo: 'principal' | 'secundaria'
  atualizadaEm: string
}

export type SessaoSalva = {
  token: string
  usuarioId: string
  expiraEm: number
}

export type AlteracaoDoCatalogo = {
  versao?: number
  precoEth?: string
  disponivel?: Partial<Record<TipoEdicao, number>>
}

export type CotacaoSalva = Cotacao & {
  usuarioId: string
  carrinho: { nftId: string; edicao: TipoEdicao; quantidade: number }[]
}

export type PedidoSalvo = Pedido & {
  usuarioId: string
  chave: string
  assinatura: string
  decideEm: number
  resultado: 'confirmado' | 'recusado'
  comprador: Comprador
}

type Banco = {
  usuarios: UsuarioSalvo[]
  sessoes: SessaoSalva[]
  carrinhos: Record<string, CarrinhoSalvo>
  favoritos: Record<string, string[]>
  carteiras: Record<string, CarteiraSalva[]>
  catalogo: Record<string, AlteracaoDoCatalogo>
  cotacoes: CotacaoSalva[]
  pedidos: PedidoSalvo[]
  conexoes: Record<string, ConexaoDeCarteira>
  efeitosDeCenario: string[]
}

export const VISITANTE = 'visitante'
const CHAVE = 'kurio-mocks-v3'

function bancoInicial(): Banco {
  return {
    usuarios: [
      {
        id: 'usr-ana',
        nome: 'Ana Ribeiro',
        email: 'ana@kurio.dev',
        senhaHash: 'fdb0f96b19ed02772795b5daa2f82b439289df8f4b77444da71eed1a1356eab9',
        avatar: null,
        bio: 'Coleciono arte digital desde 2021. Gosto de avatares e arte 3D.',
        criadoEm: '2026-09-01T12:00:00.000Z',
      },
      {
        id: 'usr-bruno',
        nome: 'Bruno Costa',
        email: 'bruno@kurio.dev',
        senhaHash: 'de9f1b1b52d4c083a521f2394dbe86f8877e3c136843c3914d2aaa439b92c8e7',
        avatar: null,
        bio: '',
        criadoEm: '2026-09-15T12:00:00.000Z',
      },
    ],
    sessoes: [],
    carrinhos: {},
    favoritos: { 'usr-ana': ['1', '6'] },
    catalogo: {},
    cotacoes: [],
    pedidos: [],
    conexoes: {},
    efeitosDeCenario: [],
    carteiras: {
      'usr-ana': [
        {
          id: 'cart-ana-1',
          apelido: 'Carteira de compras',
          endereco: '0x8f3a5c21b7e94d06a1c2e3f4b5a69788d7c6e5f4',
          rede: 'Ethereum',
          tipo: 'principal',
          atualizadaEm: '2026-10-02T12:00:00.000Z',
        },
      ],
    },
  }
}

function carregar(): Banco {
  try {
    const salvo = localStorage.getItem(CHAVE)
    return salvo ? { ...bancoInicial(), ...JSON.parse(salvo) } : bancoInicial()
  } catch {
    return bancoInicial()
  }
}

export const banco: Banco = carregar()

export function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(banco))
  } catch {
    // sem localStorage (aba anônima, por exemplo): os dados ficam só na memória
  }
}

export function resetarBanco() {
  Object.assign(banco, bancoInicial())
  salvar()
}

export function carrinhoDe(dono: string): CarrinhoSalvo {
  banco.carrinhos[dono] ??= { itens: [], cupom: null }
  return banco.carrinhos[dono]
}
