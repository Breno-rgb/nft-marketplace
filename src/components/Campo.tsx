import { useState, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  rotulo: string
  erro?: string
  dica?: string
}

export function Campo({ id, rotulo, erro, dica, type = 'text', ...resto }: Props) {
  const [visivel, setVisivel] = useState(false)
  const ehSenha = type === 'password'
  const descricao = [erro && `${id}-erro`, dica && `${id}-dica`].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {rotulo}
      </label>
      <div className="relative">
        <input
          id={id}
          type={ehSenha && visivel ? 'text' : type}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricao}
          className={`w-full rounded border bg-fundo px-3 py-2.5 text-sm text-texto placeholder:text-apagado/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-laranja ${
            erro ? 'border-red-400' : 'border-borda'
          } ${ehSenha ? 'pr-20' : ''}`}
          {...resto}
        />
        {ehSenha && (
          <button
            type="button"
            onClick={() => setVisivel((v) => !v)}
            aria-pressed={visivel}
            aria-controls={id}
            className="absolute inset-y-0 right-0 px-3 text-xs text-apagado hover:text-laranja focus-visible:text-laranja focus-visible:outline-none"
          >
            {visivel ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>
      {dica && !erro && (
        <p id={`${id}-dica`} className="text-xs text-apagado">
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="text-xs text-red-300">
          <span aria-hidden="true">⚠ </span>
          {erro}
        </p>
      )}
    </div>
  )
}
