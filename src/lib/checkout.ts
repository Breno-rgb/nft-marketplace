import type { Comprador } from '../types/pedido'
import type { Rede } from '../types/nft'

export type Rascunho = {
  comprador: Comprador
  carteiraId: string | null
  rede: Rede
}

const CHAVE_RASCUNHO = 'kurio-checkout'
const CHAVE_TENTATIVA = 'kurio-tentativa'

// O rascunho fica na aba: se a sessão expirar no meio do pagamento, os dados voltam depois do login.
export function lerRascunho(): Rascunho | null {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_RASCUNHO) ?? 'null')
  } catch {
    return null
  }
}

export function salvarRascunho(rascunho: Rascunho) {
  try {
    sessionStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(rascunho))
  } catch {
    // sem sessionStorage: o formulário só não sobrevive ao refresh
  }
}

export function limparCheckout() {
  try {
    sessionStorage.removeItem(CHAVE_RASCUNHO)
    sessionStorage.removeItem(CHAVE_TENTATIVA)
  } catch {
    // nada para limpar
  }
}

// Mesma revisão + mesmos dados = mesma chave. Assim, reenviar depois de um timeout não cria outra compra.
export function chaveDaTentativa(conteudo: string) {
  try {
    const salva = JSON.parse(sessionStorage.getItem(CHAVE_TENTATIVA) ?? 'null') as { conteudo: string; chave: string } | null
    if (salva?.conteudo === conteudo) return salva.chave
    const chave = crypto.randomUUID()
    sessionStorage.setItem(CHAVE_TENTATIVA, JSON.stringify({ conteudo, chave }))
    return chave
  } catch {
    return crypto.randomUUID()
  }
}
