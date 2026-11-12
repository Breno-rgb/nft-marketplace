import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  alterarSenha,
  apagarConta,
  atualizarCarteira,
  atualizarPerfil,
  cadastrarCarteira,
  enviarAvatar,
  listarCarteiras,
  obterPerfil,
  removerAvatar,
  removerCarteira,
} from '../api/perfil'
import { CHAVE_SESSAO, useUsuario } from './useSessao'
import { limparToken } from '../lib/sessao'
import { limparDadosPrivados } from '../lib/queryClient'
import type { Carteira, DadosDaCarteira, Perfil } from '../types/perfil'
import type { Usuario } from '../types/auth'

export function usePerfil() {
  const { usuario } = useUsuario()
  return useQuery({
    queryKey: ['perfil', usuario?.id],
    queryFn: ({ signal }) => obterPerfil(signal),
    enabled: Boolean(usuario),
  })
}

// O perfil salvo também atualiza o usuário da sessão, para o cabeçalho mudar junto.
function useGuardarPerfil() {
  const queryClient = useQueryClient()
  return (perfil: Perfil) => {
    queryClient.setQueryData(['perfil', perfil.id], perfil)
    queryClient.setQueryData<Usuario | null>(CHAVE_SESSAO, (atual) =>
      atual ? { ...atual, nome: perfil.nome, email: perfil.email, avatar: perfil.avatar } : atual,
    )
  }
}

export function useAtualizarPerfil() {
  const guardar = useGuardarPerfil()
  return useMutation({ mutationFn: atualizarPerfil, onSuccess: guardar })
}

export function useEnviarAvatar() {
  const guardar = useGuardarPerfil()
  return useMutation({ mutationFn: enviarAvatar, onSuccess: guardar })
}

export function useRemoverAvatar() {
  const guardar = useGuardarPerfil()
  return useMutation({ mutationFn: removerAvatar, onSuccess: guardar })
}

export function useAlterarSenha() {
  return useMutation({ mutationFn: alterarSenha })
}

export function useApagarConta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: apagarConta,
    onSuccess: () => {
      limparToken()
      queryClient.setQueryData(CHAVE_SESSAO, null)
      limparDadosPrivados()
    },
  })
}

export function useCarteiras() {
  const { usuario } = useUsuario()
  return useQuery({
    queryKey: ['carteiras', usuario?.id],
    queryFn: ({ signal }) => listarCarteiras(signal),
    enabled: Boolean(usuario),
  })
}

function useGuardarCarteiras() {
  const queryClient = useQueryClient()
  const { usuario } = useUsuario()
  return (carteiras: Carteira[]) => queryClient.setQueryData(['carteiras', usuario?.id], carteiras)
}

export function useCadastrarCarteira() {
  const guardar = useGuardarCarteiras()
  return useMutation({ mutationFn: cadastrarCarteira, onSuccess: guardar })
}

export function useAtualizarCarteira() {
  const guardar = useGuardarCarteiras()
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<DadosDaCarteira> }) => atualizarCarteira(id, dados),
    onSuccess: guardar,
  })
}

export function useRemoverCarteira() {
  const guardar = useGuardarCarteiras()
  return useMutation({ mutationFn: removerCarteira, onSuccess: guardar })
}
