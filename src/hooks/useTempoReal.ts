import { useEffect } from 'react'
import { useUsuario } from './useSessao'
import { conectarTempoReal, desconectarTempoReal } from '../lib/tempoReal'
import { mocksAtivos } from '../lib/ambiente'

// Abre uma conexão por sessão. Quando o usuário muda (login, logout, expiração), reconecta com o novo token.
export function useTempoReal() {
  const { usuario, carregando } = useUsuario()
  const usuarioId = usuario?.id ?? null

  useEffect(() => {
    if (carregando || !mocksAtivos) return
    conectarTempoReal(usuarioId)
    return () => desconectarTempoReal()
  }, [usuarioId, carregando])
}
