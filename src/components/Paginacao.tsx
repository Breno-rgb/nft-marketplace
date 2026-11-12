type Props = {
  pagina: number
  totalPaginas: number
  aoMudar: (pagina: number) => void
}

export function Paginacao({ pagina, totalPaginas, aoMudar }: Props) {
  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1)

  return (
    <nav aria-label="Paginação" className="mt-8 flex justify-center gap-2">
      {paginas.map((numero) => (
        <button
          key={numero}
          onClick={() => aoMudar(numero)}
          aria-current={numero === pagina ? 'page' : undefined}
          className={`h-9 w-9 rounded border text-sm ${
            numero === pagina
              ? 'border-laranja bg-laranja text-fundo'
              : 'border-borda text-apagado hover:border-laranja hover:text-laranja'
          }`}
        >
          {numero}
        </button>
      ))}
    </nav>
  )
}
