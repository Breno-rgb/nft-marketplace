import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Campo } from '../components/Campo'
import { ListaDeItens, TabelaDeValores } from '../components/ResumoDeValores'
import { botaoPrincipal, botaoSecundario } from '../components/LayoutDaConta'
import { useCarrinho } from '../hooks/useCarrinho'
import { usePerfil, useCarteiras } from '../hooks/usePerfil'
import { useConectarCarteira, useConexao, useCriarCotacao, useCriarPedido, useDesconectarCarteira } from '../hooks/usePedido'
import { validarComprador, formatarTelefone, type ErrosDeCampo } from '../lib/validacao'
import { errosDosCampos, mensagemDeErro } from '../lib/erros'
import { chaveDaTentativa, lerRascunho, limparCheckout, salvarRascunho, type Rascunho } from '../lib/checkout'
import { abreviarEndereco } from '../lib/formatos'
import { marcarEnvioDePedido, ouvirMudancasDeNft } from '../lib/tempoReal'
import type { Carteira } from '../types/perfil'
import type { Cotacao } from '../types/pedido'
import type { Rede } from '../types/nft'

type Aviso = { tipo: 'erro' | 'atencao'; texto: string; link?: 'carrinho' }

function codigoDoErro(erro: unknown) {
  return isAxiosError<{ codigo?: string }>(erro) ? erro.response?.data?.codigo : undefined
}

function caiuAConexao(erro: unknown) {
  return isAxiosError(erro) && (erro.code === 'ECONNABORTED' || !erro.response)
}

function itensQueMudaram(antiga: Cotacao, nova: Cotacao) {
  return nova.itens
    .filter((item) => {
      const anterior = antiga.itens.find((i) => i.nftId === item.nftId && i.edicao === item.edicao)
      return !anterior || anterior.precoEth !== item.precoEth || anterior.quantidade !== item.quantidade
    })
    .map((item) => `${item.nftId}-${item.edicao}`)
}

export function Pagamento() {
  const carrinho = useCarrinho()
  const perfil = usePerfil()
  const carteiras = useCarteiras()

  if (carrinho.isPending || perfil.isPending || carteiras.isPending) {
    return (
      <Moldura>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]" aria-busy="true" aria-label="Carregando pagamento">
          <div className="flex flex-col gap-6">
            <div className="shimmer h-80 rounded-lg" />
            <div className="shimmer h-64 rounded-lg" />
          </div>
          <div className="shimmer h-72 rounded-lg" />
        </div>
      </Moldura>
    )
  }

  if (carrinho.isError || perfil.isError || carteiras.isError) {
    return (
      <Moldura>
        <div role="alert" className="rounded border border-red-400/60 p-4 text-sm">
          <p>{mensagemDeErro(carrinho.error ?? perfil.error ?? carteiras.error)}</p>
          <button
            type="button"
            onClick={() => {
              carrinho.refetch()
              perfil.refetch()
              carteiras.refetch()
            }}
            className={`${botaoSecundario} mt-3`}
          >
            Tentar de novo
          </button>
        </div>
      </Moldura>
    )
  }

  const rascunho = lerRascunho()
  const principal = carteiras.data.find((c) => c.tipo === 'principal') ?? null
  const inicial: Rascunho = rascunho ?? {
    comprador: { nome: perfil.data.nome, email: perfil.data.email, telefone: '' },
    carteiraId: principal?.id ?? null,
    rede: principal?.rede ?? 'Ethereum',
  }

  return (
    <Moldura>
      <Checkout inicial={inicial} carteiras={carteiras.data} />
    </Moldura>
  )
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Trilha de navegação" className="mb-6 text-xs text-apagado">
        <Link to="/" className="hover:text-laranja">
          Início
        </Link>
        <span aria-hidden="true"> / </span>
        <Link to="/carrinho" className="hover:text-laranja">
          Carrinho
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Pagamento</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold">Pagamento</h1>
      {children}
    </main>
  )
}

function CarrinhoVazio() {
  return (
    <div className="rounded-lg border border-borda p-8 text-center">
      <p className="font-bold">Seu carrinho está vazio.</p>
      <p className="mt-1 text-sm text-apagado">Adicione um NFT para seguir para o pagamento.</p>
      <Link to="/" className={`${botaoPrincipal} mt-5 inline-block`}>
        EXPLORAR NFTS
      </Link>
    </div>
  )
}

function Etapas({ atual }: { atual: 1 | 2 }) {
  const etapas = ['Dados e carteira', 'Revisão e envio']
  return (
    <ol className="mb-6 flex gap-3 text-xs">
      {etapas.map((nome, i) => {
        const numero = i + 1
        const ativa = numero === atual
        return (
          <li key={nome} aria-current={ativa ? 'step' : undefined} className={`flex items-center gap-2 ${ativa ? 'text-laranja' : 'text-apagado'}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${ativa ? 'border-laranja bg-laranja text-fundo' : 'border-borda'}`}>
              {numero < atual ? '✓' : numero}
            </span>
            {nome}
            {numero < etapas.length && <span aria-hidden="true" className="text-borda">—</span>}
          </li>
        )
      })}
    </ol>
  )
}

function Checkout({ inicial, carteiras }: { inicial: Rascunho; carteiras: Carteira[] }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const carrinho = useCarrinho()
  const conexao = useConexao()
  const conectar = useConectarCarteira()
  const desconectar = useDesconectarCarteira()
  const cotar = useCriarCotacao()
  const criarPedido = useCriarPedido()

  const [rascunho, setRascunho] = useState(inicial)
  const [erros, setErros] = useState<ErrosDeCampo>({})
  const [cotacao, setCotacao] = useState<Cotacao | null>(null)
  const [mudancas, setMudancas] = useState<string[]>([])
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [recuperando, setRecuperando] = useState(false)
  const enviando = useRef(false)
  const avisoRef = useRef<HTMLDivElement>(null)

  useEffect(() => salvarRascunho(rascunho), [rascunho])

  // Se um item da revisão muda de preço ou estoque (evento nft.updated), a revisão deixa de valer.
  useEffect(() => {
    if (!cotacao) return
    return ouvirMudancasDeNft((evento) => {
      if (enviando.current || !cotacao.itens.some((item) => item.nftId === evento.nftId)) return
      setCotacao(null)
      setMudancas([])
      setAviso({ tipo: 'atencao', texto: `${evento.nome} mudou enquanto você revisava. Confira o resumo atualizado e revise o pedido de novo.` })
    })
  }, [cotacao])
  useEffect(() => {
    if (aviso) avisoRef.current?.focus()
  }, [aviso])

  const carteira = carteiras.find((c) => c.id === rascunho.carteiraId) ?? null
  const conectada = Boolean(conexao.data && carteira && conexao.data.carteiraId === carteira.id && conexao.data.rede === rascunho.rede)
  const erroDaCarteira = conectada ? undefined : erros.carteira

  function mudarComprador(campo: keyof Rascunho['comprador'], valor: string) {
    setRascunho((atual) => ({ ...atual, comprador: { ...atual.comprador, [campo]: campo === 'telefone' ? formatarTelefone(valor) : valor } }))
  }

  function escolherCarteira(nova: Carteira) {
    setRascunho((atual) => ({ ...atual, carteiraId: nova.id, rede: nova.rede }))
    conectar.reset()
  }

  function mostrarErros(encontrados: ErrosDeCampo) {
    setErros(encontrados)
    const primeiro = Object.keys(encontrados)[0]
    if (primeiro) document.getElementById(primeiro === 'carteira' ? 'secao-carteira' : `comprador-${primeiro}`)?.focus()
    return Boolean(primeiro)
  }

  function revisar(evento: FormEvent) {
    evento.preventDefault()
    setAviso(null)
    const encontrados = validarComprador(rascunho.comprador)
    if (!carteira) encontrados.carteira = 'Escolha uma carteira.'
    else if (!conectada) encontrados.carteira = 'Conecte a carteira para continuar.'
    if (mostrarErros(encontrados)) return

    cotar.mutate(undefined, {
      onSuccess: (nova) => {
        setCotacao(nova)
        setMudancas([])
        window.scrollTo({ top: 0 })
      },
      onError: (erro) =>
        setAviso({ tipo: 'erro', texto: mensagemDeErro(erro), link: codigoDoErro(erro) === 'ESGOTADO' ? 'carrinho' : undefined }),
    })
  }

  function confirmar(automatico = false) {
    if (!cotacao || !carteira || (enviando.current && !automatico)) return
    enviando.current = true
    marcarEnvioDePedido(true)
    const dados = { cotacaoId: cotacao.id, carteiraId: carteira.id, rede: rascunho.rede, comprador: rascunho.comprador }
    const chave = chaveDaTentativa(JSON.stringify(dados))
    setAviso(null)

    criarPedido.mutate(
      { dados, chave },
      {
        onSuccess: (pedido) => {
          enviando.current = false
          marcarEnvioDePedido(false)
          limparCheckout()
          navigate({ to: '/pedidos/$id', params: { id: pedido.id }, replace: true })
        },
        onError: (erro) => {
          const codigo = codigoDoErro(erro)
          if (caiuAConexao(erro) && !automatico) {
            setRecuperando(true)
            confirmar(true)
            return
          }
          enviando.current = false
          marcarEnvioDePedido(false)
          setRecuperando(false)

          if (caiuAConexao(erro)) {
            setAviso({ tipo: 'erro', texto: 'Não conseguimos confirmar o envio. Toque em confirmar de novo: se o pedido já foi criado, ele será recuperado, sem compra duplicada.' })
          } else if (codigo === 'COTACAO_DESATUALIZADA' && isAxiosError<{ cotacao: Cotacao; mensagem: string }>(erro) && erro.response?.data.cotacao) {
            const nova = erro.response.data.cotacao
            setMudancas(itensQueMudaram(cotacao, nova))
            setCotacao(nova)
            setAviso({ tipo: 'atencao', texto: `${erro.response.data.mensagem} Total agora: ${nova.resumo.totalEth} ETH.` })
            queryClient.invalidateQueries({ queryKey: ['carrinho'] })
          } else if (codigo === 'ESGOTADO') {
            setAviso({ tipo: 'erro', texto: mensagemDeErro(erro), link: 'carrinho' })
            queryClient.invalidateQueries({ queryKey: ['carrinho'] })
          } else if (codigo === 'CARTEIRA_DESCONECTADA') {
            queryClient.invalidateQueries({ queryKey: ['conexao'] })
            setCotacao(null)
            setErros({ carteira: mensagemDeErro(erro) })
            setAviso({ tipo: 'erro', texto: mensagemDeErro(erro) })
          } else if (codigo === 'VALIDACAO') {
            setCotacao(null)
            mostrarErros(errosDosCampos(erro))
          } else {
            setAviso({ tipo: 'erro', texto: mensagemDeErro(erro) })
          }
        },
      },
    )
  }

  const caixaDeAviso = aviso && (
    <div
      ref={avisoRef}
      tabIndex={-1}
      role="alert"
      className={`mb-6 rounded border p-4 text-sm focus:outline-none ${aviso.tipo === 'erro' ? 'border-red-400/60 bg-red-400/10' : 'border-laranja/60 bg-laranja/10'}`}
    >
      <p>{aviso.texto}</p>
      {aviso.link === 'carrinho' && (
        <Link to="/carrinho" className="mt-2 inline-block text-laranja underline">
          Ajustar carrinho
        </Link>
      )}
    </div>
  )

  if (cotacao) {
    const enviandoAgora = criarPedido.isPending || recuperando
    return (
      <>
        <Etapas atual={2} />
        {caixaDeAviso}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-6">
            <section aria-labelledby="titulo-revisao-itens" className="rounded-lg border border-borda bg-superficie p-5 md:p-6">
              <h2 id="titulo-revisao-itens" className="text-lg font-bold">
                Itens
              </h2>
              <ListaDeItens itens={cotacao.itens} destaques={mudancas} />
            </section>
            <section aria-labelledby="titulo-revisao-dados" className="rounded-lg border border-borda bg-superficie p-5 md:p-6">
              <div className="flex items-center justify-between">
                <h2 id="titulo-revisao-dados" className="text-lg font-bold">
                  Dados e carteira
                </h2>
                <button type="button" disabled={enviandoAgora} onClick={() => setCotacao(null)} className="text-sm text-laranja underline disabled:opacity-50">
                  Alterar
                </button>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-apagado">Colecionador</dt>
                  <dd>{rascunho.comprador.nome}</dd>
                  <dd className="text-apagado">{rascunho.comprador.email}</dd>
                  <dd className="text-apagado">{rascunho.comprador.telefone}</dd>
                </div>
                <div>
                  <dt className="text-xs text-apagado">Carteira</dt>
                  <dd>{carteira?.apelido}</dd>
                  <dd className="text-apagado">
                    {carteira && abreviarEndereco(carteira.endereco)} · {rascunho.rede}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
          <aside aria-labelledby="titulo-revisao-total" className="h-fit rounded-lg border border-borda bg-superficie p-5 md:p-6 lg:sticky lg:top-6">
            <h2 id="titulo-revisao-total" className="mb-4 text-lg font-bold">
              Total do pedido
            </h2>
            <TabelaDeValores resumo={cotacao.resumo} cupom={cotacao.cupom} />
            <p className="mt-4 text-xs text-apagado">
              Valores garantidos até {new Date(cotacao.expiraEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Antes de enviar, conferimos preço,
              disponibilidade, cupom e taxa de novo.
            </p>
            <button type="button" onClick={() => confirmar()} disabled={enviandoAgora} className={`${botaoPrincipal} mt-5 w-full`}>
              {recuperando ? 'VERIFICANDO PEDIDO...' : criarPedido.isPending ? 'ENVIANDO...' : mudancas.length ? 'CONFIRMAR NOVO VALOR' : 'CONFIRMAR COMPRA'}
            </button>
            <p aria-live="polite" className="mt-2 min-h-4 text-center text-xs text-apagado">
              {recuperando ? 'A conexão caiu. Estamos recuperando seu pedido sem criar outro.' : ''}
            </p>
          </aside>
        </div>
      </>
    )
  }

  if (carrinho.data && carrinho.data.itens.length === 0) return <CarrinhoVazio />

  return (
    <>
      <Etapas atual={1} />
      {caixaDeAviso}
      <form onSubmit={revisar} noValidate className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="titulo-comprador" className="rounded-lg border border-borda bg-superficie p-5 md:p-6">
            <h2 id="titulo-comprador" className="text-lg font-bold">
              Seus dados
            </h2>
            <p className="mt-1 text-sm text-apagado">Usados no recibo do pedido.</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Campo id="comprador-nome" rotulo="Nome completo" autoComplete="name" value={rascunho.comprador.nome} onChange={(e) => mudarComprador('nome', e.target.value)} erro={erros.nome} />
              <Campo id="comprador-email" rotulo="Email" type="email" autoComplete="email" value={rascunho.comprador.email} onChange={(e) => mudarComprador('email', e.target.value)} erro={erros.email} />
              <Campo
                id="comprador-telefone"
                rotulo="Telefone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 91234-5678"
                value={rascunho.comprador.telefone}
                onChange={(e) => mudarComprador('telefone', e.target.value)}
                erro={erros.telefone}
              />
            </div>
          </section>

          <section
            id="secao-carteira"
            tabIndex={-1}
            aria-labelledby="titulo-carteira"
            aria-describedby={erroDaCarteira ? 'carteira-erro' : undefined}
            className={`rounded-lg border bg-superficie p-5 focus:outline-none md:p-6 ${erroDaCarteira ? 'border-red-400' : 'border-borda'}`}
          >
            <h2 id="titulo-carteira" className="text-lg font-bold">
              Carteira e rede
            </h2>
            {carteiras.length === 0 ? (
              <div className="mt-4 rounded border border-dashed border-borda p-4 text-sm">
                <p className="text-apagado">Você ainda não tem carteira cadastrada.</p>
                <Link to="/carteiras" className="mt-2 inline-block text-laranja underline">
                  Cadastrar carteira
                </Link>
              </div>
            ) : (
              <>
                <fieldset className="mt-4">
                  <legend className="text-sm font-bold">Carteira</legend>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {carteiras.map((opcao) => (
                      <label
                        key={opcao.id}
                        className={`flex cursor-pointer items-start gap-3 rounded border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-laranja ${
                          opcao.id === rascunho.carteiraId ? 'border-laranja' : 'border-borda'
                        }`}
                      >
                        <input type="radio" name="carteira" checked={opcao.id === rascunho.carteiraId} onChange={() => escolherCarteira(opcao)} className="mt-1 accent-laranja" />
                        <span>
                          <span className="block font-bold">{opcao.apelido}</span>
                          <span className="block text-xs text-apagado">
                            {abreviarEndereco(opcao.endereco)} · {opcao.tipo === 'principal' ? 'principal' : 'secundária'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="mt-5">
                  <legend className="text-sm font-bold">Rede</legend>
                  <div className="mt-2 flex gap-3">
                    {(['Ethereum', 'Polygon'] as Rede[]).map((rede) => (
                      <label
                        key={rede}
                        className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-laranja ${
                          rascunho.rede === rede ? 'border-laranja text-laranja' : 'border-borda'
                        }`}
                      >
                        <input type="radio" name="rede" checked={rascunho.rede === rede} onChange={() => setRascunho((atual) => ({ ...atual, rede }))} className="accent-laranja" />
                        {rede}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-5 flex flex-wrap items-center gap-3" aria-live="polite">
                  {conectada ? (
                    <>
                      <span className="text-sm text-green-400">
                        <span aria-hidden="true">✓ </span>Carteira conectada na rede {rascunho.rede}
                      </span>
                      <button type="button" disabled={desconectar.isPending} onClick={() => desconectar.mutate()} className={botaoSecundario}>
                        {desconectar.isPending ? 'Desconectando...' : 'Desconectar'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={!carteira || conectar.isPending}
                      onClick={() => carteira && conectar.mutate({ carteiraId: carteira.id, rede: rascunho.rede })}
                      className={botaoSecundario}
                    >
                      {conectar.isPending ? 'Aguardando aprovação na carteira...' : 'Conectar carteira'}
                    </button>
                  )}
                </div>
                {conectar.isError && !conectada && (
                  <p role="alert" className="mt-2 text-xs text-red-300">
                    {mensagemDeErro(conectar.error)}
                  </p>
                )}
                <p className="mt-3 text-xs text-apagado">Conexão simulada: nenhuma extensão de carteira é aberta.</p>
              </>
            )}
            {erroDaCarteira && (
              <p id="carteira-erro" className="mt-3 text-xs text-red-300">
                <span aria-hidden="true">⚠ </span>
                {erroDaCarteira}
              </p>
            )}
          </section>
        </div>

        <aside aria-labelledby="titulo-resumo-pagamento" className="h-fit rounded-lg border border-borda bg-superficie p-5 md:p-6 lg:sticky lg:top-6">
          <h2 id="titulo-resumo-pagamento" className="mb-4 text-lg font-bold">
            Resumo
          </h2>
          {carrinho.data && (
            <>
              <ListaDeItens itens={carrinho.data.itens} />
              <div className="mt-4">
                <TabelaDeValores resumo={carrinho.data.resumo} cupom={carrinho.data.cupom} />
              </div>
            </>
          )}
          <button type="submit" disabled={cotar.isPending || conexao.isPending} className={`${botaoPrincipal} mt-5 w-full`}>
            {cotar.isPending ? 'CALCULANDO...' : 'REVISAR PEDIDO'}
          </button>
        </aside>
      </form>
    </>
  )
}
