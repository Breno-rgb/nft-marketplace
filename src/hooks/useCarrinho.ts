import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adicionarItem,
  alterarQuantidade,
  aplicarCupom,
  obterCarrinho,
  removerCupom,
  removerItem,
} from '../api/carrinho'
import { multiplicar } from '../lib/eth'
import type { Carrinho } from '../types/carrinho'

const CHAVE = ['carrinho']

export function useCarrinho() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: ({ signal }) => obterCarrinho(signal),
  })
}

function useAtualizarCarrinho() {
  const queryClient = useQueryClient()
  return (carrinho: Carrinho) => queryClient.setQueryData(CHAVE, carrinho)
}

export function useAdicionarAoCarrinho() {
  const atualizar = useAtualizarCarrinho()
  return useMutation({ mutationFn: adicionarItem, onSuccess: atualizar })
}

export function useAplicarCupom() {
  const atualizar = useAtualizarCarrinho()
  return useMutation({ mutationFn: aplicarCupom, onSuccess: atualizar })
}

export function useRemoverCupom() {
  const atualizar = useAtualizarCarrinho()
  return useMutation({ mutationFn: removerCupom, onSuccess: atualizar })
}

// Atualização otimista: a tela muda na hora e volta atrás se a API recusar.
export function useAlterarQuantidade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, quantidade }: { itemId: string; quantidade: number }) =>
      alterarQuantidade(itemId, quantidade),
    onMutate: async ({ itemId, quantidade }) => {
      await queryClient.cancelQueries({ queryKey: CHAVE })
      const anterior = queryClient.getQueryData<Carrinho>(CHAVE)
      if (anterior) {
        queryClient.setQueryData<Carrinho>(CHAVE, {
          ...anterior,
          itens: anterior.itens.map((item) =>
            item.id === itemId ? { ...item, quantidade, totalEth: multiplicar(item.precoEth, quantidade) } : item,
          ),
        })
      }
      return { anterior }
    },
    onError: (_erro, _variaveis, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(CHAVE, contexto.anterior)
    },
    onSuccess: (carrinho) => queryClient.setQueryData(CHAVE, carrinho),
  })
}

export function useRemoverItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removerItem,
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: CHAVE })
      const anterior = queryClient.getQueryData<Carrinho>(CHAVE)
      if (anterior) {
        queryClient.setQueryData<Carrinho>(CHAVE, {
          ...anterior,
          itens: anterior.itens.filter((item) => item.id !== itemId),
        })
      }
      return { anterior }
    },
    onError: (_erro, _itemId, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(CHAVE, contexto.anterior)
    },
    onSuccess: (carrinho) => queryClient.setQueryData(CHAVE, carrinho),
  })
}
