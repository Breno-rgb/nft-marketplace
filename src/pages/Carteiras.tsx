import { useState, type FormEvent } from 'react'
import { Campo } from '../components/Campo'
import { Dialogo } from '../components/Dialogo'
import { botaoPrincipal, botaoSecundario, LayoutDaConta } from '../components/LayoutDaConta'
import { useAtualizarCarteira, useCadastrarCarteira, useCarteiras, useRemoverCarteira } from '../hooks/usePerfil'
import { validarCarteira, type ErrosDeCampo } from '../lib/validacao'
import { errosDosCampos, mensagemDeErro } from '../lib/erros'
import { avisar } from '../lib/avisos'
import { abreviarEndereco } from '../lib/formatos'
import type { Carteira, DadosDaCarteira, TipoDeCarteira } from '../types/perfil'
import type { Rede } from '../types/nft'

const nomeDoTipo: Record<TipoDeCarteira, string> = {
  principal: 'Carteira principal',
  secundaria: 'Carteira secundária',
}

export function Carteiras() {
  const carteiras = useCarteiras()

  return (
    <LayoutDaConta titulo="Minha conta">
      <p className="max-w-2xl text-sm text-apagado">
        Cadastre até duas carteiras. A principal vem selecionada no pagamento, e a secundária fica como alternativa. Os endereços são
        simulados: nenhuma carteira real é conectada.
      </p>
      <div className="mt-6">
        {carteiras.isPending ? (
          <div className="grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Carregando carteiras">
            <div className="shimmer h-56 rounded-lg" />
            <div className="shimmer h-56 rounded-lg" />
          </div>
        ) : carteiras.isError ? (
          <div role="alert" className="rounded border border-red-400/60 p-4 text-sm">
            <p>{mensagemDeErro(carteiras.error)}</p>
            <button type="button" onClick={() => carteiras.refetch()} className={`${botaoSecundario} mt-3`}>
              Tentar de novo
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {(['principal', 'secundaria'] as const).map((tipo) => (
              <EspacoDeCarteira
                key={tipo}
                tipo={tipo}
                carteira={carteiras.data.find((c) => c.tipo === tipo)}
                temPrincipal={carteiras.data.some((c) => c.tipo === 'principal')}
              />
            ))}
          </div>
        )}
      </div>
    </LayoutDaConta>
  )
}

function EspacoDeCarteira({ tipo, carteira, temPrincipal }: { tipo: TipoDeCarteira; carteira?: Carteira; temPrincipal: boolean }) {
  const [editando, setEditando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const cadastrar = useCadastrarCarteira()
  const atualizar = useAtualizarCarteira()
  const remover = useRemoverCarteira()
  const tituloId = `titulo-${tipo}`

  function salvar(dados: DadosDaCarteira, aoFalhar: (erro: unknown) => void) {
    const opcoes = {
      onSuccess: () => {
        setEditando(false)
        avisar(carteira ? 'Carteira atualizada.' : 'Carteira cadastrada.', 'sucesso')
      },
      onError: aoFalhar,
    }
    if (carteira) atualizar.mutate({ id: carteira.id, dados }, opcoes)
    else cadastrar.mutate(dados, opcoes)
  }

  function tornarPrincipal() {
    if (!carteira) return
    atualizar.mutate(
      { id: carteira.id, dados: { tipo: 'principal' } },
      {
        onSuccess: () => avisar(`"${carteira.apelido}" agora é a carteira principal.`, 'sucesso'),
        onError: (erro) => avisar(mensagemDeErro(erro), 'erro'),
      },
    )
  }

  function confirmarRemocao() {
    if (!carteira) return
    remover.mutate(carteira.id, {
      onSuccess: () => avisar('Carteira removida.', 'info'),
      onError: (erro) => avisar(mensagemDeErro(erro), 'erro'),
      onSettled: () => setRemovendo(false),
    })
  }

  return (
    <section aria-labelledby={tituloId} className="flex flex-col rounded-lg border border-borda bg-superficie p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id={tituloId} className="text-lg font-bold">
          {nomeDoTipo[tipo]}
        </h2>
        {tipo === 'principal' && carteira && <span className="rounded bg-laranja/15 px-2 py-0.5 text-xs text-laranja">Usada no pagamento</span>}
      </div>

      {editando ? (
        <FormularioDeCarteira
          tipo={tipo}
          inicial={carteira}
          salvando={cadastrar.isPending || atualizar.isPending}
          aoSalvar={salvar}
          aoCancelar={() => setEditando(false)}
        />
      ) : carteira ? (
        <>
          <dl className="mt-5 grid gap-3 text-sm">
            <div>
              <dt className="text-xs text-apagado">Apelido</dt>
              <dd className="font-bold">{carteira.apelido}</dd>
            </div>
            <div>
              <dt className="text-xs text-apagado">Endereço</dt>
              <dd title={carteira.endereco}>
                <span aria-hidden="true">{abreviarEndereco(carteira.endereco)}</span>
                <span className="sr-only">{carteira.endereco}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-apagado">Rede</dt>
              <dd>{carteira.rede}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditando(true)} className={botaoSecundario}>
              Editar
            </button>
            {tipo === 'secundaria' && (
              <>
                <button type="button" onClick={tornarPrincipal} disabled={atualizar.isPending} className={botaoSecundario}>
                  {atualizar.isPending ? 'Trocando...' : 'Tornar principal'}
                </button>
                <button type="button" onClick={() => setRemovendo(true)} className={`${botaoSecundario} hover:border-red-400 hover:text-red-300`}>
                  Remover
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="mt-5 flex flex-1 flex-col items-start justify-between gap-4 rounded border border-dashed border-borda p-4">
          <p className="text-sm text-apagado">
            {tipo === 'secundaria' && !temPrincipal ? 'Cadastre a carteira principal primeiro.' : 'Nenhuma carteira cadastrada aqui.'}
          </p>
          <button type="button" disabled={tipo === 'secundaria' && !temPrincipal} onClick={() => setEditando(true)} className={botaoPrincipal}>
            ADICIONAR CARTEIRA
          </button>
        </div>
      )}

      <Dialogo
        aberto={removendo}
        titulo="Remover carteira secundária?"
        textoConfirmar="Remover"
        carregando={remover.isPending}
        aoConfirmar={confirmarRemocao}
        aoFechar={() => setRemovendo(false)}
      >
        <p>
          A carteira <strong>{carteira?.apelido}</strong> deixa de aparecer no pagamento. Você pode cadastrá-la de novo depois.
        </p>
      </Dialogo>
    </section>
  )
}

type PropsDoFormulario = {
  tipo: TipoDeCarteira
  inicial?: Carteira
  salvando: boolean
  aoSalvar: (dados: DadosDaCarteira, aoFalhar: (erro: unknown) => void) => void
  aoCancelar: () => void
}

function FormularioDeCarteira({ tipo, inicial, salvando, aoSalvar, aoCancelar }: PropsDoFormulario) {
  const [dados, setDados] = useState({
    apelido: inicial?.apelido ?? '',
    endereco: inicial?.endereco ?? '',
    rede: (inicial?.rede ?? 'Ethereum') as Rede,
  })
  const [erros, setErros] = useState<ErrosDeCampo>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const prefixo = `carteira-${tipo}`

  function focar(encontrados: ErrosDeCampo) {
    const primeiro = Object.keys(encontrados)[0]
    if (primeiro) document.getElementById(`${prefixo}-${primeiro}`)?.focus()
    return Boolean(primeiro)
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const encontrados = validarCarteira(dados)
    setErros(encontrados)
    setErroGeral(null)
    if (focar(encontrados)) return
    aoSalvar({ ...dados, apelido: dados.apelido.trim(), endereco: dados.endereco.trim(), tipo }, (erro) => {
      const campos = errosDosCampos(erro)
      setErros(campos)
      if (!focar(campos)) setErroGeral(mensagemDeErro(erro))
    })
  }

  return (
    <form onSubmit={enviar} noValidate className="mt-5 flex flex-col gap-5">
      {erroGeral && (
        <p role="alert" className="rounded border border-red-400/60 bg-red-400/10 p-3 text-sm">
          {erroGeral}
        </p>
      )}
      <Campo
        id={`${prefixo}-apelido`}
        rotulo="Apelido"
        placeholder="Ex.: Carteira de compras"
        maxLength={40}
        value={dados.apelido}
        onChange={(e) => setDados({ ...dados, apelido: e.target.value })}
        erro={erros.apelido}
      />
      <Campo
        id={`${prefixo}-endereco`}
        rotulo="Endereço"
        placeholder="0x..."
        spellCheck={false}
        autoComplete="off"
        dica="Começa com 0x, seguido de 40 caracteres."
        value={dados.endereco}
        onChange={(e) => setDados({ ...dados, endereco: e.target.value })}
        erro={erros.endereco}
      />
      <fieldset>
        <legend className="text-sm font-bold">Rede</legend>
        <div className="mt-2 flex gap-3">
          {(['Ethereum', 'Polygon'] as const).map((rede) => (
            <label
              key={rede}
              className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-laranja ${
                dados.rede === rede ? 'border-laranja text-laranja' : 'border-borda'
              }`}
            >
              <input type="radio" name={`${prefixo}-rede`} value={rede} checked={dados.rede === rede} onChange={() => setDados({ ...dados, rede })} className="accent-laranja" />
              {rede}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={aoCancelar} className={botaoSecundario}>
          Cancelar
        </button>
        <button type="submit" disabled={salvando} className={botaoPrincipal}>
          {salvando ? 'SALVANDO...' : 'SALVAR CARTEIRA'}
        </button>
      </div>
    </form>
  )
}
