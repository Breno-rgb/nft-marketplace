import { http, HttpResponse, delay } from 'msw'
import { banco, carrinhoDe, salvar, type CotacaoSalva, type PedidoSalvo } from './db'
import { erro, exigirUsuario } from './auth'
import { montarCarrinho } from './carrinho'
import { lerCenarios, salvarCenarios } from './cenarios'
import { latencia } from './rede'
import { alterarDisponibilidade, alterarPreco, disponibilidadeReal } from './catalogo'
import { emitirPedidoAtualizado } from './tempoReal'
import { multiplicar, paraUnidades, deUnidades } from '../lib/eth'
import { validarComprador as validarDados } from '../lib/validacao'
import type { Rede } from '../types/nft'
import type { Comprador, NovoPedido, Pedido } from '../types/pedido'

const VALIDADE_DA_COTACAO = 10 * 60 * 1000
const TEMPO_DE_CONFIRMACAO = 4000

function hexAleatorio(tamanho: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(tamanho / 2)), (b) => b.toString(16).padStart(2, '0')).join('')
}

function novaCotacao(usuarioId: string): CotacaoSalva {
  const carrinho = carrinhoDe(usuarioId)
  const montado = montarCarrinho(carrinho)
  const agora = Date.now()
  const cotacao: CotacaoSalva = {
    id: `cot-${hexAleatorio(8)}`,
    usuarioId,
    itens: montado.itens.map((item) => ({
      nftId: item.nftId,
      nome: item.nome,
      imagem: item.imagem,
      tokenId: item.tokenId,
      edicao: item.edicao,
      precoEth: item.precoEth,
      quantidade: item.quantidade,
      totalEth: multiplicar(item.precoEth, item.quantidade),
    })),
    carrinho: carrinho.itens.map(({ nftId, edicao, quantidade }) => ({ nftId, edicao, quantidade })),
    cupom: montado.cupom,
    resumo: montado.resumo,
    criadaEm: new Date(agora).toISOString(),
    expiraEm: new Date(agora + VALIDADE_DA_COTACAO).toISOString(),
  }
  banco.cotacoes = [...banco.cotacoes.filter((c) => c.usuarioId !== usuarioId || Date.parse(c.expiraEm) > agora).slice(-30), cotacao]
  salvar()
  return cotacao
}

function semDadosInternos(cotacao: CotacaoSalva) {
  const { usuarioId: _usuario, carrinho: _carrinho, ...publica } = cotacao
  return publica
}

function itemEsgotado(usuarioId: string) {
  const montado = montarCarrinho(carrinhoDe(usuarioId))
  return montado.itens.find((item) => item.quantidade > item.disponivel)
}

function mensagemDeEsgotado(item: { nome: string; edicao: string; disponivel: number }) {
  return item.disponivel === 0
    ? `${item.nome} (edição ${item.edicao}) esgotou. Remova do carrinho para continuar.`
    : `${item.nome} (edição ${item.edicao}) tem só ${item.disponivel} disponíve${item.disponivel === 1 ? 'l' : 'is'}. Ajuste no carrinho.`
}

function assinaturaDaCotacao(cotacao: Pick<CotacaoSalva, 'itens' | 'cupom' | 'resumo'>) {
  return JSON.stringify({
    itens: cotacao.itens.map((i) => [i.nftId, i.edicao, i.quantidade, i.precoEth]),
    cupom: cotacao.cupom?.codigo ?? null,
    resumo: cotacao.resumo,
  })
}

function aplicarEfeitosDoCenario(cotacao: CotacaoSalva) {
  if (banco.efeitosDeCenario.includes(cotacao.id)) return
  banco.efeitosDeCenario = [...banco.efeitosDeCenario.slice(-50), cotacao.id]
  const cenarios = lerCenarios()
  const primeiro = cotacao.itens[0]
  if (primeiro && cenarios.checkout === 'preco-muda') {
    alterarPreco(primeiro.nftId, deUnidades((paraUnidades(primeiro.precoEth) * 110n) / 100n))
  }
  if (primeiro && cenarios.checkout === 'esgota') {
    alterarDisponibilidade(primeiro.nftId, primeiro.edicao, 0)
  }
  if (cenarios.carteira === 'desconecta') {
    delete banco.conexoes[cotacao.usuarioId]
  }
  // Estes cenários acontecem uma vez só e voltam ao normal, para a nova tentativa funcionar.
  salvarCenarios({
    ...cenarios,
    checkout: 'normal',
    carteira: cenarios.carteira === 'desconecta' ? 'aceita' : cenarios.carteira,
  })
  salvar()
}

function validarComprador(comprador: Partial<Comprador> = {}) {
  return validarDados({ nome: comprador.nome ?? '', email: comprador.email ?? '', telefone: comprador.telefone ?? '' })
}

function publico(pedido: PedidoSalvo): Pedido {
  const { usuarioId: _u, chave: _c, assinatura: _a, decideEm: _d, resultado: _r, ...resto } = pedido
  return resto
}

// O pagamento "acontece" alguns segundos depois de criado. Confirmado tira do carrinho só o que foi comprado.
export function resolverPedido(pedido: PedidoSalvo) {
  if (pedido.status !== 'pendente' || Date.now() < pedido.decideEm) return false
  pedido.status = pedido.resultado
  pedido.versao += 1
  pedido.atualizadoEm = new Date().toISOString()

  if (pedido.resultado === 'confirmado') {
    pedido.transacao.bloco = 21_000_000 + Math.floor(Math.random() * 900_000)
    const carrinho = carrinhoDe(pedido.usuarioId)
    for (const comprado of pedido.itens) {
      const item = carrinho.itens.find((i) => i.nftId === comprado.nftId && i.edicao === comprado.edicao)
      if (item) item.quantidade -= comprado.quantidade
      if (comprado.edicao !== 'Aberta') {
        alterarDisponibilidade(comprado.nftId, comprado.edicao, disponibilidadeReal(comprado.nftId, comprado.edicao) - comprado.quantidade, pedido.id)
      }
    }
    carrinho.itens = carrinho.itens.filter((i) => i.quantidade > 0)
    if (pedido.cupom || carrinho.itens.length === 0) carrinho.cupom = null
  } else {
    pedido.motivoRecusa = 'A carteira recusou o pagamento (saldo insuficiente, simulado). Seus itens continuam no carrinho.'
  }
  salvar()
  emitirPedidoAtualizado(pedido.usuarioId, { pedidoId: pedido.id, versao: pedido.versao, pedido: publico(pedido) })
  return true
}

// O "processador de pagamento" decide sozinho, no horário marcado, e avisa pelo Socket.IO.
function agendarResolucao(pedido: PedidoSalvo) {
  setTimeout(() => resolverPedido(pedido), Math.max(0, pedido.decideEm - Date.now()) + 50)
}

export function agendarPendentes() {
  banco.pedidos.filter((p) => p.status === 'pendente').forEach(agendarResolucao)
}

export const handlersDePedidos = [
  http.get('/api/carteiras/conexao', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    return HttpResponse.json(banco.conexoes[usuario.id] ?? null)
  }),

  http.post('/api/carteiras/:id/conexao', async ({ request, params }) => {
    await latencia(800, 700)
    const usuario = exigirUsuario(request)
    const carteira = banco.carteiras[usuario.id]?.find((c) => c.id === params.id)
    if (!carteira) return erro(404, 'Carteira não encontrada.')
    const { rede } = (await request.json()) as { rede: Rede }
    if (rede !== 'Ethereum' && rede !== 'Polygon') return erro(422, 'Escolha uma rede válida.', { codigo: 'VALIDACAO' })
    if (lerCenarios().carteira === 'recusa') {
      return erro(403, 'A conexão foi recusada na carteira. Tente de novo e aprove o pedido.', { codigo: 'CONEXAO_RECUSADA' })
    }
    banco.conexoes[usuario.id] = { carteiraId: carteira.id, rede, conectadaEm: new Date().toISOString() }
    salvar()
    return HttpResponse.json(banco.conexoes[usuario.id])
  }),

  http.delete('/api/carteiras/conexao', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    delete banco.conexoes[usuario.id]
    salvar()
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/cotacao', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    if (carrinhoDe(usuario.id).itens.length === 0) return erro(400, 'Seu carrinho está vazio.', { codigo: 'CARRINHO_VAZIO' })
    const esgotado = itemEsgotado(usuario.id)
    if (esgotado) return erro(409, mensagemDeEsgotado(esgotado), { codigo: 'ESGOTADO' })
    return HttpResponse.json(semDadosInternos(novaCotacao(usuario.id)), { status: 201 })
  }),

  http.post('/api/pedidos', async ({ request }) => {
    await latencia(500, 500)
    const usuario = exigirUsuario(request)
    const chave = request.headers.get('Idempotency-Key')
    if (!chave) return erro(400, 'Falta a chave de idempotência.', { codigo: 'SEM_CHAVE' })

    const dados = (await request.json()) as NovoPedido
    const assinatura = JSON.stringify({ cotacaoId: dados.cotacaoId, carteiraId: dados.carteiraId, rede: dados.rede, comprador: dados.comprador })
    const repetido = banco.pedidos.find((p) => p.usuarioId === usuario.id && p.chave === chave)
    if (repetido) {
      if (repetido.assinatura !== assinatura) {
        return erro(409, 'Esta tentativa de compra já foi usada com outros dados. Revise o pedido de novo.', { codigo: 'IDEMPOTENCIA_CONFLITO' })
      }
      resolverPedido(repetido)
      return HttpResponse.json(publico(repetido), { status: 200 })
    }

    const campos = validarComprador(dados.comprador)
    if (Object.keys(campos).length) return erro(422, 'Verifique seus dados.', { codigo: 'VALIDACAO', campos })

    const cotacao = banco.cotacoes.find((c) => c.id === dados.cotacaoId && c.usuarioId === usuario.id)
    if (!cotacao) return erro(404, 'Revisão do pedido não encontrada. Revise de novo.', { codigo: 'COTACAO_INEXISTENTE' })

    aplicarEfeitosDoCenario(cotacao)

    const esgotado = itemEsgotado(usuario.id)
    if (esgotado) return erro(409, mensagemDeEsgotado(esgotado), { codigo: 'ESGOTADO' })

    const atual = montarCarrinho(carrinhoDe(usuario.id))
    const venceu = Date.parse(cotacao.expiraEm) < Date.now()
    if (venceu || assinaturaDaCotacao(cotacao) !== assinaturaDaCotacao(atual)) {
      return HttpResponse.json(
        {
          mensagem: venceu ? 'A revisão do pedido venceu. Confira os valores atualizados.' : 'Os valores mudaram desde a revisão. Confira e confirme de novo.',
          codigo: 'COTACAO_DESATUALIZADA',
          cotacao: semDadosInternos(novaCotacao(usuario.id)),
        },
        { status: 409 },
      )
    }

    const conexao = banco.conexoes[usuario.id]
    if (!conexao || conexao.carteiraId !== dados.carteiraId || conexao.rede !== dados.rede) {
      return erro(409, 'Sua carteira foi desconectada. Conecte de novo para continuar.', { codigo: 'CARTEIRA_DESCONECTADA' })
    }
    const carteira = banco.carteiras[usuario.id]?.find((c) => c.id === dados.carteiraId)
    if (!carteira) return erro(404, 'Carteira não encontrada.')

    const agora = new Date()
    const cenarios = lerCenarios()
    const pedido: PedidoSalvo = {
      id: `ped-${hexAleatorio(8)}`,
      usuarioId: usuario.id,
      chave,
      assinatura,
      status: 'pendente',
      versao: 1,
      criadoEm: agora.toISOString(),
      atualizadoEm: agora.toISOString(),
      decideEm: agora.getTime() + TEMPO_DE_CONFIRMACAO,
      resultado: cenarios.pagamento,
      itens: cotacao.itens,
      cupom: cotacao.cupom,
      resumo: cotacao.resumo,
      comprador: { nome: dados.comprador.nome.trim(), email: dados.comprador.email.trim(), telefone: dados.comprador.telefone.trim() },
      carteira: { apelido: carteira.apelido, endereco: carteira.endereco },
      rede: dados.rede,
      transacao: { hash: `0x${hexAleatorio(64)}`, bloco: null },
      motivoRecusa: null,
    }
    banco.pedidos.push(pedido)
    salvar()
    agendarResolucao(pedido)

    if (cenarios.pedido === 'timeout') {
      salvarCenarios({ ...cenarios, pedido: 'normal' })
      await delay(15000)
    }
    return HttpResponse.json(publico(pedido), { status: 201 })
  }),

  http.get('/api/pedidos/:id', async ({ request, params }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    const pedido = banco.pedidos.find((p) => p.id === params.id)
    if (!pedido) return erro(404, 'Pedido não encontrado.', { codigo: 'NAO_ENCONTRADO' })
    if (pedido.usuarioId !== usuario.id) return erro(403, 'Este pedido pertence a outra conta.', { codigo: 'SEM_PERMISSAO' })
    resolverPedido(pedido)
    return HttpResponse.json(publico(pedido))
  }),

  http.get('/api/pedidos', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    const meus = banco.pedidos.filter((p) => p.usuarioId === usuario.id)
    meus.forEach(resolverPedido)
    return HttpResponse.json(meus.map(publico).reverse())
  }),
]
