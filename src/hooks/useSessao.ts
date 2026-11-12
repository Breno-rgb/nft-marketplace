import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cadastrar, entrar, obterSessao, sair } from '../api/auth'
import { limparToken, obterToken, salvarToken } from '../lib/sessao'
import { limparDadosPrivados } from '../lib/queryClient'
import { statusDoErro } from '../lib/erros'
import type { RespostaDeSessao, Usuario } from '../types/auth'

export const CHAVE_SESSAO = ['sessao']

export const opcoesDaSessao = queryOptions({
  queryKey: CHAVE_SESSAO,
  queryFn: async ({ signal }): Promise<Usuario | null> => {
    if (!obterToken()) return null
    try {
      return (await obterSessao(signal)).usuario
    } catch (erro) {
      if (statusDoErro(erro) === 401) return null
      throw erro
    }
  },
  staleTime: 5 * 60_000,
  retry: false,
})

export function useUsuario() {
  const { data, isPending } = useQuery(opcoesDaSessao)
  return { usuario: data ?? null, carregando: isPending }
}

function useAbrirSessao() {
  const queryClient = useQueryClient()
  return (resposta: RespostaDeSessao) => {
    salvarToken(resposta.token)
    limparDadosPrivados()
    queryClient.setQueryData(CHAVE_SESSAO, resposta.usuario)
  }
}

export function useEntrar() {
  const abrirSessao = useAbrirSessao()
  return useMutation({ mutationFn: entrar, onSuccess: abrirSessao })
}

export function useCadastrar() {
  const abrirSessao = useAbrirSessao()
  return useMutation({ mutationFn: cadastrar, onSuccess: abrirSessao })
}

export function useSair() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: sair,
    onSettled: () => {
      limparToken()
      queryClient.setQueryData(CHAVE_SESSAO, null)
      limparDadosPrivados()
    },
  })
}
