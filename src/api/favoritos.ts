import { api } from './client'

type RespostaDeFavoritos = { ids: string[] }

export async function listarFavoritos(signal?: AbortSignal) {
  const { data } = await api.get<RespostaDeFavoritos>('/favoritos', { signal })
  return data.ids
}

export async function favoritar(nftId: string) {
  const { data } = await api.put<RespostaDeFavoritos>(`/favoritos/${nftId}`)
  return data.ids
}

export async function desfavoritar(nftId: string) {
  const { data } = await api.delete<RespostaDeFavoritos>(`/favoritos/${nftId}`)
  return data.ids
}
