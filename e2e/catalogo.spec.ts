import { test, expect } from '@playwright/test'
import { abrir } from './apoio'

test('busca, filtros e ordenação ficam na URL e sobrevivem ao refresh @mobile', async ({ page }) => {
  await abrir(page, '/')
  const filtros = page.getByRole('complementary', { name: 'Filtros' })
  const botaoFiltros = filtros.getByRole('button', { expanded: false })
  if (await botaoFiltros.isVisible()) await botaoFiltros.click()

  await filtros.getByRole('checkbox', { name: /Música/ }).check()
  await page.getByLabel('Ordenar por').selectOption('menor-preco')
  await expect(page).toHaveURL(/categorias=M%C3%BAsica|categorias=Música/)
  await expect(page).toHaveURL(/ordenar=menor-preco/)

  await page.reload()
  await expect(page.getByLabel('Ordenar por')).toHaveValue('menor-preco')
  await expect(page.locator('#catalogo article').first()).toBeVisible()
  const precos = await page.locator('#catalogo article').allInnerTexts()
  expect(precos.length).toBeGreaterThan(0)
  expect(precos.every((texto) => /Golden/.test(texto))).toBe(true)
})

test('busca sem resultado mostra estado vazio', async ({ page }) => {
  await abrir(page, '/')
  await page.getByLabel('Buscar NFT').fill('nada-com-esse-nome')
  await expect(page).toHaveURL(/busca=nada-com-esse-nome/)
  await expect(page.getByText(/Nenhum NFT encontrado/i)).toBeVisible()
})

test('NFT inexistente mostra página de não encontrado', async ({ page }) => {
  await abrir(page, '/nft/9999')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})
