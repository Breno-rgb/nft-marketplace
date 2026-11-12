import { useSyncExternalStore } from 'react'

export type Aviso = {
  id: number
  texto: string
  tipo: 'sucesso' | 'erro' | 'info'
}

let avisos: Aviso[] = []
let proximoId = 1
const ouvintes = new Set<() => void>()

function emitir() {
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function fecharAviso(id: number) {
  avisos = avisos.filter((aviso) => aviso.id !== id)
  emitir()
}

export function avisar(texto: string, tipo: Aviso['tipo'] = 'info') {
  const id = proximoId++
  avisos = [...avisos.filter((aviso) => aviso.texto !== texto), { id, texto, tipo }].slice(-3)
  emitir()
  setTimeout(() => fecharAviso(id), 6000)
}

export function useAvisos() {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
    () => avisos,
  )
}
