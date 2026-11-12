import { expect, type Page } from '@playwright/test'

export const ANA = { email: 'ana@kurio.dev', senha: 'Kurio@123' }
export const BRUNO = { email: 'bruno@kurio.dev', senha: 'Kurio@123' }

type Cenarios = Partial<{
  latencia: string
  falha: string
  favoritos: string
  carteira: string
  checkout: string
  pedido: string
  pagamento: string
}>

// Cada teste roda num navegador limpo: o banco simulado começa no estado padrão.
// Sem atraso artificial, para os testes serem rápidos e determinísticos.
export async function abrir(page: Page, caminho = '/', cenarios: Cenarios = {}) {
  await page.addInitScript((iniciais) => {
    if (!sessionStorage.getItem('e2e-iniciado')) {
      sessionStorage.setItem('e2e-iniciado', '1')
      localStorage.setItem('kurio-cenarios', JSON.stringify({ latencia: 'instantanea', ...iniciais }))
    }
  }, cenarios)
  await page.goto(caminho)
}

export async function mudarCenarios(page: Page, cenarios: Cenarios) {
  await page.evaluate((novos) => {
    const atuais = JSON.parse(localStorage.getItem('kurio-cenarios') ?? '{}')
    localStorage.setItem('kurio-cenarios', JSON.stringify({ ...atuais, ...novos }))
  }, cenarios)
}

export async function entrar(page: Page, conta = ANA) {
  await page.getByLabel('Email').fill(conta.email)
  await page.getByLabel('Senha', { exact: true }).fill(conta.senha)
  await page.getByRole('button', { name: 'ENTRAR' }).click()
}

export async function entrarDireto(page: Page, conta = ANA) {
  await page.goto('/login')
  await entrar(page, conta)
  await expect(page.getByRole('button', { name: /abrir menu da conta/ })).toBeVisible()
}

export async function adicionarAoCarrinho(page: Page, nftId: string, edicao = '1/50') {
  await page.goto(`/nft/${nftId}`)
  await page.getByRole('button', { name: edicao, exact: true }).click()
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page.getByText('Adicionado ao carrinho')).toBeVisible()
}

export async function irAteRevisao(page: Page) {
  await page.goto('/pagamento')
  await page.getByLabel('Telefone').fill('11912345678')
  const conectar = page.getByRole('button', { name: 'Conectar carteira' })
  await expect(page.getByRole('button', { name: 'REVISAR PEDIDO' })).toBeEnabled()
  if (await conectar.isVisible()) await conectar.click()
  await expect(page.getByText(/Carteira conectada/)).toBeVisible()
  await page.getByRole('button', { name: 'REVISAR PEDIDO' }).click()
  await expect(page.getByRole('button', { name: /CONFIRMAR/ })).toBeVisible()
}

export async function contarPedidos(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('kurio-mocks-v3') ?? '{"pedidos":[]}').pedidos.length as number)
}

export async function badgeDoCarrinho(page: Page) {
  return page.getByRole('link', { name: /^Carrinho, \d+ ite/ }).getAttribute('aria-label')
}
