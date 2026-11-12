import { http, HttpResponse, delay } from 'msw'
import { banco, salvar, type CarteiraSalva, type UsuarioSalvo } from './db'
import { erro, exigirUsuario, gerarHash } from './auth'
import { validarCarteira, validarPerfil, validarTrocaDeSenha } from '../lib/validacao'
import type { DadosDaCarteira, DadosDeSenha, DadosDoPerfil, Perfil } from '../types/perfil'

const TAMANHO_MAXIMO_DO_AVATAR = 400_000

function latencia() {
  return delay(300 + Math.random() * 400)
}

function paraPerfil(usuario: UsuarioSalvo): Perfil {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    avatar: usuario.avatar,
    bio: usuario.bio ?? '',
    criadoEm: usuario.criadoEm,
  }
}

function carteirasDe(usuarioId: string) {
  banco.carteiras[usuarioId] ??= []
  return banco.carteiras[usuarioId]
}

function ordenadas(carteiras: CarteiraSalva[]) {
  const peso = (c: CarteiraSalva) => (c.tipo === 'principal' ? 0 : 1)
  return [...carteiras].sort((a, b) => peso(a) - peso(b))
}

export const handlersDoPerfil = [
  http.get('/api/perfil', async ({ request }) => {
    await latencia()
    return HttpResponse.json(paraPerfil(exigirUsuario(request)))
  }),

  http.patch('/api/perfil', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    const dados = (await request.json()) as Partial<DadosDoPerfil> & { senhaAtual?: string }
    const limpos = { nome: dados.nome ?? '', email: dados.email ?? '', bio: dados.bio ?? '' }
    const campos = validarPerfil(limpos)
    if (Object.keys(campos).length) return erro(422, 'Verifique os campos destacados.', { codigo: 'VALIDACAO', campos })

    const email = limpos.email.trim().toLowerCase()
    if (banco.usuarios.some((u) => u.email === email && u.id !== usuario.id)) {
      return erro(409, 'Este email já pertence a outra conta.', { codigo: 'CONFLITO', campos: { email: 'Este email já está em uso.' } })
    }
    if (email !== usuario.email) {
      if (!dados.senhaAtual) {
        return erro(422, 'Confirme sua senha para trocar o email.', { codigo: 'VALIDACAO', campos: { senhaAtual: 'Digite sua senha para trocar o email.' } })
      }
      if ((await gerarHash(usuario.id, dados.senhaAtual)) !== usuario.senhaHash) {
        return erro(400, 'A senha está incorreta.', { codigo: 'SENHA_INCORRETA', campos: { senhaAtual: 'Senha incorreta.' } })
      }
    }
    usuario.nome = limpos.nome.trim()
    usuario.email = email
    usuario.bio = limpos.bio.trim()
    salvar()
    return HttpResponse.json(paraPerfil(usuario))
  }),

  http.delete('/api/perfil', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    const { senha = '' } = (await request.json().catch(() => ({}))) as { senha?: string }
    if (!senha) return erro(422, 'Digite sua senha para apagar a conta.', { codigo: 'VALIDACAO', campos: { senha: 'Digite sua senha.' } })
    if ((await gerarHash(usuario.id, senha)) !== usuario.senhaHash) {
      return erro(400, 'A senha está incorreta.', { codigo: 'SENHA_INCORRETA', campos: { senha: 'Senha incorreta.' } })
    }
    banco.usuarios = banco.usuarios.filter((u) => u.id !== usuario.id)
    banco.sessoes = banco.sessoes.filter((s) => s.usuarioId !== usuario.id)
    delete banco.carrinhos[usuario.id]
    delete banco.favoritos[usuario.id]
    delete banco.carteiras[usuario.id]
    salvar()
    return new HttpResponse(null, { status: 204 })
  }),

  http.put('/api/perfil/avatar', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    const { avatar } = (await request.json()) as { avatar?: string }
    if (!avatar || !/^data:image\/(png|jpeg|webp);base64,/.test(avatar)) {
      return erro(422, 'Envie uma imagem PNG, JPG ou WEBP.', { codigo: 'VALIDACAO', campos: { avatar: 'Formato não suportado.' } })
    }
    if (avatar.length > TAMANHO_MAXIMO_DO_AVATAR) {
      return erro(413, 'A imagem ficou grande demais. Tente outra.', { codigo: 'VALIDACAO', campos: { avatar: 'Imagem grande demais.' } })
    }
    usuario.avatar = avatar
    salvar()
    return HttpResponse.json(paraPerfil(usuario))
  }),

  http.delete('/api/perfil/avatar', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    usuario.avatar = null
    salvar()
    return HttpResponse.json(paraPerfil(usuario))
  }),

  http.post('/api/perfil/senha', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    const dados = (await request.json()) as Partial<DadosDeSenha>
    const limpos = { senhaAtual: dados.senhaAtual ?? '', novaSenha: dados.novaSenha ?? '' }
    const campos = validarTrocaDeSenha(limpos)
    if (Object.keys(campos).length) return erro(422, 'Verifique os campos destacados.', { codigo: 'VALIDACAO', campos })
    if ((await gerarHash(usuario.id, limpos.senhaAtual)) !== usuario.senhaHash) {
      return erro(400, 'A senha atual está incorreta.', { codigo: 'SENHA_INCORRETA', campos: { senhaAtual: 'Senha atual incorreta.' } })
    }
    usuario.senhaHash = await gerarHash(usuario.id, limpos.novaSenha)
    salvar()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/carteiras', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    return HttpResponse.json(ordenadas(carteirasDe(usuario.id)))
  }),

  http.post('/api/carteiras', async ({ request }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    const dados = (await request.json()) as DadosDaCarteira
    const campos = validarCarteira(dados)
    if (Object.keys(campos).length) return erro(422, 'Verifique os campos destacados.', { codigo: 'VALIDACAO', campos })

    const carteiras = carteirasDe(usuario.id)
    const endereco = dados.endereco.trim().toLowerCase()
    if (carteiras.some((c) => c.tipo === dados.tipo)) {
      return erro(409, `Você já tem uma carteira ${dados.tipo === 'principal' ? 'principal' : 'secundária'}.`, { codigo: 'CONFLITO' })
    }
    if (carteiras.some((c) => c.endereco === endereco)) {
      return erro(409, 'Esta carteira já está cadastrada.', { codigo: 'CONFLITO', campos: { endereco: 'Endereço já cadastrado.' } })
    }
    const tipo = carteiras.length === 0 ? 'principal' : dados.tipo
    const nova: CarteiraSalva = {
      id: `cart-${crypto.randomUUID().slice(0, 8)}`,
      apelido: dados.apelido.trim(),
      endereco,
      rede: dados.rede,
      tipo,
      atualizadaEm: new Date().toISOString(),
    }
    carteiras.push(nova)
    salvar()
    return HttpResponse.json(ordenadas(carteiras), { status: 201 })
  }),

  http.patch('/api/carteiras/:id', async ({ request, params }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    const carteiras = carteirasDe(usuario.id)
    const carteira = carteiras.find((c) => c.id === params.id)
    if (!carteira) return erro(404, 'Carteira não encontrada.')

    const dados = (await request.json()) as Partial<DadosDaCarteira>
    const juntos = {
      apelido: dados.apelido ?? carteira.apelido,
      endereco: dados.endereco ?? carteira.endereco,
      rede: dados.rede ?? carteira.rede,
    }
    const campos = validarCarteira(juntos)
    if (Object.keys(campos).length) return erro(422, 'Verifique os campos destacados.', { codigo: 'VALIDACAO', campos })
    const endereco = juntos.endereco.trim().toLowerCase()
    if (carteiras.some((c) => c.endereco === endereco && c.id !== carteira.id)) {
      return erro(409, 'Esta carteira já está cadastrada.', { codigo: 'CONFLITO', campos: { endereco: 'Endereço já cadastrado.' } })
    }

    if (dados.tipo === 'principal' && carteira.tipo !== 'principal') {
      carteiras.forEach((c) => (c.tipo = 'secundaria'))
    }
    Object.assign(carteira, {
      apelido: juntos.apelido.trim(),
      endereco,
      rede: juntos.rede,
      tipo: dados.tipo ?? carteira.tipo,
      atualizadaEm: new Date().toISOString(),
    })
    salvar()
    return HttpResponse.json(ordenadas(carteiras))
  }),

  http.delete('/api/carteiras/:id', async ({ request, params }) => {
    await latencia()
    const usuario = exigirUsuario(request)
    const carteiras = carteirasDe(usuario.id)
    const carteira = carteiras.find((c) => c.id === params.id)
    if (!carteira) return erro(404, 'Carteira não encontrada.')
    if (carteira.tipo === 'principal' && carteiras.length > 1) {
      return erro(409, 'Torne a outra carteira principal antes de remover esta.', { codigo: 'CONFLITO' })
    }
    banco.carteiras[usuario.id] = carteiras.filter((c) => c.id !== carteira.id)
    salvar()
    return HttpResponse.json(ordenadas(banco.carteiras[usuario.id]))
  }),
]
