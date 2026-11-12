import { api } from './client'
import type { Carteira, DadosDaCarteira, DadosDeSenha, DadosDoPerfil, Perfil } from '../types/perfil'

export async function obterPerfil(signal?: AbortSignal) {
  const { data } = await api.get<Perfil>('/perfil', { signal })
  return data
}

export async function atualizarPerfil(dados: DadosDoPerfil) {
  const { data } = await api.patch<Perfil>('/perfil', dados)
  return data
}

export async function apagarConta(senha: string) {
  await api.delete('/perfil', { data: { senha } })
}

export async function enviarAvatar(avatar: string) {
  const { data } = await api.put<Perfil>('/perfil/avatar', { avatar })
  return data
}

export async function removerAvatar() {
  const { data } = await api.delete<Perfil>('/perfil/avatar')
  return data
}

export async function alterarSenha(dados: DadosDeSenha) {
  await api.post('/perfil/senha', dados)
}

export async function listarCarteiras(signal?: AbortSignal) {
  const { data } = await api.get<Carteira[]>('/carteiras', { signal })
  return data
}

export async function cadastrarCarteira(dados: DadosDaCarteira) {
  const { data } = await api.post<Carteira[]>('/carteiras', dados)
  return data
}

export async function atualizarCarteira(id: string, dados: Partial<DadosDaCarteira>) {
  const { data } = await api.patch<Carteira[]>(`/carteiras/${id}`, dados)
  return data
}

export async function removerCarteira(id: string) {
  const { data } = await api.delete<Carteira[]>(`/carteiras/${id}`)
  return data
}
