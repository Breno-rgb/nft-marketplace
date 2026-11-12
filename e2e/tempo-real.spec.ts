import { test, expect, type Page } from '@playwright/test'
import { abrir, adicionarAoCarrinho, entrarDireto, irAteRevisao } from './apoio'

type Ferramentas = Record<'mudarPreco' | 'repetirUltimoEvento' | 'enviarEventoAntigo' | 'derrubarConexao', () => string>

function ferramenta(page: Page, nome: keyof Ferramentas) {
  return page.evaluate((n) => (window as unknown as { kurioMocks: Ferramentas }).kurioMocks[n](), nome)
}

function estatisticas(page: Page) {
  return page.evaluate(() => ({ ...(window as unknown as { kurioTempoReal: Record<string, number> }).kurioTempoReal }))
}

async function esperarConexao(page: Page) {
  await page.getByRole('button', { name: /Cenários/ }).click()
  await expect(page.getByText('Socket.IO conectado')).toBeVisible()
  await page.keyboard.press('Escape')
}

test('mudança de preço chega pelo Socket.IO sem recarregar a página', async ({ page }) => {
  await abrir(page, '/')
  await adicionarAoCarrinho(page, '3')
  await esperarConexao(page)
  const preco = page.locator('main').getByText(/^\d+\.\d+ ETH$/).first()
  await expect(preco).toHaveText('1.79 ETH')

  await ferramenta(page, 'mudarPreco')
  await expect(preco).toHaveText('2.06 ETH')
  await expect(page.getByText(/mudou de 1.79 para 2.06 ETH/)).toBeVisible()
})

test('eventos repetidos e antigos são ignorados', async ({ page }) => {
  await abrir(page, '/')
  await adicionarAoCarrinho(page, '3')
  await esperarConexao(page)
  await ferramenta(page, 'mudarPreco')
  await expect.poll(async () => (await estatisticas(page)).aplicados).toBe(1)

  await ferramenta(page, 'repetirUltimoEvento')
  await expect.poll(async () => (await estatisticas(page)).repetidos).toBe(1)
  await ferramenta(page, 'enviarEventoAntigo')
  await expect.poll(async () => (await estatisticas(page)).antigos).toBe(1)
  await expect(page.locator('main').getByText(/^\d+\.\d+ ETH$/).first()).toHaveText('2.06 ETH')
})

test('reconecta sozinho e sincroniza com a API depois de uma queda', async ({ page }) => {
  await abrir(page, '/')
  await esperarConexao(page)
  await ferramenta(page, 'derrubarConexao')
  await expect.poll(async () => (await estatisticas(page)).reconexoes, { timeout: 10_000 }).toBe(1)
})

test('mudança de preço durante a revisão invalida a revisão', async ({ page }) => {
  await abrir(page, '/')
  await entrarDireto(page)
  await adicionarAoCarrinho(page, '3')
  await irAteRevisao(page)
  await ferramenta(page, 'mudarPreco')
  await expect(page.getByRole('alert')).toContainText('mudou enquanto você revisava')
  await expect(page.getByRole('button', { name: 'REVISAR PEDIDO' })).toBeVisible()
})
