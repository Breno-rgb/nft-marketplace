import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

const abas = [
  { para: '/perfil', rotulo: 'Meu perfil' },
  { para: '/carteiras', rotulo: 'Carteiras' },
] as const

export function LayoutDaConta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <nav aria-label="Minha conta" className="mt-6 flex gap-6 border-b border-borda text-sm">
        {abas.map((aba) => (
          <Link
            key={aba.para}
            to={aba.para}
            className="-mb-px border-b-2 border-transparent pb-3 text-apagado hover:text-texto focus-visible:text-laranja [&.active]:border-laranja [&.active]:text-laranja"
          >
            {aba.rotulo}
          </Link>
        ))}
      </nav>
      <div className="mt-8">{children}</div>
    </main>
  )
}

export function Cartao({ titulo, descricao, children, id }: { titulo: string; descricao?: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-borda bg-superficie p-5 md:p-6">
      <h2 id={id} className="text-lg font-bold">
        {titulo}
      </h2>
      {descricao && <p className="mt-1 text-sm text-apagado">{descricao}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}
