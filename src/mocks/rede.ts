import { http, HttpResponse, delay } from 'msw'
import { lerCenarios } from './cenarios'

// Primeiro handler da lista: aplica atraso e falhas do cenário a todas as rotas da API.
// Quando não devolve nada, a requisição segue para o handler específico.
export const handlerDeRede = http.all('/api/*', async ({ request }) => {
  const cenarios = lerCenarios()
  if (cenarios.latencia === 'lenta') await delay(2000 + Math.random() * 2000)

  if (cenarios.falha === 'offline') return HttpResponse.error()
  if (cenarios.falha === 'erro-servidor') {
    return HttpResponse.json({ mensagem: 'O servidor está com problemas. Tente de novo em instantes.', codigo: 'ERRO_INTERNO' }, { status: 500 })
  }
  if (cenarios.favoritos === 'falha' && request.method !== 'GET' && new URL(request.url).pathname.startsWith('/api/favoritos')) {
    return HttpResponse.json({ mensagem: 'Falha temporária ao salvar o favorito.', codigo: 'ERRO_INTERNO' }, { status: 500 })
  }
})

export function latencia(minimo = 300, variacao = 500) {
  return lerCenarios().latencia === 'instantanea' ? Promise.resolve() : delay(minimo + Math.random() * variacao)
}
