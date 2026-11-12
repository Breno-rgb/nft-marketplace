import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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

// Caixa de confirmação sobre o Dialog do shadcn/ui (Radix): prende o foco, fecha com Esc e devolve o foco ao botão que abriu.
export function Dialogo({ aberto, titulo, children, textoConfirmar, textoCancelar = 'Voltar', aoConfirmar, aoFechar, carregando }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent showCloseButton={false} aria-describedby={undefined} className="w-[min(90vw,420px)] border-borda bg-superficie text-texto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{titulo}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-apagado">{children}</div>
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={aoFechar}>
            {textoCancelar}
          </Button>
          <Button onClick={aoConfirmar} disabled={carregando}>
            {carregando ? 'Aguarde...' : textoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
