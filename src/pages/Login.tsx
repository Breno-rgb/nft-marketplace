import { useState, type FormEvent } from 'react'
import { Link, useRouter, useSearch } from '@tanstack/react-router'
import { LayoutDeConta } from '../components/LayoutDeConta'
import { Campo } from '../components/Campo'
import { useEntrar } from '../hooks/useSessao'
import { validarLogin, type ErrosDeCampo } from '../lib/validacao'
import { mensagemDeErro } from '../lib/erros'
import { destinoSeguro } from '../lib/sessao'
import { avisar } from '../lib/avisos'

export function Login() {
  const { redirect, motivo } = useSearch({ from: '/login' })
  const router = useRouter()
  const entrar = useEntrar()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<ErrosDeCampo>({})

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const encontrados = validarLogin({ email, senha })
    setErros(encontrados)
    const primeiro = Object.keys(encontrados)[0]
    if (primeiro) {
      document.getElementById(`login-${primeiro}`)?.focus()
      return
    }
    entrar.mutate(
      { email, senha },
      {
        onSuccess: ({ usuario }) => {
          avisar(`Bem-vindo de volta, ${usuario.nome.split(' ')[0]}!`, 'sucesso')
          router.history.push(destinoSeguro(redirect))
        },
      },
    )
  }

  return (
    <LayoutDeConta titulo="Entrar na Kurio" subtitulo="Acesse seus favoritos, carrinho e pedidos.">
      {motivo === 'expirou' && (
        <p role="alert" className="mb-6 rounded border border-laranja/60 bg-laranja/10 p-3 text-sm">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      {entrar.isError && (
        <p role="alert" className="mb-6 rounded border border-red-400/60 bg-red-400/10 p-3 text-sm">
          {mensagemDeErro(entrar.error)}
        </p>
      )}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        <Campo
          id="login-email"
          rotulo="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erros.email}
        />
        <Campo
          id="login-senha"
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={erros.senha}
        />
        <button
          type="submit"
          disabled={entrar.isPending}
          className="rounded bg-laranja py-3 text-sm font-bold text-fundo hover:bg-laranja-escuro disabled:cursor-wait disabled:opacity-70"
        >
          {entrar.isPending ? 'ENTRANDO...' : 'ENTRAR'}
        </button>
      </form>
      <p className="mt-6 text-sm text-apagado">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" search={{ redirect }} className="text-laranja underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
      <details className="mt-8 rounded border border-borda p-3 text-xs text-apagado">
        <summary className="cursor-pointer text-texto">Contas de teste</summary>
        <p className="mt-2">ana@kurio.dev · Kurio@123</p>
        <p>bruno@kurio.dev · Kurio@123</p>
      </details>
    </LayoutDeConta>
  )
}
