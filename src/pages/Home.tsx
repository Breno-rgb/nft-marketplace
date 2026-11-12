import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { mensagemDeErro } from '../lib/erros'
import { useNfts } from '../hooks/useNfts'
import { NftCard, NftCardSkeleton } from '../components/NftCard'
import { Paginacao } from '../components/Paginacao'
import { Filtros } from '../components/Filtros'
import type { BuscaCatalogo } from '../router'
import type { Ordenacao } from '../types/nft'

const POR_PAGINA = 12

const opcoesDeOrdem: { valor: Ordenacao; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'menor-preco', rotulo: 'Menor preço' },
  { valor: 'maior-preco', rotulo: 'Maior preço' },
  { valor: 'nome', rotulo: 'Nome (A-Z)' },
]

export function Home() {
  const busca = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const catalogo = useRef<HTMLElement>(null)
  const [texto, setTexto] = useState(busca.busca ?? '')

  const { data, isPending, isError, error, isFetching, refetch } = useNfts({ ...busca, categorias: busca.categorias?.split(','), porPagina: POR_PAGINA })

  function atualizar(mudancas: Partial<BuscaCatalogo>, { manterPagina = false, substituir = false } = {}) {
    navigate({
      search: (anterior) => ({ ...anterior, ...mudancas, pagina: manterPagina ? mudancas.pagina : undefined }),
      replace: substituir,
      resetScroll: false,
    })
  }

  useEffect(() => {
    setTexto(busca.busca ?? '')
  }, [busca.busca])

  useEffect(() => {
    if (texto === (busca.busca ?? '')) return
    const espera = setTimeout(() => atualizar({ busca: texto || undefined }, { substituir: true }), 350)
    return () => clearTimeout(espera)
  }, [texto])

  function mudarPagina(pagina: number) {
    atualizar({ pagina }, { manterPagina: true })
    catalogo.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-12">
        <p className="text-sm text-laranja">Bem-vindo à Kurio</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight md:text-5xl">
          SEJA DONO DO FUTURO
          <br />
          DA ARTE DIGITAL
        </h1>
        <p className="mt-4 max-w-xl text-sm text-apagado">
          Descubra NFTs exclusivos de criadores verificados e colecione obras digitais únicas.
        </p>
      </section>

      <section ref={catalogo} id="catalogo" aria-labelledby="titulo-catalogo" className="scroll-mt-4">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 id="titulo-catalogo" className="text-xl font-bold">
            Catálogo
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="busca">Buscar NFT</label>
            <input
              id="busca"
              type="search"
              placeholder="Buscar NFT..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="rounded border border-borda bg-superficie px-3 py-2 text-sm focus:border-laranja focus:outline-none"
            />
            <label className="sr-only" htmlFor="ordem">Ordenar por</label>
            <select
              id="ordem"
              value={busca.ordenar ?? 'recentes'}
              onChange={(e) => atualizar({ ordenar: e.target.value === 'recentes' ? undefined : (e.target.value as Ordenacao) })}
              className="rounded border border-borda bg-superficie px-3 py-2 text-sm"
            >
              {opcoesDeOrdem.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-8 md:flex-row">
          <Filtros busca={busca} categorias={data?.categorias ?? []} aoMudar={(m) => atualizar(m)} />

          <div className="flex-1">
            <p className="mb-4 text-xs text-apagado" aria-live="polite">
              {data ? `${data.total} NFT${data.total === 1 ? '' : 's'} encontrado${data.total === 1 ? '' : 's'}` : 'Carregando...'}
            </p>

            {isError && (
              <div role="alert" className="mb-4 rounded border border-borda p-6 text-center">
                <p>Não foi possível carregar os NFTs.</p>
                <p className="mt-1 text-sm text-apagado">{mensagemDeErro(error)}</p>
                <button onClick={() => refetch()} className="mt-3 rounded bg-laranja px-4 py-2 text-sm text-fundo">
                  Tentar de novo
                </button>
              </div>
            )}

            {data && data.total === 0 && (
              <p className="rounded border border-borda p-6 text-center text-apagado">
                Nenhum NFT encontrado com esses filtros.
              </p>
            )}

            <div
              className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${isFetching && !isPending ? 'opacity-60' : ''}`}
              aria-busy={isFetching}
            >
              {isPending
                ? Array.from({ length: POR_PAGINA }, (_, i) => <NftCardSkeleton key={i} />)
                : data?.itens.map((nft) => <NftCard key={nft.id} nft={nft} />)}
            </div>

            {data && data.totalPaginas > 1 && (
              <Paginacao pagina={busca.pagina ?? 1} totalPaginas={data.totalPaginas} aoMudar={mudarPagina} />
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
