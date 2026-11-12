import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { handlersDoCarrinho } from './carrinho'
import { handlersDeAuth } from './auth'
import { handlersDoPerfil } from './perfil'
import { agendarPendentes, handlersDePedidos } from './pedidos'
import { handlerDeRede } from './rede'
import { handlerDeTempoReal, derrubarConexoes, enviarEventoAntigo, repetirUltimoEvento } from './tempoReal'
import { aplicarAlteracoesDoCatalogo, alterarDisponibilidade, alterarPreco } from './catalogo'
import { aplicarCenariosDaUrl, CENARIOS_PADRAO, salvarCenarios } from './cenarios'
import { banco, carrinhoDe, resetarBanco, salvar, VISITANTE } from './db'
import { nfts } from './data/nfts'
import { paraUnidades, deUnidades } from '../lib/eth'

aplicarCenariosDaUrl()
aplicarAlteracoesDoCatalogo()
agendarPendentes()

export const worker = setupWorker(
  handlerDeRede,
  handlerDeTempoReal,
  ...handlersDePedidos,
  ...handlers,
  ...handlersDoCarrinho,
  ...handlersDeAuth,
  ...handlersDoPerfil,
)

// Escolhe o primeiro item do carrinho de quem está usando o app; sem carrinho, o primeiro NFT da página.
function alvoDaSimulacao() {
  const token = localStorage.getItem('kurio-token')
  const dono = banco.sessoes.find((s) => s.token === token)?.usuarioId ?? VISITANTE
  const item = carrinhoDe(dono).itens[0]
  const nft = nfts.find((n) => n.id === (item?.nftId ?? '1'))!
  const edicao = item?.edicao ?? nft.edicoes.find((e) => e.disponivel > 0 && e.tipo !== 'Aberta')?.tipo ?? '1/50'
  return { nft, edicao }
}

export const ferramentasDeTeste = {
  expirarSessao() {
    banco.sessoes.forEach((sessao) => (sessao.expiraEm = Date.now() - 1))
    salvar()
  },
  resetar() {
    resetarBanco()
    salvarCenarios(CENARIOS_PADRAO)
    localStorage.removeItem('kurio-token')
    location.reload()
  },
  mudarPreco() {
    const { nft } = alvoDaSimulacao()
    const centesimo = 10_000n
    const novo = deUnidades((((paraUnidades(nft.precoEth) * 115n) / 100n + centesimo / 2n) / centesimo) * centesimo)
    alterarPreco(nft.id, novo)
    return `Preço de ${nft.nome} alterado para ${novo} ETH.`
  },
  esgotarEdicao() {
    const { nft, edicao } = alvoDaSimulacao()
    alterarDisponibilidade(nft.id, edicao, 0)
    return `Edição ${edicao} de ${nft.nome} esgotada.`
  },
  repetirUltimoEvento() {
    return repetirUltimoEvento() ? 'Último evento enviado de novo.' : 'Nenhum evento enviado ainda.'
  },
  enviarEventoAntigo() {
    return enviarEventoAntigo() ? 'Evento com versão antiga enviado.' : 'Mude um preço antes, para existir um evento antigo.'
  },
  derrubarConexao() {
    derrubarConexoes()
    return 'Conexão em tempo real derrubada. O app deve reconectar sozinho.'
  },
}

Object.assign(window, { kurioMocks: ferramentasDeTeste })
