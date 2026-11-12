import { useEffect, useId, useRef, type ReactNode } from 'react'

type Props = {
  aberto: boolean
  titulo: string
  children: ReactNode
  textoConfirmar: string
  textoCancelar?: string
  aoConfirmar: () => void
  aoFechar: () => void
  carregando?: boolean
}

export function Dialogo({
  aberto,
  titulo,
  children,
  textoConfirmar,
  textoCancelar = 'Voltar',
  aoConfirmar,
  aoFechar,
  carregando,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const tituloId = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberto && !dialogo.open) dialogo.showModal()
    if (!aberto && dialogo.open) dialogo.close()
  }, [aberto])

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      aria-labelledby={tituloId}
      className="m-auto w-[min(90vw,420px)] rounded-lg border border-borda bg-superficie p-6 text-texto backdrop:bg-black/70"
    >
      <h2 id={tituloId} className="text-lg font-bold">{titulo}</h2>
      <div className="mt-3 text-sm text-apagado">{children}</div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={aoFechar}
          className="rounded border border-borda px-4 py-2 text-sm hover:border-laranja"
        >
          {textoCancelar}
        </button>
        <button
          type="button"
          onClick={aoConfirmar}
          disabled={carregando}
          className="rounded bg-laranja px-4 py-2 text-sm font-bold text-fundo hover:bg-laranja-escuro disabled:opacity-50"
        >
          {carregando ? 'Aguarde...' : textoConfirmar}
        </button>
      </div>
    </dialog>
  )
}
