import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useCarrinho } from '../hooks/useCarrinho'
import { useSair, useUsuario } from '../hooks/useSessao'
import { avisar } from '../lib/avisos'
import { Avatar } from './Avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const emBreve = ['Criadores', 'Aprenda']

export function Header() {
  const { data: carrinho } = useCarrinho()
  const quantidade = carrinho?.quantidadeTotal ?? 0

  return (
    <header className="border-b border-borda">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-lg font-bold tracking-widest">
          KURIO
        </Link>
        <nav aria-label="Navegação principal" className="hidden gap-6 text-sm md:flex">
          <Link to="/" activeOptions={{ exact: true, includeSearch: false }} className="text-apagado hover:text-laranja focus-visible:text-laranja [&.active]:text-laranja">
            Início
          </Link>
          <Link to="/" hash="catalogo" className="text-apagado hover:text-laranja focus-visible:text-laranja">
            Mercado
          </Link>
          {emBreve.map((item) => (
            <span key={item} aria-disabled="true" title="Em breve" className="cursor-not-allowed text-apagado/50">
              {item}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link
            to="/carrinho"
            aria-label={`Carrinho, ${quantidade} ${quantidade === 1 ? 'item' : 'itens'}`}
            className="relative text-texto hover:text-laranja"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 4h2l2.4 11h11.2L21 7H6.2" />
              <circle cx="9" cy="19" r="1.5" />
              <circle cx="17" cy="19" r="1.5" />
            </svg>
            {quantidade > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-laranja px-1 text-xs font-bold text-fundo">
                {quantidade}
              </span>
            )}
          </Link>
          <AreaDoUsuario />
        </div>
      </div>
    </header>
  )
}

function AreaDoUsuario() {
  const { usuario, carregando } = useUsuario()
  const paginaAtual = useRouterState({ select: (estado) => estado.location })

  if (carregando) return <span className="h-8 w-20 rounded shimmer" aria-hidden="true" />

  if (!usuario) {
    const naTelaDeConta = paginaAtual.pathname === '/login' || paginaAtual.pathname === '/cadastro'
    return (
      <Link
        to="/login"
        search={naTelaDeConta ? undefined : { redirect: paginaAtual.href }}
        className="rounded border border-laranja px-3 py-1 text-sm text-laranja hover:bg-laranja hover:text-fundo"
      >
        Entrar
      </Link>
    )
  }

  return <MenuDoUsuario nome={usuario.nome} avatar={usuario.avatar} />
}

function MenuDoUsuario({ nome, avatar }: { nome: string; avatar: string | null }) {
  const sair = useSair()
  const navigate = useNavigate()
  const primeiroNome = nome.split(' ')[0]

  function encerrar() {
    sair.mutate(undefined, {
      onSettled: () => {
        avisar('Você saiu da sua conta.', 'info')
        navigate({ to: '/' })
      },
    })
  }

  // DropdownMenu do shadcn/ui (Radix): setas do teclado, Esc, clique fora e foco já resolvidos.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${primeiroNome}, abrir menu da conta`}
        className="flex items-center gap-2 rounded px-1 text-sm hover:text-laranja focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja"
      >
        <Avatar nome={nome} avatar={avatar} />
        <span className="hidden sm:inline">{primeiroNome}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 border border-borda bg-superficie text-texto">
        <DropdownMenuItem asChild>
          <Link to="/perfil">Meu perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/carteiras">Carteiras</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={encerrar}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
