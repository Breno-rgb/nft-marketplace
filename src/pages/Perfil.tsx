import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useQueries } from '@tanstack/react-query'
import { buscarNft } from '../api/nfts'
import { NftCard, NftCardSkeleton } from '../components/NftCard'
import { Avatar } from '../components/Avatar'
import { Campo } from '../components/Campo'
import { Cartao, LayoutDaConta } from '../components/LayoutDaConta'
import { botaoPrincipal, botaoSecundario } from '../lib/estilosDeBotao'
import { useFavoritos } from '../hooks/useFavoritos'
import { useAlterarSenha, useApagarConta, useAtualizarPerfil, useEnviarAvatar, usePerfil, useRemoverAvatar } from '../hooks/usePerfil'
import { Dialogo } from '../components/Dialogo'
import { useNavigate } from '@tanstack/react-router'
import { validarPerfil, validarTrocaDeSenha, type ErrosDeCampo } from '../lib/validacao'
import { errosDosCampos, mensagemDeErro } from '../lib/erros'
import { prepararAvatar, problemaNaImagem } from '../lib/imagem'
import { avisar } from '../lib/avisos'
import type { Perfil as TipoPerfil } from '../types/perfil'

function focarPrimeiro(prefixo: string, erros: ErrosDeCampo) {
  const primeiro = Object.keys(erros)[0]
  if (primeiro) document.getElementById(`${prefixo}-${primeiro}`)?.focus()
  return Boolean(primeiro)
}

export function Perfil() {
  const perfil = usePerfil()

  return (
    <LayoutDaConta titulo="Minha conta">
      {perfil.isPending ? (
        <PerfilSkeleton />
      ) : perfil.isError ? (
        <div role="alert" className="rounded border border-red-400/60 p-4 text-sm">
          <p>{mensagemDeErro(perfil.error)}</p>
          <button type="button" onClick={() => perfil.refetch()} className={`${botaoSecundario} mt-3`}>
            Tentar de novo
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <CartaoDoAvatar perfil={perfil.data} />
          <div className="flex flex-col gap-6">
            <FormularioDeDados key={perfil.data.id} perfil={perfil.data} />
            <FormularioDeSenha />
            <ApagarConta />
          </div>
        </div>
      )}
      <SecaoDeFavoritos />
    </LayoutDaConta>
  )
}

function CartaoDoAvatar({ perfil }: { perfil: TipoPerfil }) {
  const entrada = useRef<HTMLInputElement>(null)
  const enviar = useEnviarAvatar()
  const remover = useRemoverAvatar()
  const [erro, setErro] = useState<string | null>(null)
  const ocupado = enviar.isPending || remover.isPending

  async function escolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    const problema = problemaNaImagem(arquivo)
    if (problema) {
      setErro(problema)
      return
    }
    setErro(null)
    try {
      const avatar = await prepararAvatar(arquivo)
      enviar.mutate(avatar, {
        onSuccess: () => avisar('Foto atualizada.', 'sucesso'),
        onError: (falha) => setErro(mensagemDeErro(falha)),
      })
    } catch {
      setErro('Não foi possível ler esta imagem. Tente outra.')
    }
  }

  return (
    <Cartao id="titulo-foto" titulo="Foto de perfil" descricao="PNG, JPG ou WEBP de até 5 MB. A imagem é cortada em quadrado.">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={ocupado ? 'opacity-50' : ''}>
          <Avatar nome={perfil.nome} avatar={perfil.avatar} tamanho="g" />
        </div>
        <div>
          <p className="font-bold">{perfil.nome}</p>
          <p className="text-xs text-apagado">
            Membro desde {new Date(perfil.criadoEm).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <input ref={entrada} id="avatar-arquivo" type="file" accept="image/png,image/jpeg,image/webp" onChange={escolher} className="sr-only" aria-describedby={erro ? 'avatar-erro' : undefined} />
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" disabled={ocupado} onClick={() => entrada.current?.click()} className={botaoSecundario}>
            {enviar.isPending ? 'Enviando...' : perfil.avatar ? 'Trocar foto' : 'Enviar foto'}
          </button>
          {perfil.avatar && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() =>
                remover.mutate(undefined, {
                  onSuccess: () => avisar('Foto removida.', 'info'),
                  onError: (falha) => setErro(mensagemDeErro(falha)),
                })
              }
              className={botaoSecundario}
            >
              {remover.isPending ? 'Removendo...' : 'Remover'}
            </button>
          )}
        </div>
        {erro && (
          <p id="avatar-erro" role="alert" className="text-xs text-red-300">
            {erro}
          </p>
        )}
      </div>
    </Cartao>
  )
}

function FormularioDeDados({ perfil }: { perfil: TipoPerfil }) {
  const atualizar = useAtualizarPerfil()
  const [dados, setDados] = useState({ nome: perfil.nome, email: perfil.email, bio: perfil.bio, senhaAtual: '' })
  const [erros, setErros] = useState<ErrosDeCampo>({})
  const trocouEmail = dados.email.trim().toLowerCase() !== perfil.email
  const mudou = dados.nome !== perfil.nome || trocouEmail || dados.bio !== perfil.bio

  function mudar(campo: keyof typeof dados, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const encontrados = validarPerfil(dados)
    if (trocouEmail && !dados.senhaAtual) encontrados.senhaAtual = 'Digite sua senha para trocar o email.'
    setErros(encontrados)
    if (focarPrimeiro('perfil', encontrados)) return
    atualizar.mutate({ ...dados, senhaAtual: trocouEmail ? dados.senhaAtual : undefined }, {
      onSuccess: (salvo) => {
        setDados({ nome: salvo.nome, email: salvo.email, bio: salvo.bio, senhaAtual: '' })
        avisar('Dados salvos.', 'sucesso')
      },
      onError: (falha) => {
        const campos = errosDosCampos(falha)
        setErros(campos)
        focarPrimeiro('perfil', campos)
      },
    })
  }

  return (
    <Cartao id="titulo-dados" titulo="Dados pessoais">
      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        {atualizar.isError && !Object.keys(erros).length && (
          <p role="alert" className="rounded border border-red-400/60 bg-red-400/10 p-3 text-sm">
            {mensagemDeErro(atualizar.error)}
          </p>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          <Campo id="perfil-nome" rotulo="Nome" autoComplete="name" value={dados.nome} onChange={(e) => mudar('nome', e.target.value)} erro={erros.nome} />
          <Campo id="perfil-email" rotulo="Email" type="email" autoComplete="email" value={dados.email} onChange={(e) => mudar('email', e.target.value)} erro={erros.email} />
        </div>
        {trocouEmail && (
          <Campo
            id="perfil-senhaAtual"
            rotulo="Senha atual"
            type="password"
            autoComplete="current-password"
            dica="Por segurança, confirme sua senha para trocar o email."
            value={dados.senhaAtual}
            onChange={(e) => mudar('senhaAtual', e.target.value)}
            erro={erros.senhaAtual}
          />
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="perfil-bio" className="text-sm font-bold">
            Bio <span className="font-normal text-apagado">(opcional)</span>
          </label>
          <textarea
            id="perfil-bio"
            rows={3}
            value={dados.bio}
            onChange={(e) => mudar('bio', e.target.value)}
            aria-invalid={erros.bio ? true : undefined}
            aria-describedby="perfil-bio-contador"
            className={`resize-y rounded border bg-fundo px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-laranja ${erros.bio ? 'border-red-400' : 'border-borda'}`}
          />
          <p id="perfil-bio-contador" className={`text-xs ${dados.bio.length > 160 ? 'text-red-300' : 'text-apagado'}`}>
            {erros.bio ?? `${dados.bio.length}/160 caracteres`}
          </p>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={atualizar.isPending || !mudou} className={botaoPrincipal}>
            {atualizar.isPending ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
          </button>
        </div>
      </form>
    </Cartao>
  )
}

function FormularioDeSenha() {
  const alterar = useAlterarSenha()
  const vazio = { senhaAtual: '', novaSenha: '', confirmacao: '' }
  const [dados, setDados] = useState(vazio)
  const [erros, setErros] = useState<ErrosDeCampo>({})

  function mudar(campo: keyof typeof dados, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const encontrados = validarTrocaDeSenha(dados)
    if (!encontrados.novaSenha && dados.confirmacao !== dados.novaSenha) encontrados.confirmacao = 'As senhas não são iguais.'
    setErros(encontrados)
    if (focarPrimeiro('senha', encontrados)) return
    alterar.mutate(
      { senhaAtual: dados.senhaAtual, novaSenha: dados.novaSenha },
      {
        onSuccess: () => {
          setDados(vazio)
          avisar('Senha alterada. Use a nova senha no próximo login.', 'sucesso')
        },
        onError: (falha) => {
          const campos = errosDosCampos(falha)
          setErros(campos)
          focarPrimeiro('senha', campos)
        },
      },
    )
  }

  return (
    <Cartao id="titulo-senha" titulo="Alterar senha" descricao="Mínimo de 8 caracteres, com letras e números.">
      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        {alterar.isError && !Object.keys(erros).length && (
          <p role="alert" className="rounded border border-red-400/60 bg-red-400/10 p-3 text-sm">
            {mensagemDeErro(alterar.error)}
          </p>
        )}
        <Campo id="senha-senhaAtual" rotulo="Senha atual" type="password" autoComplete="current-password" value={dados.senhaAtual} onChange={(e) => mudar('senhaAtual', e.target.value)} erro={erros.senhaAtual} />
        <div className="grid gap-5 md:grid-cols-2">
          <Campo id="senha-novaSenha" rotulo="Nova senha" type="password" autoComplete="new-password" value={dados.novaSenha} onChange={(e) => mudar('novaSenha', e.target.value)} erro={erros.novaSenha} />
          <Campo id="senha-confirmacao" rotulo="Confirme a nova senha" type="password" autoComplete="new-password" value={dados.confirmacao} onChange={(e) => mudar('confirmacao', e.target.value)} erro={erros.confirmacao} />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={alterar.isPending} className={botaoPrincipal}>
            {alterar.isPending ? 'ALTERANDO...' : 'ALTERAR SENHA'}
          </button>
        </div>
      </form>
    </Cartao>
  )
}

function ApagarConta() {
  const apagar = useApagarConta()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | undefined>()

  function fechar() {
    setAberto(false)
    setSenha('')
    setErro(undefined)
  }

  function confirmar() {
    if (!senha) {
      setErro('Digite sua senha.')
      document.getElementById('apagar-senha')?.focus()
      return
    }
    apagar.mutate(senha, {
      onSuccess: () => {
        avisar('Sua conta foi apagada.', 'info')
        navigate({ to: '/' })
      },
      onError: (falha) => {
        setErro(errosDosCampos(falha).senha ?? mensagemDeErro(falha))
        document.getElementById('apagar-senha')?.focus()
      },
    })
  }

  return (
    <Cartao id="titulo-apagar" titulo="Apagar conta" descricao="Remove sua conta, seus favoritos, carrinho e carteiras. Não dá para desfazer.">
      <button type="button" onClick={() => setAberto(true)} className={`${botaoSecundario} border-red-400/60 text-red-300 hover:border-red-400 hover:text-red-200`}>
        Apagar minha conta
      </button>
      <Dialogo aberto={aberto} titulo="Apagar sua conta?" textoConfirmar="Apagar conta" carregando={apagar.isPending} aoConfirmar={confirmar} aoFechar={fechar}>
        <p className="mb-4">Tudo o que está salvo na sua conta será apagado. Para confirmar, digite sua senha.</p>
        <Campo
          id="apagar-senha"
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirmar()
          }}
          erro={erro}
        />
      </Dialogo>
    </Cartao>
  )
}

function SecaoDeFavoritos() {
  const favoritos = useFavoritos()
  const ids = favoritos.data ?? []
  const nfts = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['nft', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => buscarNft(id, signal),
    })),
  })

  return (
    <section aria-labelledby="titulo-favoritos" className="mt-12">
      <h2 id="titulo-favoritos" className="text-lg font-bold text-laranja">
        Seus favoritos
      </h2>
      {favoritos.isPending ? (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <NftCardSkeleton key={i} />)}
        </div>
      ) : ids.length === 0 ? (
        <p className="mt-4 text-sm text-apagado">Você ainda não favoritou nenhum NFT. Toque no coração na página de um NFT para guardar aqui.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {nfts.map((consulta, i) => (consulta.data ? <NftCard key={ids[i]} nft={consulta.data} /> : <NftCardSkeleton key={ids[i]} />))}
        </div>
      )}
    </section>
  )
}

function PerfilSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]" aria-busy="true" aria-label="Carregando perfil">
      <div className="shimmer h-72 rounded-lg" />
      <div className="flex flex-col gap-6">
        <div className="shimmer h-72 rounded-lg" />
        <div className="shimmer h-64 rounded-lg" />
      </div>
    </div>
  )
}
