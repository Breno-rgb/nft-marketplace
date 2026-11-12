import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  useAlterarQuantidade,
  useAplicarCupom,
  useCarrinho,
  useRemoverCupom,
  useRemoverItem,
} from '../hooks/useCarrinho'
import { useNfts } from '../hooks/useNfts'
import { NftCard } from '../components/NftCard'
import { mensagemDeErro } from '../lib/erros'
import type { ItemDoCarrinho } from '../types/carrinho'

export function Carrinho() {
  const { data: carrinho, isPending, isError, refetch } = useCarrinho()
  const sugestoes = useNfts({ porPagina: 5, ordenar: 'menor-preco' })

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Trilha de navegação" className="mb-6 text-xs text-apagado">
        <Link to="/" className="hover:text-laranja">Início</Link>
        <span aria-hidden="true"> / </span>
        <Link to="/" className="hover:text-laranja">Mercado</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Carrinho</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold">Carrinho</h1>

      {isPending && <CarrinhoSkeleton />}

      {isError && (
        <div role="alert" className="rounded border border-borda p-6 text-center">
          <p>Não foi possível carregar o carrinho.</p>
          <button onClick={() => refetch()} className="mt-3 rounded bg-laranja px-4 py-2 text-sm text-fundo">
            Tentar de novo
          </button>
        </div>
      )}

      {carrinho && carrinho.itens.length === 0 && (
        <div className="rounded border border-borda p-10 text-center">
          <p className="text-apagado">Seu carrinho está vazio.</p>
          <Link to="/" className="mt-4 inline-block rounded bg-laranja px-4 py-2 text-sm text-fundo">
            Explorar NFTs
          </Link>
        </div>
      )}

      {carrinho && carrinho.itens.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <section aria-label="Itens do carrinho">
            <div className="mb-2 hidden grid-cols-[1fr_100px_120px_110px_40px] gap-4 border-b border-borda pb-2 text-xs text-apagado md:grid">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
              <span className="sr-only">Remover</span>
            </div>
            <ul className="divide-y divide-borda">
              {carrinho.itens.map((item) => (
                <LinhaDoCarrinho key={item.id} item={item} />
              ))}
            </ul>
          </section>

          <ResumoDoCarrinho />
        </div>
      )}

      {sugestoes.data && (
        <section className="mt-12" aria-labelledby="titulo-sugestoes">
          <h2 id="titulo-sugestoes" className="mb-4 text-lg font-bold text-laranja">Colecionadores também viram</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {sugestoes.data.itens.map((nft) => <NftCard key={nft.id} nft={nft} />)}
          </div>
        </section>
      )}
    </main>
  )
}

function LinhaDoCarrinho({ item }: { item: ItemDoCarrinho }) {
  const alterar = useAlterarQuantidade()
  const remover = useRemoverItem()
  const erro = alterar.error ?? remover.error

  return (
    <li className="py-4">
      <div className="grid grid-cols-[64px_1fr] gap-4 md:grid-cols-[1fr_100px_120px_110px_40px] md:items-center">
        <div className="flex items-center gap-3 md:col-span-1">
          <img src={item.imagem} alt="" width={56} height={56} className="h-14 w-14 rounded object-cover" />
          <div className="hidden md:block">
            <Link to="/nft/$id" params={{ id: item.nftId }} className="text-sm hover:text-laranja">{item.nome}</Link>
            <p className="text-xs text-apagado">ID do token: {item.tokenId} · Edição {item.edicao}</p>
          </div>
        </div>
        <div className="md:hidden">
          <Link to="/nft/$id" params={{ id: item.nftId }} className="text-sm hover:text-laranja">{item.nome}</Link>
          <p className="text-xs text-apagado">Edição {item.edicao} · {item.precoEth} ETH</p>
        </div>

        <p className="hidden text-sm md:block">{item.precoEth} ETH</p>

        <div className="col-span-2 flex items-center justify-between gap-4 md:col-span-1 md:contents">
          <div className="flex items-center rounded border border-borda" role="group" aria-label={`Quantidade de ${item.nome}`}>
            <button
              type="button"
              onClick={() => alterar.mutate({ itemId: item.id, quantidade: item.quantidade - 1 })}
              disabled={item.quantidade <= 1}
              aria-label="Diminuir quantidade"
              className="h-8 w-8 text-laranja disabled:opacity-40"
            >
              −
            </button>
            <span className="w-8 text-center text-sm" aria-live="polite">{item.quantidade}</span>
            <button
              type="button"
              onClick={() => alterar.mutate({ itemId: item.id, quantidade: item.quantidade + 1 })}
              disabled={item.quantidade >= item.disponivel}
              aria-label="Aumentar quantidade"
              className="h-8 w-8 text-laranja disabled:opacity-40"
            >
              +
            </button>
          </div>
          <p className="text-sm font-bold text-laranja">{item.totalEth} ETH</p>
          <button
            type="button"
            onClick={() => remover.mutate(item.id)}
            aria-label={`Remover ${item.nome} do carrinho`}
            className="flex h-8 w-8 items-center justify-center rounded text-apagado hover:text-red-400"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
          </button>
        </div>
      </div>
      {erro && (
        <p role="alert" className="mt-2 text-xs text-red-400">{mensagemDeErro(erro)}</p>
      )}
    </li>
  )
}

function ResumoDoCarrinho() {
  const { data: carrinho, isFetching } = useCarrinho()
  const aplicar = useAplicarCupom()
  const removerCupom = useRemoverCupom()
  const [codigo, setCodigo] = useState('')

  if (!carrinho) return null
  const { resumo, cupom } = carrinho

  function enviarCupom(evento: React.FormEvent) {
    evento.preventDefault()
    if (!codigo.trim()) return
    aplicar.mutate(codigo, { onSuccess: () => setCodigo('') })
  }

  return (
    <aside aria-labelledby="titulo-resumo" className="h-fit rounded-lg border border-borda bg-superficie p-5">
      <h2 id="titulo-resumo" className="mb-4 font-bold">Resumo da carteira</h2>

      {cupom ? (
        <div className="mb-4 flex items-center justify-between rounded border border-laranja px-3 py-2 text-sm">
          <span>Cupom <strong>{cupom.codigo}</strong> (−{cupom.percentual}%)</span>
          <button
            type="button"
            onClick={() => removerCupom.mutate()}
            disabled={removerCupom.isPending}
            className="text-xs text-laranja underline"
          >
            Remover
          </button>
        </div>
      ) : (
        <form onSubmit={enviarCupom} noValidate className="mb-4">
          <label htmlFor="cupom" className="mb-1 block text-xs text-apagado">Código promocional</label>
          <div className="flex">
            <input
              id="cupom"
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value)
                aplicar.reset()
              }}
              placeholder="Digite o código"
              aria-invalid={aplicar.isError}
              aria-describedby={aplicar.isError ? 'erro-cupom' : undefined}
              className="w-full rounded-l border border-borda bg-fundo px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={aplicar.isPending}
              className="rounded-r bg-laranja px-3 text-sm text-fundo disabled:opacity-50"
            >
              {aplicar.isPending ? '...' : 'Aplicar'}
            </button>
          </div>
          {aplicar.isError && (
            <p id="erro-cupom" role="alert" className="mt-1 text-xs text-red-400">{mensagemDeErro(aplicar.error)}</p>
          )}
        </form>
      )}

      <dl className={`space-y-2 text-sm ${isFetching ? 'opacity-60' : ''}`} aria-live="polite">
        <div className="flex justify-between"><dt className="text-apagado">Subtotal</dt><dd>{resumo.subtotalEth} ETH</dd></div>
        <div className="flex justify-between"><dt className="text-apagado">Desconto</dt><dd>(−) {resumo.descontoEth} ETH</dd></div>
        <div className="flex justify-between"><dt className="text-apagado">Taxa de rede</dt><dd>{resumo.taxaRedeEth} ETH</dd></div>
        <div className="flex justify-between border-t border-borda pt-2 font-bold">
          <dt>Total</dt><dd className="text-laranja">{resumo.totalEth} ETH</dd>
        </div>
      </dl>

      <Link to="/pagamento" className="mt-5 block w-full rounded bg-laranja py-2 text-center text-sm font-bold text-fundo hover:bg-laranja-escuro">
        Conectar e finalizar
      </Link>
      <Link to="/" className="mt-3 block text-center text-xs text-laranja underline">Continuar explorando</Link>
    </aside>
  )
}

function CarrinhoSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]" aria-busy="true" aria-label="Carregando carrinho">
      <div className="space-y-4">
        {[0, 1, 2].map((n) => <div key={n} className="shimmer h-16 rounded" />)}
      </div>
      <div className="shimmer h-72 rounded-lg" />
    </div>
  )
}
