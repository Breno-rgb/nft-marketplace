import type { Rede } from './nft'
import type { Usuario } from './auth'

export type Perfil = Usuario & {
  bio: string
  criadoEm: string
}

export type DadosDoPerfil = {
  nome: string
  email: string
  bio: string
  senhaAtual?: string
}

export type DadosDeSenha = {
  senhaAtual: string
  novaSenha: string
}

export type TipoDeCarteira = 'principal' | 'secundaria'

export type Carteira = {
  id: string
  apelido: string
  endereco: string
  rede: Rede
  tipo: TipoDeCarteira
  atualizadaEm: string
}

export type DadosDaCarteira = {
  apelido: string
  endereco: string
  rede: Rede
  tipo: TipoDeCarteira
}
