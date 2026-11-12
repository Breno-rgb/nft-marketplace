import { test, expect } from '@playwright/test'
import { abrir, adicionarAoCarrinho, badgeDoCarrinho, entrar } from './apoio'

test('adiciona, altera quantidade e aplica cupom', async ({ page }) => {
  await abrir(page, '/')
  await adicionarAoCarrinho(page, '2')
  await page.goto('/carrinho')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(page.getByRole('group', { name: /Quantidade de/ })).toContainText('2')
  await expect.poll(() => badgeDoCarrinho(page)).toBe('Carrinho, 2 itens')

  await page.getByLabel('Código promocional').fill('KURIO20')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Este cupom expirou.')

  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText(/Desconto/)).toBeVisible()
})

test('o carrinho de visitante passa para a conta no login', async ({ page }) => {
  await abrir(page, '/')
  await adicionarAoCarrinho(page, '4')
  await page.getByRole('link', { name: 'Entrar' }).click()
  await entrar(page)
  await expect(page).toHaveURL(/\/nft\/4/)
  await expect.poll(() => badgeDoCarrinho(page)).toBe('Carrinho, 1 item')
})
