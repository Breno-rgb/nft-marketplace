import { http, HttpResponse, delay } from 'msw'
import { banco, carrinhoDe, salvar, VISITANTE, type UsuarioSalvo } from './db'
import { nfts } from './data/nfts'
import { disponivelDe } from './estoque'
import { validarCadastro, type ErrosDeCampo } from '../lib/validacao'
import type { Usuario } from '../types/auth'

export const DURACAO_DA_SESSAO = 30 * 60 * 1000

function latencia() {
  return delay(300 + Math.random() * 400)
}

export function erro(status: number, mensagem: string, extra: { codigo?: string; campos?: ErrosDeCampo } = {}) {
  return HttpResponse.json({ mensagem, ...extra }, { status })
}

export async function gerarHash(usuarioId: string, senha: string) {
  const bytes = new TextEncoder().encode(`kurio:${usuarioId}:${senha}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function paraUsuario(salvo: UsuarioSalvo): Usuario {
  return { id: salvo.id, nome: salvo.nome, email: salvo.email, avatar: salvo.avatar }
}

function tokenDe(request: Request) {
  const cabecalho = request.headers.get('Authorization')
  return cabecalho?.startsWith('Bearer ') ? cabecalho.slice(7) : null
}

// Lê o token da requisição. Sem token = visitante. Token vencido ou falso = erro 401.
export function lerSessao(request: Request): UsuarioSalvo | null {
  const token = tokenDe(request)
  if (!token) return null
  const sessao = banco.sessoes.find((s) => s.token === token)
  if (!sessao) throw erro(401, 'Sessão inválida. Entre novamente.', { codigo: 'SESSAO_INVALIDA' })
  if (sessao.expiraEm < Date.now()) {
    banco.sessoes = banco.sessoes.filter((s) => s.token !== token)
    salvar()
    throw erro(401, 'Sua sessão expirou. Entre novamente.', { codigo: 'SESSAO_EXPIRADA' })
  }
  const usuario = banco.usuarios.find((u) => u.id === sessao.usuarioId)
  if (!usuario) throw erro(401, 'Sessão inválida. Entre novamente.', { codigo: 'SESSAO_INVALIDA' })
  return usuario
}

export function exigirUsuario(request: Request): UsuarioSalvo {
  const usuario = lerSessao(request)
  if (!usuario) throw erro(401, 'Entre na sua conta para continuar.', { codigo: 'NAO_AUTENTICADO' })
  return usuario
}

export function donoDoCarrinho(request: Request) {
  return lerSessao(request)?.id ?? VISITANTE
}

// Quando o visitante entra na conta, os itens dele vão para o carrinho do usuário.
function juntarCarrinhoDoVisitante(usuarioId: string) {
  const visitante = carrinhoDe(VISITANTE)
  const doUsuario = carrinhoDe(usuarioId)
  for (const item of visitante.itens) {
    const existente = doUsuario.itens.find((i) => i.nftId === item.nftId && i.edicao === item.edicao)
    const limite = disponivelDe(item.nftId, item.edicao)
    if (existente) existente.quantidade = Math.min(existente.quantidade + item.quantidade, limite)
    else if (limite > 0) doUsuario.itens.push({ ...item, quantidade: Math.min(item.quantidade, limite) })
  }
  doUsuario.cupom ??= visitante.cupom
  banco.carrinhos[VISITANTE] = { itens: [], cupom: null }
}

function abrirSessao(usuario: UsuarioSalvo) {
  const sessao = { token: crypto.randomUUID(), usuarioId: usuario.id, expiraEm: Date.now() + DURACAO_DA_SESSAO }
  banco.sessoes.push(sessao)
  juntarCarrinhoDoVisitante(usuario.id)
  salvar()
  return { token: sessao.token, expiraEm: new Date(sessao.expiraEm).toISOString(), usuario: paraUsuario(usuario) }
}

export const handlersDeAuth = [
  http.post('/api/auth/cadastro', async ({ request }) => {
    await latencia()
    const dados = (await request.json()) as { nome?: string; email?: string; senha?: string }
    const campos = validarCadastro({ nome: dados.nome ?? '', email: dados.email ?? '', senha: dados.senha ?? '' })
    if (Object.keys(campos).length) return erro(422, 'Verifique os campos destacados.', { codigo: 'VALIDACAO', campos })

    const email = dados.email!.trim().toLowerCase()
    if (banco.usuarios.some((u) => u.email === email)) {
      return erro(409, 'Já existe uma conta com este email.', { codigo: 'CONFLITO', campos: { email: 'Este email já está em uso.' } })
    }

    const id = `usr-${crypto.randomUUID().slice(0, 8)}`
    const usuario: UsuarioSalvo = {
      id,
      nome: dados.nome!.trim(),
      email,
      senhaHash: await gerarHash(id, dados.senha!),
      avatar: null,
      bio: '',
      criadoEm: new Date().toISOString(),
    }
    banco.usuarios.push(usuario)
    return HttpResponse.json(abrirSessao(usuario), { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    await latencia()
    const { email = '', senha = '' } = (await request.json()) as { email?: string; senha?: string }
    const normalizado = email.trim().toLowerCase()
    const usuario = banco.usuarios.find((u) => u.email === normalizado)
    if (!usuario || usuario.senhaHash !== (await gerarHash(usuario.id, senha))) {
      return erro(401, 'Email ou senha incorretos.', { codigo: 'CREDENCIAIS_INVALIDAS' })
    }
    return HttpResponse.json(abrirSessao(usuario))
  }),

  http.get('/api/auth/sessao', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    const sessao = banco.sessoes.find((s) => s.token === tokenDe(request))!
    return HttpResponse.json({ usuario: paraUsuario(usuario), expiraEm: new Date(sessao.expiraEm).toISOString() })
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    await latencia()
    const token = tokenDe(request)
    banco.sessoes = banco.sessoes.filter((s) => s.token !== token)
    salvar()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/favoritos', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    return HttpResponse.json({ ids: banco.favoritos[usuario.id] ?? [] })
  }),

  http.put('/api/favoritos/:nftId', async ({ request, params }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    const nftId = String(params.nftId)
    if (!nfts.some((n) => n.id === nftId)) return erro(404, 'NFT não encontrado.')
    const atuais = banco.favoritos[usuario.id] ?? []
    banco.favoritos[usuario.id] = atuais.includes(nftId) ? atuais : [...atuais, nftId]
    salvar()
    return HttpResponse.json({ ids: banco.favoritos[usuario.id] })
  }),

  http.delete('/api/favoritos/:nftId', async ({ request, params }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    banco.favoritos[usuario.id] = (banco.favoritos[usuario.id] ?? []).filter((id) => id !== params.nftId)
    salvar()
    return HttpResponse.json({ ids: banco.favoritos[usuario.id] })
  }),
]
