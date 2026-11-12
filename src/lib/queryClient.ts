import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export const CHAVES_PRIVADAS = [['favoritos'], ['perfil'], ['carteiras'], ['pedidos']]

// Usado no login, no logout e quando a sessão expira: nada de um usuário pode sobrar para o próximo.
export function limparDadosPrivados() {
  CHAVES_PRIVADAS.forEach((queryKey) => queryClient.removeQueries({ queryKey }))
  queryClient.resetQueries({ queryKey: ['carrinho'] })
}
