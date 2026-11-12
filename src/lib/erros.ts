import { isAxiosError } from 'axios'
import type { ErrosDeCampo } from './validacao'

type ErroDaApi = { mensagem?: string; codigo?: string; campos?: ErrosDeCampo }

export function mensagemDeErro(erro: unknown): string {
  if (isAxiosError<ErroDaApi>(erro)) {
    if (erro.response?.data?.mensagem) return erro.response.data.mensagem
    if (erro.code === 'ECONNABORTED') return 'A conexão demorou demais. Tente de novo.'
    if (!erro.response) return 'Sem conexão com o servidor. Tente de novo.'
  }
  return 'Algo deu errado. Tente de novo.'
}

export function errosDosCampos(erro: unknown): ErrosDeCampo {
  return isAxiosError<ErroDaApi>(erro) ? (erro.response?.data?.campos ?? {}) : {}
}

export function statusDoErro(erro: unknown) {
  return isAxiosError(erro) ? erro.response?.status : undefined
}
