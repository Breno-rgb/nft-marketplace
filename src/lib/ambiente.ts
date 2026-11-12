export const mocksAtivos = import.meta.env.VITE_MOCKS !== 'false'

let liberar: () => void = () => {}

// A tela aparece na hora; só os pedidos à API esperam o MSW ficar pronto.
export const mocksProntos = new Promise<void>((resolver) => {
  liberar = resolver
})

export function avisarQueMocksEstaoProntos() {
  liberar()
}
