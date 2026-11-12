import { test, expect } from '@playwright/test'
import { abrir, entrarDireto, mudarCenarios } from './apoio'

test('erro do servidor mostra mensagem e "Tentar de novo" recupera', async ({ page }) => {
  await abrir(page, '/', { falha: 'erro-servidor' })
  await expect(page.getByText('O servidor está com problemas', { exact: false })).toBeVisible()
  await mudarCenarios(page, { falha: 'nenhuma' })
  await page.getByRole('button', { name: /Tentar de novo/i }).click()
  await expect(page.locator('#catalogo article').first()).toBeVisible()
})

test('falha ao favoritar desfaz a mudança otimista', async ({ page }) => {
  await abrir(page, '/')
  await entrarDireto(page)
  await mudarCenarios(page, { favoritos: 'falha' })
  await page.goto('/nft/3')
  const coracao = page.getByRole('button', { name: /Favoritar/ })
  await expect(coracao).toHaveAttribute('aria-pressed', 'false')
  await coracao.click()
  await expect(page.getByText('Não foi possível atualizar seus favoritos.', { exact: false })).toBeVisible()
  await expect(coracao).toHaveAttribute('aria-pressed', 'false')
})

test('diálogo do carrinho funciona pelo teclado', async ({ page }) => {
  await abrir(page, '/')
  await page.goto('/nft/2')
  await page.getByRole('button', { name: '1/50', exact: true }).click()
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page.getByText('Adicionado ao carrinho')).toBeVisible()
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Este NFT já está no seu carrinho' })
  await expect(dialogo).toBeVisible()
  await expect(dialogo.getByRole('button', { name: 'Voltar' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()
})
