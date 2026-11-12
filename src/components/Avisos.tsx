import { fecharAviso, useAvisos } from '../lib/avisos'

const estilos = {
  sucesso: 'border-laranja',
  erro: 'border-red-400',
  info: 'border-borda',
}

export function Avisos() {
  const avisos = useAvisos()

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
    >
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          className={`pointer-events-auto flex w-full items-start gap-3 rounded border-l-4 bg-superficie p-3 text-sm shadow-lg ${estilos[aviso.tipo]}`}
        >
          <p className="flex-1">
            {aviso.tipo === 'erro' && <span className="sr-only">Erro: </span>}
            {aviso.texto}
          </p>
          <button
            type="button"
            onClick={() => fecharAviso(aviso.id)}
            aria-label="Fechar aviso"
            className="text-apagado hover:text-texto"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
