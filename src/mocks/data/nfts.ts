import type { Edicao, Nft } from '../../types/nft'

const base = [
  { nome: 'Emerald Ape', imagem: 1, colecao: 'Kurio Apes', categoria: 'Arte digital', precoEth: '1.19', atributos: ['Óculos', 'Esmeralda', 'Raro'] },
  { nome: 'Sage Nomad', imagem: 2, colecao: 'Nomads', categoria: 'Avatares', precoEth: '1.39', atributos: ['Chapéu', 'Sálvia', 'Comum'] },
  { nome: 'Noir Vessel', imagem: 3, colecao: 'Kurio Apes', categoria: 'Arte 3D', precoEth: '1.79', atributos: ['Noir', 'Terno', 'Épico'] },
  { nome: 'Cosmic Bloom', imagem: 2, colecao: 'Blooms', categoria: 'Colecionáveis', precoEth: '1.29', atributos: ['Cósmico', 'Flor', 'Raro'] },
  { nome: 'Violet Nomad', imagem: 2, colecao: 'Nomads', categoria: 'Avatares', precoEth: '1.39', atributos: ['Violeta', 'Moletom', 'Comum'] },
  { nome: 'Ivory Baron', imagem: 3, colecao: 'Barons', categoria: 'Arte digital', precoEth: '1.79', atributos: ['Marfim', 'Gola alta', 'Épico'] },
  { nome: 'Golden Beat', imagem: 4, colecao: 'Beats', categoria: 'Música', precoEth: '0.99', atributos: ['Dourado', 'Fone', 'Comum'] },
  { nome: 'Golden Signal', imagem: 4, colecao: 'Beats', categoria: 'Música', precoEth: '0.39', atributos: ['Dourado', 'Sinal', 'Comum'] },
]

function edicoesDo(i: number): Edicao[] {
  return [
    { tipo: '1/1', disponivel: i % 4 === 0 ? 0 : 1 },
    { tipo: '1/10', disponivel: 10 - (i % 7) },
    { tipo: '1/50', disponivel: 50 - i },
    { tipo: 'Aberta', disponivel: 999 },
  ]
}

export const nfts: Nft[] = Array.from({ length: 32 }, (_, i) => {
  const modelo = base[i % base.length]
  const numero = String(40 + i * 7).padStart(3, '0')
  const dia = String(1 + (i % 28)).padStart(2, '0')
  return {
    id: String(i + 1),
    nome: `${modelo.nome} #${numero}`,
    colecao: modelo.colecao,
    categoria: modelo.categoria,
    precoEth: modelo.precoEth,
    imagem: `/nfts/${modelo.imagem}.webp`,
    tokenId: `#${numero}`,
    descricao: `${modelo.nome} #${numero} é uma obra digital da coleção ${modelo.colecao}, verificada na rede e com atributos registrados nos metadados do token.`,
    atributos: modelo.atributos,
    rede: i % 3 === 0 ? 'Polygon' : 'Ethereum',
    edicoes: edicoesDo(i),
    avaliacoes: 5 + ((i * 13) % 40),
    criadoEm: `2026-${i < 16 ? '10' : '11'}-${dia}`,
    versao: 1,
  }
})
