import { Link } from '@tanstack/react-router'

type Props = {
  titulo?: string
  mensagem?: string
}

export function NaoEncontrado({
  titulo = 'Página não encontrada',
  mensagem = 'O endereço que você tentou abrir não existe.',
}: Props) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20 text-center">
      <p className="text-5xl font-bold text-laranja">404</p>
      <h1 className="mt-4 text-2xl font-bold">{titulo}</h1>
      <p className="mt-2 text-apagado">{mensagem}</p>
      <Link to="/" className="mt-6 inline-block rounded bg-laranja px-4 py-2 text-sm text-fundo">
        Voltar ao catálogo
      </Link>
    </main>
  )
}
