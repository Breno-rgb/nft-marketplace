import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { desfavoritar, favoritar, listarFavoritos } from '../api/favoritos'
import { useUsuario } from './useSessao'
import { avisar } from '../lib/avisos'
import { mensagemDeErro } from '../lib/erros'

export function useFavoritos() {
  const { usuario } = useUsuario()
  return useQuery({
    queryKey: ['favoritos', usuario?.id],
    queryFn: ({ signal }) => listarFavoritos(signal),
    enabled: Boolean(usuario),
  })
}

// Atualização otimista: o coração muda na hora e volta se a API recusar.
export function useAlternarFavorito() {
  const queryClient = useQueryClient()
  const { usuario } = useUsuario()
  const chave = ['favoritos', usuario?.id]

  return useMutation({
    mutationFn: ({ nftId, favorito }: { nftId: string; favorito: boolean }) =>
      favorito ? favoritar(nftId) : desfavoritar(nftId),
    onMutate: async ({ nftId, favorito }) => {
      await queryClient.cancelQueries({ queryKey: chave })
      const anterior = queryClient.getQueryData<string[]>(chave)
      const atual = anterior ?? []
      queryClient.setQueryData<string[]>(chave, favorito ? [...atual, nftId] : atual.filter((id) => id !== nftId))
      return { anterior }
    },
    onError: (erro, _variaveis, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(chave, contexto.anterior)
      avisar(`Não foi possível atualizar seus favoritos. ${mensagemDeErro(erro)}`, 'erro')
    },
    // Sempre confere com o servidor no fim, inclusive quando a lista ainda não tinha carregado.
    onSettled: () => queryClient.invalidateQueries({ queryKey: chave }),
    onSuccess: (ids, { favorito }) => {
      queryClient.setQueryData(chave, ids)
      avisar(favorito ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.', 'sucesso')
    },
  })
}
