import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import './index.css'
import { router } from './router'
import { limparDadosPrivados, queryClient } from './lib/queryClient'
import { quandoSessaoExpirar } from './lib/sessao'
import { CHAVE_SESSAO } from './hooks/useSessao'
import { avisar } from './lib/avisos'
import { mocksAtivos } from './lib/ambiente'

quandoSessaoExpirar(() => {
  queryClient.setQueryData(CHAVE_SESSAO, null)
  limparDadosPrivados()
  const emRotaPrivada = router.state.matches.some((rota) => rota.routeId.includes('autenticado'))
  if (emRotaPrivada) router.invalidate()
  else avisar('Sua sessão expirou. Entre novamente quando quiser.', 'info')
})

async function iniciarMocks() {
  if (!mocksAtivos) return
  const { worker } = await import('./mocks/browser')
  await worker.start({ quiet: true })
}

iniciarMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
})
