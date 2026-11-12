import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useCarrinho } from '../hooks/useCarrinho'
import { useSair, useUsuario } from '../hooks/useSessao'
import { avisar } from '../lib/avisos'
import { Avatar } from './Avatar'

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
  const [aberto, setAberto] = useState(false)
  const areaRef = useRef<HTMLDivElement>(null)
  const sair = useSair()
  const navigate = useNavigate()
  const primeiroNome = nome.split(' ')[0]

  useEffect(() => {
    if (!aberto) return
    function fecharSeForFora(evento: MouseEvent) {
      if (!areaRef.current?.contains(evento.target as Node)) setAberto(false)
    }
    function fecharComEsc(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fecharSeForFora)
    document.addEventListener('keydown', fecharComEsc)
    return () => {
      document.removeEventListener('mousedown', fecharSeForFora)
      document.removeEventListener('keydown', fecharComEsc)
    }
  }, [aberto])

  function encerrar() {
    setAberto(false)
    sair.mutate(undefined, {
      onSettled: () => {
        avisar('Você saiu da sua conta.', 'info')
        navigate({ to: '/' })
      },
    })
  }

  const itemDoMenu = 'block w-full px-4 py-2 text-left text-sm hover:bg-fundo hover:text-laranja focus-visible:bg-fundo focus-visible:text-laranja focus-visible:outline-none'

  return (
    <div ref={areaRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls="menu-usuario"
        aria-label={`${primeiroNome}, abrir menu da conta`}
        className="flex items-center gap-2 rounded px-1 text-sm hover:text-laranja focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja"
      >
        <Avatar nome={nome} avatar={avatar} />
        <span className="hidden sm:inline">{primeiroNome}</span>
      </button>
      {aberto && (
        <div id="menu-usuario" className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded border border-borda bg-superficie py-1 shadow-lg">
          <Link to="/perfil" onClick={() => setAberto(false)} className={itemDoMenu}>
            Meu perfil
          </Link>
          <Link to="/carteiras" onClick={() => setAberto(false)} className={itemDoMenu}>
            Carteiras
          </Link>
          <button type="button" onClick={encerrar} className={itemDoMenu}>
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
