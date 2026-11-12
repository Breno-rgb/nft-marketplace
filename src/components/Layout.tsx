import { Outlet } from '@tanstack/react-router'
import { Header } from './Header'
import { Avisos } from './Avisos'
import { PainelDeCenarios } from './PainelDeCenarios'
import { mocksAtivos } from '../lib/ambiente'
import { useTempoReal } from '../hooks/useTempoReal'

export function Layout() {
  useTempoReal()
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-laranja focus:px-3 focus:py-2 focus:text-fundo">
        Pular para o conteúdo
      </a>
      <Header />
      <div id="conteudo">
        <Outlet />
      </div>
      <Avisos />
      {mocksAtivos && <PainelDeCenarios />}
    </>
  )
}
