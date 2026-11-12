import { api } from './client'
import type { DadosDeCadastro, DadosDeLogin, RespostaDeSessao, Usuario } from '../types/auth'

export async function entrar(dados: DadosDeLogin) {
  const { data } = await api.post<RespostaDeSessao>('/auth/login', dados)
  return data
}

export async function cadastrar(dados: DadosDeCadastro) {
  const { data } = await api.post<RespostaDeSessao>('/auth/cadastro', dados)
  return data
}

export async function obterSessao(signal?: AbortSignal) {
  const { data } = await api.get<{ usuario: Usuario; expiraEm: string }>('/auth/sessao', { signal })
  return data
}

export async function sair() {
  await api.post('/auth/logout')
}
