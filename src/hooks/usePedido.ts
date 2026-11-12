import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { conectarCarteira, criarCotacao, criarPedido, desconectarCarteira, obterConexao, obterPedido } from '../api/pedidos'
import { useUsuario } from './useSessao'
import { statusDoErro } from '../lib/erros'
import { estadoDoTempoReal } from '../lib/tempoReal'

export function useConexao() {
  const { usuario } = useUsuario()
  return useQuery({
    queryKey: ['conexao', usuario?.id],
    queryFn: ({ signal }) => obterConexao(signal),
    enabled: Boolean(usuario),
    staleTime: 0,
  })
}

export function useConectarCarteira() {
  const queryClient = useQueryClient()
  const { usuario } = useUsuario()
  return useMutation({
    mutationFn: conectarCarteira,
    onSuccess: (conexao) => queryClient.setQueryData(['conexao', usuario?.id], conexao),
  })
}

export function useDesconectarCarteira() {
  const queryClient = useQueryClient()
  const { usuario } = useUsuario()
  return useMutation({
    mutationFn: desconectarCarteira,
    onSuccess: () => queryClient.setQueryData(['conexao', usuario?.id], null),
  })
}

export function useCriarCotacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: criarCotacao,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['carrinho'] }),
  })
}

export function useCriarPedido() {
  return useMutation({ mutationFn: criarPedido, retry: false })
}

// O status chega pelo Socket.IO (order.updated). A consulta periódica é só a rede de segurança:
// lenta com o socket conectado, rápida se ele cair. Confirmado e recusado são finais.
export function usePedido(id: string) {
  const { usuario } = useUsuario()
  return useQuery({
    queryKey: ['pedidos', usuario?.id, id],
    queryFn: ({ signal }) => obterPedido(id, signal),
    enabled: Boolean(usuario),
    refetchInterval: (consulta) =>
      consulta.state.data?.status === 'pendente' ? (estadoDoTempoReal() === 'conectado' ? 10000 : 1500) : false,
    retry: (falhas, erro) => falhas < 2 && (statusDoErro(erro) ?? 500) >= 500,
  })
}
