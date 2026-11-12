export type Usuario = {
  id: string
  nome: string
  email: string
  avatar: string | null
}

export type RespostaDeSessao = {
  token: string
  expiraEm: string
  usuario: Usuario
}

export type DadosDeLogin = {
  email: string
  senha: string
}

export type DadosDeCadastro = {
  nome: string
  email: string
  senha: string
}
