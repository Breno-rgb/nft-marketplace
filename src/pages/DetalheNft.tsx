import { useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { useNft, useNfts } from '../hooks/useNfts'
import { useAdicionarAoCarrinho, useCarrinho } from '../hooks/useCarrinho'
import { Dialogo } from '../components/Dialogo'
import { mensagemDeErro } from '../lib/erros'
import { NftCard } from '../components/NftCard'
import { BotaoFavorito } from '../components/BotaoFavorito'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NaoEncontrado } from './NaoEncontrado'
import type { TipoEdicao } from '../types/nft'

const LIMITE_POR_COMPRA = 10

export function DetalheNft() {
  const { id } = useParams({ from: '/nft/$id' })
  const { data: nft, isPending, isError, error, refetch } = useNft(id)
  const [edicao, setEdicao] = useState<TipoEdicao | null>(null)
  const [quantidade, setQuantidade] = useState(1)

  const relacionados = useNfts({ colecao: nft?.colecao, porPagina: 6 })
  const adicionar = useAdicionarAoCarrinho()
  const { data: carrinho } = useCarrinho()
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    if (!nft) return
    const primeiraDisponivel = nft.edicoes.find((e) => e.disponivel > 0)
    setEdicao(primeiraDisponivel?.tipo ?? null)
    setQuantidade(1)
    adicionar.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nft])

  if (isPending) return <DetalheSkeleton />

  if (isError) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return <NaoEncontrado titulo="NFT não encontrado" mensagem="Esse NFT não existe ou foi removido do catálogo." />
    }
    return (
      <main className="mx-auto max-w-6xl px-4 py-20 text-center" role="alert">
        <p>Não foi possível carregar este NFT.</p>
        <button onClick={() => refetch()} className="mt-3 rounded bg-laranja px-4 py-2 text-sm text-fundo">
          Tentar de novo
        </button>
      </main>
    )
  }

  const edicaoEscolhida = nft.edicoes.find((e) => e.tipo === edicao)
  const noCarrinho =
    carrinho?.itens.find((item) => item.nftId === nft.id && item.edicao === edicao)?.quantidade ?? 0
  const maximo = Math.max(0, Math.min(edicaoEscolhida?.disponivel ?? 0, LIMITE_POR_COMPRA) - noCarrinho)

  function adicionarAoCarrinho() {
    if (!edicao) return
    adicionar.mutate(
      { nftId: nft!.id, edicao, quantidade },
      {
        onSuccess: () => setQuantidade(1),
        onSettled: () => setConfirmando(false),
      },
    )
  }

  function clicarEmComprar() {
    adicionar.reset()
    if (noCarrinho > 0) setConfirmando(true)
    else adicionarAoCarrinho()
  }
  const outros = relacionados.data?.itens.filter((item) => item.id !== nft.id).slice(0, 5) ?? []

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Trilha de navegação" className="mb-6 text-xs text-apagado">
        <Link to="/" className="hover:text-laranja">Início</Link>
        <span aria-hidden="true"> / </span>
        <Link to="/" className="hover:text-laranja">Mercado</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{nft.nome}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex gap-3">
          <div className="hidden w-20 flex-col gap-3 sm:flex">
            {[0, 1, 2, 3].map((n) => (
              <img key={n} src={nft.imagem} alt="" className="aspect-square rounded border border-borda object-cover" />
            ))}
          </div>
          <img
            src={nft.imagem}
            alt={nft.nome}
            width={500}
            height={500}
            className="aspect-square w-full rounded-lg border border-borda object-cover"
          />
        </div>

        <div>
          <h1 className="text-2xl font-bold">{nft.nome}</h1>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xl font-bold text-laranja">{nft.precoEth} ETH</p>
            <p className="text-xs text-apagado">
              <span aria-hidden="true" className="text-laranja">★★★★★</span> {nft.avaliacoes} avaliações de colecionadores
            </p>
          </div>

          <h2 className="mt-6 text-sm font-bold">Sobre este NFT:</h2>
          <p className="mt-1 text-sm text-apagado">{nft.descricao}</p>

          <fieldset className="mt-6">
            <legend className="mb-2 text-sm font-bold">Edição:</legend>
            <div className="flex flex-wrap gap-2">
              {nft.edicoes.map((item) => {
                const esgotada = item.disponivel === 0
                return (
                  <button
                    key={item.tipo}
                    type="button"
                    disabled={esgotada}
                    aria-pressed={edicao === item.tipo}
                    onClick={() => {
                      setEdicao(item.tipo)
                      setQuantidade(1)
                      adicionar.reset()
                    }}
                    className={`rounded border px-3 py-1 text-xs disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                      edicao === item.tipo ? 'border-laranja text-laranja' : 'border-borda text-apagado hover:border-laranja'
                    }`}
                  >
                    {item.tipo}
                    {esgotada && <span className="sr-only"> (esgotada)</span>}
                  </button>
                )
              })}
            </div>
            {edicaoEscolhida && (
              <p className="mt-2 text-xs text-apagado">
                {edicaoEscolhida.tipo === 'Aberta' ? 'Edição aberta' : `${edicaoEscolhida.disponivel} disponíve${edicaoEscolhida.disponivel === 1 ? 'l' : 'is'}`}
              </p>
            )}
          </fieldset>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded border border-borda" role="group" aria-label="Quantidade">
              <button
                type="button"
                onClick={() => setQuantidade(quantidade - 1)}
                disabled={quantidade <= 1}
                aria-label="Diminuir quantidade"
                className="h-9 w-9 text-laranja disabled:opacity-40"
              >
                −
              </button>
              <span className="w-8 text-center text-sm" aria-live="polite">{quantidade}</span>
              <button
                type="button"
                onClick={() => setQuantidade(quantidade + 1)}
                disabled={quantidade >= maximo}
                aria-label="Aumentar quantidade"
                className="h-9 w-9 text-laranja disabled:opacity-40"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={!edicao || maximo === 0 || adicionar.isPending}
              onClick={clicarEmComprar}
              className="rounded bg-laranja px-6 py-2 text-sm font-bold text-fundo hover:bg-laranja-escuro disabled:opacity-50"
            >
              {adicionar.isPending ? 'ADICIONANDO...' : 'COMPRAR'}
            </button>
            <BotaoFavorito nftId={nft.id} nome={nft.nome} />
          </div>
          <div aria-live="polite" className="mt-2 min-h-5 text-xs">
            {adicionar.isSuccess && (
              <p className="text-green-400">
                Adicionado ao carrinho. <Link to="/carrinho" className="text-laranja underline">Ver carrinho</Link>
              </p>
            )}
            {adicionar.isError && <p role="alert" className="text-red-400">{mensagemDeErro(adicionar.error)}</p>}
            {!edicao && <p className="text-apagado">Todas as edições estão esgotadas.</p>}
            {edicao && noCarrinho > 0 && !adicionar.isSuccess && (
              <p className="text-apagado">
                Você já tem {noCarrinho} {noCarrinho === 1 ? 'unidade' : 'unidades'} desta edição no carrinho.
                {maximo === 0 && ' Esse é o máximo disponível.'}
              </p>
            )}
          </div>

          <Dialogo
            aberto={confirmando}
            titulo="Este NFT já está no seu carrinho"
            textoConfirmar="Confirmar"
            textoCancelar="Voltar"
            aoConfirmar={adicionarAoCarrinho}
            aoFechar={() => setConfirmando(false)}
            carregando={adicionar.isPending}
          >
            <p>
              Você tem <strong className="text-texto">{noCarrinho}</strong> {noCarrinho === 1 ? 'unidade' : 'unidades'} de{' '}
              <strong className="text-texto">{nft.nome}</strong> (edição {edicao}) no carrinho.
            </p>
            <p className="mt-2">
              Gostaria de adicionar mais <strong className="text-laranja">{quantidade}</strong>? O carrinho vai ficar com{' '}
              {noCarrinho + quantidade}.
            </p>
          </Dialogo>

          <dl className="mt-6 space-y-1 text-xs text-apagado">
            <div><dt className="inline">ID do token: </dt><dd className="inline text-texto">{nft.tokenId}</dd></div>
            <div><dt className="inline">Coleção: </dt><dd className="inline text-texto">{nft.colecao}</dd></div>
            <div><dt className="inline">Rede: </dt><dd className="inline text-texto">{nft.rede}</dd></div>
            <div><dt className="inline">Atributos: </dt><dd className="inline text-texto">{nft.atributos.join(', ')}</dd></div>
          </dl>
        </div>
      </div>

      <Tabs defaultValue="detalhes" className="mt-12">
        <TabsList variant="line" aria-label="Informações do NFT" className="w-full justify-start gap-6 border-b border-borda p-0">
          <TabsTrigger value="detalhes" className="flex-none px-0 pb-2 text-apagado data-active:text-laranja after:bg-laranja">
            Detalhes do NFT
          </TabsTrigger>
          <TabsTrigger value="avaliacoes" className="flex-none px-0 pb-2 text-apagado data-active:text-laranja after:bg-laranja">
            Avaliações de colecionadores ({nft.avaliacoes})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="detalhes" className="mt-4 text-apagado">
          <p>
            {nft.descricao} Rede: {nft.rede}. Contrato verificado.
          </p>
        </TabsContent>
        <TabsContent value="avaliacoes" className="mt-4 text-apagado">
          <p>As avaliações ficam disponíveis para colecionadores autenticados.</p>
        </TabsContent>
      </Tabs>

      {outros.length > 0 && (
        <section className="mt-12" aria-labelledby="titulo-colecao">
          <h2 id="titulo-colecao" className="mb-4 text-lg font-bold text-laranja">Mais desta coleção</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {outros.map((item) => <NftCard key={item.id} nft={item} />)}
          </div>
        </section>
      )}
    </main>
  )
}

function DetalheSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8" aria-busy="true" aria-label="Carregando NFT">
      <div className="mb-6 h-3 w-48 shimmer rounded" />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="shimmer aspect-square w-full rounded-lg" />
        <div className="space-y-4">
          <div className="shimmer h-8 w-2/3 rounded" />
          <div className="shimmer h-6 w-1/4 rounded" />
          <div className="shimmer h-20 w-full rounded" />
          <div className="shimmer h-8 w-1/2 rounded" />
          <div className="shimmer h-10 w-1/3 rounded" />
        </div>
      </div>
    </main>
  )
}
