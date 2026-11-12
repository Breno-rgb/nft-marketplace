export type ErrosDeCampo = Record<string, string>

const formatoDeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validarEmail(email: string) {
  if (!email.trim()) return 'Informe seu email.'
  if (!formatoDeEmail.test(email.trim())) return 'Digite um email válido, como nome@exemplo.com.'
  return null
}

export function validarSenha(senha: string) {
  if (!senha) return 'Crie uma senha.'
  if (senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'
  if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) return 'Use letras e números na senha.'
  return null
}

export function validarNome(nome: string) {
  const limpo = nome.trim()
  if (!limpo) return 'Informe seu nome.'
  if (limpo.length < 3) return 'O nome precisa ter pelo menos 3 letras.'
  if (limpo.length > 60) return 'O nome pode ter no máximo 60 caracteres.'
  return null
}

function semVazios(erros: Record<string, string | null>): ErrosDeCampo {
  return Object.fromEntries(Object.entries(erros).filter((par): par is [string, string] => Boolean(par[1])))
}

export function validarCadastro(dados: { nome: string; email: string; senha: string }) {
  return semVazios({
    nome: validarNome(dados.nome),
    email: validarEmail(dados.email),
    senha: validarSenha(dados.senha),
  })
}

export function validarLogin(dados: { email: string; senha: string }) {
  return semVazios({
    email: validarEmail(dados.email),
    senha: dados.senha ? null : 'Informe sua senha.',
  })
}

export function validarBio(bio: string) {
  return bio.length > 160 ? 'A bio pode ter no máximo 160 caracteres.' : null
}

export function validarPerfil(dados: { nome: string; email: string; bio: string }) {
  return semVazios({
    nome: validarNome(dados.nome),
    email: validarEmail(dados.email),
    bio: validarBio(dados.bio),
  })
}

export function validarTrocaDeSenha(dados: { senhaAtual: string; novaSenha: string }) {
  const erros = semVazios({
    senhaAtual: dados.senhaAtual ? null : 'Informe sua senha atual.',
    novaSenha: validarSenha(dados.novaSenha),
  })
  if (!erros.novaSenha && dados.senhaAtual && dados.senhaAtual === dados.novaSenha) {
    erros.novaSenha = 'A nova senha precisa ser diferente da atual.'
  }
  return erros
}

export const formatoDeEndereco = /^0x[a-fA-F0-9]{40}$/

export function validarCarteira(dados: { apelido: string; endereco: string; rede: string }) {
  const apelido = dados.apelido.trim()
  return semVazios({
    apelido: !apelido ? 'Dê um apelido para a carteira.' : apelido.length > 30 ? 'O apelido pode ter no máximo 30 caracteres.' : null,
    endereco: !dados.endereco.trim()
      ? 'Informe o endereço da carteira.'
      : !formatoDeEndereco.test(dados.endereco.trim())
        ? 'O endereço começa com 0x e tem mais 40 letras (a-f) ou números.'
        : null,
    rede: dados.rede === 'Ethereum' || dados.rede === 'Polygon' ? null : 'Escolha a rede.',
  })
}

export function apenasDigitos(texto: string) {
  return texto.replace(/\D/g, '')
}

export function validarTelefone(telefone: string) {
  const digitos = apenasDigitos(telefone)
  if (!digitos) return 'Informe seu telefone.'
  if (digitos.length < 10 || digitos.length > 11) return 'Digite o telefone com DDD, como (11) 91234-5678.'
  return null
}

export function formatarTelefone(texto: string) {
  const d = apenasDigitos(texto).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function validarComprador(dados: { nome: string; email: string; telefone: string }) {
  return semVazios({
    nome: validarNome(dados.nome),
    email: validarEmail(dados.email),
    telefone: validarTelefone(dados.telefone),
  })
}
