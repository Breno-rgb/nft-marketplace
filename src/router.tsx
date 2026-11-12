import { createRootRouteWithContext, createRoute, createRouter, lazyRouteComponent, Outlet, redirect } from '@tanstack/react-router'
import { Layout } from './components/Layout'
import type { QueryClient } from '@tanstack/react-query'
import { Home } from './pages/Home'
import { DetalheNft } from './pages/DetalheNft'
import { NaoEncontrado } from './pages/NaoEncontrado'
import { opcoesDaSessao } from './hooks/useSessao'
import { destinoSeguro, sessaoAcabouDeExpirar } from './lib/sessao'
import { queryClient } from './lib/queryClient'
import type { Ordenacao, Rede } from './types/nft'

export type BuscaCatalogo = {
  busca?: string
  categorias?: string
  rede?: Rede
  precoMin?: number
  precoMax?: number
  ordenar?: Ordenacao
  pagina?: number
}

const ordenacoes: Ordenacao[] = ['recentes', 'menor-preco', 'maior-preco', 'nome']
const redes: Rede[] = ['Ethereum', 'Polygon']

function numeroOuNada(valor: unknown) {
  const numero = Number(valor)
  return valor !== undefined && valor !== '' && Number.isFinite(numero) && numero >= 0 ? numero : undefined
}

function validarBusca(busca: Record<string, unknown>): BuscaCatalogo {
  const pagina = numeroOuNada(busca.pagina)
  return {
    busca: typeof busca.busca === 'string' && busca.busca ? busca.busca : undefined,
    categorias: typeof busca.categorias === 'string' && busca.categorias ? busca.categorias : undefined,
    rede: redes.includes(busca.rede as Rede) ? (busca.rede as Rede) : undefined,
    precoMin: numeroOuNada(busca.precoMin),
    precoMax: numeroOuNada(busca.precoMax),
    ordenar: ordenacoes.includes(busca.ordenar as Ordenacao) ? (busca.ordenar as Ordenacao) : undefined,
    pagina: pagina && pagina > 1 ? Math.floor(pagina) : undefined,
  }
}

type BuscaDeConta = {
  redirect?: string
  motivo?: 'expirou'
}

function validarBuscaDeConta(busca: Record<string, unknown>): BuscaDeConta {
  return {
    redirect: typeof busca.redirect === 'string' ? destinoSeguro(busca.redirect) : undefined,
    motivo: busca.motivo === 'expirou' ? 'expirou' : undefined,
  }
}

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Layout,
  notFoundComponent: () => <NaoEncontrado />,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: validarBusca,
  component: Home,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$id',
  component: DetalheNft,
})

const carrinhoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carrinho',
  component: lazyRouteComponent(() => import('./pages/Carrinho'), 'Carrinho'),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: validarBuscaDeConta,
  beforeLoad: async ({ context, search }) => {
    const usuario = await context.queryClient.ensureQueryData(opcoesDaSessao)
    if (usuario) throw redirect({ href: destinoSeguro(search.redirect) })
  },
  component: lazyRouteComponent(() => import('./pages/Login'), 'Login'),
})

const cadastroRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro',
  validateSearch: validarBuscaDeConta,
  beforeLoad: async ({ context, search }) => {
    const usuario = await context.queryClient.ensureQueryData(opcoesDaSessao)
    if (usuario) throw redirect({ href: destinoSeguro(search.redirect) })
  },
  component: lazyRouteComponent(() => import('./pages/Cadastro'), 'Cadastro'),
})

// Rotas privadas ficam dentro desta. Sem sessão, vai para o login e volta depois.
export const autenticadoRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'autenticado',
  beforeLoad: async ({ context, location }) => {
    const usuario = await context.queryClient.ensureQueryData(opcoesDaSessao)
    if (!usuario) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href, motivo: sessaoAcabouDeExpirar() ? 'expirou' : undefined },
      })
    }
  },
  component: Outlet,
})

const perfilRoute = createRoute({
  getParentRoute: () => autenticadoRoute,
  path: '/perfil',
  component: lazyRouteComponent(() => import('./pages/Perfil'), 'Perfil'),
})

const carteirasRoute = createRoute({
  getParentRoute: () => autenticadoRoute,
  path: '/carteiras',
  component: lazyRouteComponent(() => import('./pages/Carteiras'), 'Carteiras'),
})

const pagamentoRoute = createRoute({
  getParentRoute: () => autenticadoRoute,
  path: '/pagamento',
  component: lazyRouteComponent(() => import('./pages/Pagamento'), 'Pagamento'),
})

const pedidoRoute = createRoute({
  getParentRoute: () => autenticadoRoute,
  path: '/pedidos/$id',
  component: lazyRouteComponent(() => import('./pages/Pedido'), 'Pedido'),
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  nftRoute,
  carrinhoRoute,
  loginRoute,
  cadastroRoute,
  autenticadoRoute.addChildren([perfilRoute, carteirasRoute, pagamentoRoute, pedidoRoute]),
])

export const router = createRouter({ routeTree, scrollRestoration: true, context: { queryClient } })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
