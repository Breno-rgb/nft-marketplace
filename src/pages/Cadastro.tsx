import { useState, type FormEvent } from 'react'
import { Link, useRouter, useSearch } from '@tanstack/react-router'
import { LayoutDeConta } from '../components/LayoutDeConta'
import { Campo } from '../components/Campo'
import { Button } from '@/components/ui/button'
import { useCadastrar } from '../hooks/useSessao'
import { validarCadastro, type ErrosDeCampo } from '../lib/validacao'
import { errosDosCampos, mensagemDeErro } from '../lib/erros'
import { destinoSeguro } from '../lib/sessao'
import { avisar } from '../lib/avisos'

export function Cadastro() {
  const { redirect } = useSearch({ from: '/cadastro' })
  const router = useRouter()
  const cadastrar = useCadastrar()
  const [dados, setDados] = useState({ nome: '', email: '', senha: '', confirmacao: '' })
  const [erros, setErros] = useState<ErrosDeCampo>({})

  function mudar(campo: keyof typeof dados, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }))
  }

  function mostrarErros(encontrados: ErrosDeCampo) {
    setErros(encontrados)
    const primeiro = Object.keys(encontrados)[0]
    if (primeiro) document.getElementById(`cadastro-${primeiro}`)?.focus()
    return Boolean(primeiro)
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const encontrados = validarCadastro(dados)
    if (dados.confirmacao !== dados.senha) encontrados.confirmacao = 'As senhas não são iguais.'
    if (mostrarErros(encontrados)) return

    cadastrar.mutate(
      { nome: dados.nome, email: dados.email, senha: dados.senha },
      {
        onSuccess: ({ usuario }) => {
          avisar(`Conta criada. Boas-vindas, ${usuario.nome.split(' ')[0]}!`, 'sucesso')
          router.history.push(destinoSeguro(redirect))
        },
        onError: (erro) => mostrarErros(errosDosCampos(erro)),
      },
    )
  }

  return (
    <LayoutDeConta titulo="Criar conta" subtitulo="Leva menos de um minuto. Seu carrinho atual vem junto.">
      {cadastrar.isError && (
        <p role="alert" className="mb-6 rounded border border-red-400/60 bg-red-400/10 p-3 text-sm">
          {mensagemDeErro(cadastrar.error)}
        </p>
      )}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        <Campo
          id="cadastro-nome"
          rotulo="Nome completo"
          autoComplete="name"
          value={dados.nome}
          onChange={(e) => mudar('nome', e.target.value)}
          erro={erros.nome}
        />
        <Campo
          id="cadastro-email"
          rotulo="Email"
          type="email"
          autoComplete="email"
          value={dados.email}
          onChange={(e) => mudar('email', e.target.value)}
          erro={erros.email}
        />
        <Campo
          id="cadastro-senha"
          rotulo="Senha"
          type="password"
          autoComplete="new-password"
          dica="Mínimo de 8 caracteres, com letras e números."
          value={dados.senha}
          onChange={(e) => mudar('senha', e.target.value)}
          erro={erros.senha}
        />
        <Campo
          id="cadastro-confirmacao"
          rotulo="Confirme a senha"
          type="password"
          autoComplete="new-password"
          value={dados.confirmacao}
          onChange={(e) => mudar('confirmacao', e.target.value)}
          erro={erros.confirmacao}
        />
        <Button type="submit" size="lg" disabled={cadastrar.isPending}>
          {cadastrar.isPending ? 'CRIANDO CONTA...' : 'CRIAR CONTA'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-apagado">
        Já tem conta?{' '}
        <Link to="/login" search={{ redirect }} className="text-laranja underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </LayoutDeConta>
  )
}
