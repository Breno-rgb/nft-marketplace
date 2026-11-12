import type { ReactNode } from 'react'

type Props = {
  titulo: string
  subtitulo: string
  children: ReactNode
}

export function LayoutDeConta({ titulo, subtitulo, children }: Props) {
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:items-center md:py-16">
      <div className="relative hidden overflow-hidden rounded-lg border border-borda md:block">
        <img src="/nfts/1.webp" alt="" width={560} height={560} className="aspect-square w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-fundo via-fundo/80 to-transparent p-6">
          <p className="text-lg font-bold">Colecione arte digital única.</p>
          <p className="text-sm text-apagado">Favoritos, carrinho e pedidos ficam salvos na sua conta.</p>
        </div>
      </div>
      <section aria-labelledby="titulo-conta" className="mx-auto w-full max-w-md">
        <h1 id="titulo-conta" className="text-2xl font-bold">
          {titulo}
        </h1>
        <p className="mt-2 text-sm text-apagado">{subtitulo}</p>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  )
}
