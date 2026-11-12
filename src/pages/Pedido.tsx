import { useEffect, useRef } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { usePedido } from '../hooks/usePedido'
import { ListaDeItens, TabelaDeValores } from '../components/ResumoDeValores'
import { botaoPrincipal, botaoSecundario } from '../lib/estilosDeBotao'
import { NaoEncontrado } from './NaoEncontrado'
import { mensagemDeErro, statusDoErro } from '../lib/erros'
import { avisar } from '../lib/avisos'
import { abreviarEndereco } from '../lib/formatos'
import { useEstadoDoTempoReal } from '../lib/tempoReal'
import type { Pedido as TipoPedido } from '../types/pedido'

export function Pedido() {
  const { id } = useParams({ from: '/autenticado/pedidos/$id' })
  const pedido = usePedido(id)
  const queryClient = useQueryClient()
  const statusAnterior = useRef<string | undefined>(undefined)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const status = pedido.data?.status

  useEffect(() => {
    if (!status) return
    if (statusAnterior.current === 'pendente' && status !== 'pendente') {
      avisar(status === 'confirmado' ? 'Pagamento confirmado!' : 'Pagamento recusado.', status === 'confirmado' ? 'sucesso' : 'erro')
      tituloRef.current?.focus()
    }
    if (status === 'confirmado') {
      queryClient.invalidateQueries({ queryKey: ['carrinho'] })
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
      queryClient.invalidateQueries({ queryKey: ['nft'] })
    }
    statusAnterior.current = status
  }, [status, queryClient])

  if (pedido.isPending) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10" aria-busy="true" aria-label="Carregando pedido">
        <div className="shimmer h-10 w-2/3 rounded" />
        <div className="shimmer mt-6 h-96 rounded-lg" />
      </main>
    )
  }

  if (pedido.isError) {
    const codigo = statusDoErro(pedido.error)
    if (codigo === 404 || codigo === 403) {
      return <NaoEncontrado titulo="Pedido não encontrado" mensagem={mensagemDeErro(pedido.error)} />
    }
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div role="alert" className="rounded border border-red-400/60 p-4 text-sm">
          <p>{mensagemDeErro(pedido.error)}</p>
          <button type="button" onClick={() => pedido.refetch()} className={`${botaoSecundario} mt-3`}>
            Tentar de novo
          </button>
        </div>
      </main>
    )
  }

  const dados = pedido.data

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {dados.status === 'pendente' && <Pendente pedido={dados} tituloRef={tituloRef} />}
      {dados.status === 'recusado' && <Recusado pedido={dados} tituloRef={tituloRef} />}
      {dados.status === 'confirmado' && <Recibo pedido={dados} tituloRef={tituloRef} />}
    </main>
  )
}

type Props = { pedido: TipoPedido; tituloRef: React.RefObject<HTMLHeadingElement | null> }

function Pendente({ pedido, tituloRef }: Props) {
  const tempoReal = useEstadoDoTempoReal()
  return (
    <section aria-labelledby="titulo-pedido" className="rounded-lg border border-borda bg-superficie p-6 text-center md:p-10">
      <span aria-hidden="true" className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-borda border-t-laranja motion-reduce:animate-none" />
      <h1 id="titulo-pedido" ref={tituloRef} tabIndex={-1} className="mt-6 text-2xl font-bold focus:outline-none">
        Aguardando confirmação da rede
      </h1>
      <p className="mt-2 text-sm text-apagado" aria-live="polite">
        Seu pedido foi enviado e está pendente. Pode fechar ou atualizar a página: o pedido continua e esta tela volta ao estado certo.
      </p>
      <dl className="mx-auto mt-6 grid max-w-sm grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-left text-sm">
        <dt className="text-apagado">Pedido</dt>
        <dd>{pedido.id}</dd>
        <dt className="text-apagado">Transação</dt>
        <dd className="truncate" title={pedido.transacao.hash}>
          {abreviarEndereco(pedido.transacao.hash)}
        </dd>
        <dt className="text-apagado">Total</dt>
        <dd>{pedido.resumo.totalEth} ETH</dd>
      </dl>
      <p className="mt-6 text-xs text-apagado">
        <span aria-hidden="true" className={`mr-2 inline-block h-2 w-2 rounded-full ${tempoReal === 'conectado' ? 'bg-green-400' : 'bg-laranja'}`} />
        {tempoReal === 'conectado' ? 'Atualização em tempo real ativa' : 'Reconectando… consultando o status a cada 1,5 s'}
      </p>
    </section>
  )
}

function Recusado({ pedido, tituloRef }: Props) {
  return (
    <section aria-labelledby="titulo-pedido" className="rounded-lg border border-red-400/60 bg-superficie p-6 text-center md:p-10">
      <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-400/15 text-2xl text-red-300">
        ✕
      </span>
      <h1 id="titulo-pedido" ref={tituloRef} tabIndex={-1} className="mt-6 text-2xl font-bold focus:outline-none">
        Pagamento recusado
      </h1>
      <p className="mt-2 text-sm text-apagado">{pedido.motivoRecusa}</p>
      <p className="mt-1 text-xs text-apagado">Pedido {pedido.id}. Nenhum valor foi cobrado.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/pagamento" className={botaoPrincipal}>
          TENTAR DE NOVO
        </Link>
        <Link to="/carrinho" className={botaoSecundario}>
          Ver carrinho
        </Link>
      </div>
    </section>
  )
}

function Recibo({ pedido, tituloRef }: Props) {
  const data = new Date(pedido.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  return (
    <>
      <div className="text-center">
        <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-laranja text-2xl font-bold text-fundo">
          ✓
        </span>
        <h1 id="titulo-pedido" ref={tituloRef} tabIndex={-1} className="mt-4 text-2xl font-bold focus:outline-none">
          Compra confirmada!
        </h1>
        <p className="mt-1 text-sm text-apagado">Os NFTs já estão na sua carteira “{pedido.carteira.apelido}”.</p>
      </div>

      <section aria-labelledby="titulo-recibo" className="mt-8 rounded-lg border border-borda bg-superficie p-5 md:p-6">
        <h2 id="titulo-recibo" className="text-lg font-bold">
          Recibo
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-apagado">Pedido</dt>
            <dd>{pedido.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-apagado">Data</dt>
            <dd>{data}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-apagado">Transação (simulada)</dt>
            <dd className="break-all">{pedido.transacao.hash}</dd>
          </div>
          <div>
            <dt className="text-xs text-apagado">Bloco</dt>
            <dd>{pedido.transacao.bloco?.toLocaleString('pt-BR')}</dd>
          </div>
          <div>
            <dt className="text-xs text-apagado">Rede</dt>
            <dd>{pedido.rede}</dd>
          </div>
          <div>
            <dt className="text-xs text-apagado">Carteira</dt>
            <dd>
              {pedido.carteira.apelido} · {abreviarEndereco(pedido.carteira.endereco)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-apagado">Colecionador</dt>
            <dd>{pedido.comprador.nome}</dd>
            <dd className="text-apagado">{pedido.comprador.email}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-apagado">Explorador de blocos indisponível: a transação é simulada e não existe numa rede real.</p>

        <h3 className="mt-8 text-sm font-bold">Itens</h3>
        <ListaDeItens itens={pedido.itens} />
        <div className="mt-4">
          <TabelaDeValores resumo={pedido.resumo} cupom={pedido.cupom} />
        </div>
      </section>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className={botaoPrincipal}>
          CONTINUAR EXPLORANDO
        </Link>
        <button type="button" onClick={() => window.print()} className={botaoSecundario}>
          Imprimir recibo
        </button>
      </div>
    </>
  )
}
