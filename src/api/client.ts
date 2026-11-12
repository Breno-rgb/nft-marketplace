import axios, { isAxiosError } from 'axios'
import { avisarQueSessaoExpirou, obterToken } from '../lib/sessao'
import { mocksProntos } from '../lib/ambiente'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.request.use(async (config) => {
  await mocksProntos
  const token = obterToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(undefined, (erro) => {
  const codigo = isAxiosError<{ codigo?: string }>(erro) ? erro.response?.data?.codigo : undefined
  const tinhaToken = isAxiosError(erro) && Boolean(erro.config?.headers?.Authorization)
  if (tinhaToken && (codigo === 'SESSAO_EXPIRADA' || codigo === 'SESSAO_INVALIDA')) {
    avisarQueSessaoExpirou()
  }
  return Promise.reject(erro)
})
