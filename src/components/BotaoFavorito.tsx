import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useAlternarFavorito, useFavoritos } from '../hooks/useFavoritos'
import { useUsuario } from '../hooks/useSessao'

type Props = {
  nftId: string
  nome: string
}

export function BotaoFavorito({ nftId, nome }: Props) {
  const { usuario } = useUsuario()
  const { data: favoritos } = useFavoritos()
  const alternar = useAlternarFavorito()
  const navigate = useNavigate()
  const paginaAtual = useRouterState({ select: (estado) => estado.location.href })
  const favorito = favoritos?.includes(nftId) ?? false

  function clicar() {
    if (!usuario) {
      navigate({ to: '/login', search: { redirect: paginaAtual } })
      return
    }
    alternar.mutate({ nftId, favorito: !favorito })
  }

  return (
    <button
      type="button"
      onClick={clicar}
      aria-pressed={usuario ? favorito : undefined}
      aria-label={usuario ? `Favoritar ${nome}` : `Entre para favoritar ${nome}`}
      title={usuario ? (favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos') : 'Entre para favoritar'}
      className="flex h-11 w-11 items-center justify-center rounded border border-borda text-laranja hover:border-laranja focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill={favorito ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    </button>
  )
}
