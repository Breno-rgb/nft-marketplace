import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CENARIOS_PADRAO, lerCenarios, OPCOES_DE_CENARIO, salvarCenarios, type Cenarios } from '../mocks/cenarios'
import { avisar } from '../lib/avisos'
import { useEstadoDoTempoReal } from '../lib/tempoReal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const chaves = Object.keys(OPCOES_DE_CENARIO) as (keyof Cenarios)[]

// Ferramenta de demonstração: escolhe como a API simulada (MSW) vai responder.
export function PainelDeCenarios() {
  const [aberto, setAberto] = useState(false)
  const [cenarios, setCenarios] = useState<Cenarios>(lerCenarios)
  const queryClient = useQueryClient()
  const tempoReal = useEstadoDoTempoReal()
  const alterados = chaves.filter((chave) => cenarios[chave] !== CENARIOS_PADRAO[chave]).length

  function mudar(chave: keyof Cenarios, valor: string) {
    const novos = { ...cenarios, [chave]: valor }
    setCenarios(novos)
    salvarCenarios(novos)
  }

  function restaurar() {
    setCenarios(CENARIOS_PADRAO)
    salvarCenarios(CENARIOS_PADRAO)
    queryClient.invalidateQueries()
    avisar('Cenários restaurados para o padrão.', 'info')
  }

  function ferramenta(nome: 'resetar' | 'mudarPreco' | 'esgotarEdicao' | 'repetirUltimoEvento' | 'enviarEventoAntigo' | 'derrubarConexao') {
    const mocks = (window as unknown as { kurioMocks?: Record<string, () => string | void> }).kurioMocks
    const resultado = mocks?.[nome]?.()
    if (resultado) avisar(resultado, 'info')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCenarios(lerCenarios())
          setAberto(true)
        }}
        className="fixed bottom-4 left-4 z-40 rounded-full border border-borda bg-superficie px-3 py-2 text-xs shadow-lg hover:border-laranja hover:text-laranja"
      >
        Cenários{alterados > 0 && <span className="ml-1 text-laranja">({alterados})</span>}
        <span className="sr-only"> da API simulada</span>
      </button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] w-[min(92vw,480px)] overflow-y-auto border-borda bg-superficie text-texto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Cenários da API simulada</DialogTitle>
          <DialogDescription className="text-xs text-apagado">Valem na hora, para as próximas requisições. Ficam salvos neste navegador.</DialogDescription>
        </DialogHeader>
        <div className="mt-5 grid gap-4">
          {chaves.map((chave) => (
            <div key={chave} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <label htmlFor={`cenario-${chave}`} className="text-sm">
                {OPCOES_DE_CENARIO[chave].rotulo}
              </label>
              <select
                id={`cenario-${chave}`}
                value={cenarios[chave]}
                onChange={(e) => mudar(chave, e.target.value)}
                className={`rounded border bg-fundo px-2 py-1.5 text-sm ${cenarios[chave] !== CENARIOS_PADRAO[chave] ? 'border-laranja' : 'border-borda'}`}
              >
                {Object.entries(OPCOES_DE_CENARIO[chave].opcoes).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo as string}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-borda pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold">Eventos em tempo real</h3>
            <span className="text-xs text-apagado">
              <span aria-hidden="true" className={`mr-1.5 inline-block h-2 w-2 rounded-full ${tempoReal === 'conectado' ? 'bg-green-400' : 'bg-laranja'}`} />
              Socket.IO {tempoReal}
            </span>
          </div>
          <p className="mt-1 text-xs text-apagado">Agem no primeiro item do seu carrinho (ou no NFT #1 se ele estiver vazio).</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {(
              [
                ['mudarPreco', 'Mudar preço (+15%)'],
                ['esgotarEdicao', 'Esgotar edição'],
                ['repetirUltimoEvento', 'Repetir último evento'],
                ['enviarEventoAntigo', 'Enviar evento antigo'],
                ['derrubarConexao', 'Derrubar conexão'],
              ] as const
            ).map(([nome, rotulo]) => (
              <button key={nome} type="button" onClick={() => ferramenta(nome)} className="rounded border border-borda px-2 py-2 text-left hover:border-laranja hover:text-laranja">
                {rotulo}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <button type="button" onClick={() => ferramenta('resetar')} className="rounded border border-red-400/60 px-3 py-2 text-xs text-red-300 hover:border-red-400">
            Resetar dados e recarregar
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={restaurar} className="rounded border border-borda px-3 py-2 text-xs hover:border-laranja">
              Padrão
            </button>
            <Button size="sm" onClick={() => setAberto(false)}>
              Fechar
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
