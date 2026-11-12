const CHAVE = 'kurio-token'

let token: string | null = lerToken()
let aoExpirar: (() => void) | null = null
let expirou = false

function lerToken() {
  try {
    return localStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

export function obterToken() {
  return token
}

export function salvarToken(novo: string) {
  token = novo
  expirou = false
  try {
    localStorage.setItem(CHAVE, novo)
  } catch {
    // sem localStorage: a sessão vale só enquanto a aba estiver aberta
  }
}

export function limparToken() {
  token = null
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // nada para limpar
  }
}

export function quandoSessaoExpirar(callback: () => void) {
  aoExpirar = callback
}

export function avisarQueSessaoExpirou() {
  limparToken()
  expirou = true
  aoExpirar?.()
}

export function sessaoAcabouDeExpirar() {
  const resposta = expirou
  expirou = false
  return resposta
}

export function destinoSeguro(destino: string | undefined) {
  return destino && destino.startsWith('/') && !destino.startsWith('//') ? destino : '/'
}
