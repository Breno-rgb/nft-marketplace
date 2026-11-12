import { useEffect, useState } from 'react'
import type { BuscaCatalogo } from '../router'
import type { Faceta, Rede } from '../types/nft'

type Props = {
  busca: BuscaCatalogo
  categorias: Faceta[]
  aoMudar: (mudancas: Partial<BuscaCatalogo>) => void
}

const redes: Rede[] = ['Ethereum', 'Polygon']

export function Filtros({ busca, categorias, aoMudar }: Props) {
  const [aberto, setAberto] = useState(false)
  const [precoMin, setPrecoMin] = useState(busca.precoMin?.toString() ?? '')
  const [precoMax, setPrecoMax] = useState(busca.precoMax?.toString() ?? '')
  const [erroPreco, setErroPreco] = useState('')

  useEffect(() => {
    setPrecoMin(busca.precoMin?.toString() ?? '')
    setPrecoMax(busca.precoMax?.toString() ?? '')
  }, [busca.precoMin, busca.precoMax])

  const selecionadas = busca.categorias?.split(',') ?? []

  function alternarCategoria(nome: string) {
    const novas = selecionadas.includes(nome)
      ? selecionadas.filter((c) => c !== nome)
      : [...selecionadas, nome]
    aoMudar({ categorias: novas.length ? novas.join(',') : undefined })
  }

  function aplicarPreco(evento: React.FormEvent) {
    evento.preventDefault()
    const min = precoMin === '' ? undefined : Number(precoMin)
    const max = precoMax === '' ? undefined : Number(precoMax)
    if (min !== undefined && max !== undefined && min > max) {
      setErroPreco('O preço mínimo não pode ser maior que o máximo.')
      return
    }
    setErroPreco('')
    aoMudar({ precoMin: min, precoMax: max })
  }

  const temFiltro = selecionadas.length > 0 || busca.rede || busca.precoMin !== undefined || busca.precoMax !== undefined

  return (
    <aside aria-label="Filtros" className="md:w-56 md:shrink-0">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-controls="painel-filtros"
        className="mb-4 w-full rounded border border-borda px-4 py-2 text-left text-sm md:hidden"
      >
        {aberto ? 'Esconder filtros' : 'Mostrar filtros'}
      </button>

      <div id="painel-filtros" className={`${aberto ? 'block' : 'hidden'} space-y-6 md:block`}>
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Coleções</legend>
          <ul className="space-y-1">
            {categorias.map((categoria) => (
              <li key={categoria.nome}>
                <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-apagado hover:text-texto">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selecionadas.includes(categoria.nome)}
                      onChange={() => alternarCategoria(categoria.nome)}
                      className="accent-laranja"
                    />
                    {categoria.nome}
                  </span>
                  <span className="text-xs">[{categoria.total}]</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <form onSubmit={aplicarPreco} noValidate>
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Faixa de preço (ETH)</legend>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="preco-min">Preço mínimo</label>
              <input
                id="preco-min"
                type="number"
                min="0"
                step="0.01"
                placeholder="Mín"
                value={precoMin}
                onChange={(e) => setPrecoMin(e.target.value)}
                aria-describedby={erroPreco ? 'erro-preco' : undefined}
                className="w-full rounded border border-borda bg-superficie px-2 py-1 text-sm"
              />
              <label className="sr-only" htmlFor="preco-max">Preço máximo</label>
              <input
                id="preco-max"
                type="number"
                min="0"
                step="0.01"
                placeholder="Máx"
                value={precoMax}
                onChange={(e) => setPrecoMax(e.target.value)}
                aria-describedby={erroPreco ? 'erro-preco' : undefined}
                className="w-full rounded border border-borda bg-superficie px-2 py-1 text-sm"
              />
            </div>
            {erroPreco && (
              <p id="erro-preco" role="alert" className="mt-2 text-xs text-red-400">
                {erroPreco}
              </p>
            )}
            <button type="submit" className="mt-2 rounded bg-laranja px-3 py-1 text-sm text-fundo hover:bg-laranja-escuro">
              Aplicar
            </button>
          </fieldset>
        </form>

        <fieldset>
          <legend className="mb-2 text-sm font-bold">Rede</legend>
          <div className="space-y-1">
            {[undefined, ...redes].map((rede) => (
              <label key={rede ?? 'todas'} className="flex cursor-pointer items-center gap-2 text-sm text-apagado hover:text-texto">
                <input
                  type="radio"
                  name="rede"
                  checked={busca.rede === rede}
                  onChange={() => aoMudar({ rede })}
                  className="accent-laranja"
                />
                {rede ?? 'Todas'}
              </label>
            ))}
          </div>
        </fieldset>

        {temFiltro && (
          <button
            type="button"
            onClick={() => aoMudar({ categorias: undefined, rede: undefined, precoMin: undefined, precoMax: undefined })}
            className="text-sm text-laranja underline"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </aside>
  )
}
