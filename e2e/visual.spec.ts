import { test, expect, type Page } from '@playwright/test'
import { abrir } from './apoio'

// Regressão visual: compara com as imagens de referência em e2e/__screenshots__.
// Fontes e renderização mudam entre sistemas, por isso as referências são separadas por plataforma.

// Rola a página inteira para as imagens "lazy" carregarem e espera todas terminarem antes da foto.
async function esperarPaginaPronta(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y)
      await new Promise((resolver) => setTimeout(resolver, 50))
    }
    window.scrollTo(0, 0)
    await document.fonts.ready
  })
  await page.waitForFunction(() => Array.from(document.images).every((imagem) => imagem.complete && imagem.naturalWidth > 0))
}

const opcoes = (page: Page) => ({
  fullPage: true,
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.02,
  mask: [page.getByRole('button', { name: /Cenários/ })],
})

test.describe('regressão visual', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('início', async ({ page }) => {
    await abrir(page, '/')
    await expect(page.locator('#catalogo article').first()).toBeVisible()
    await esperarPaginaPronta(page)
    await expect(page).toHaveScreenshot('inicio.png', opcoes(page))
  })

  test('detalhe do NFT', async ({ page }) => {
    await abrir(page, '/nft/1')
    await expect(page.locator('#titulo-colecao ~ div article').first()).toBeVisible()
    await esperarPaginaPronta(page)
    await expect(page).toHaveScreenshot('detalhe.png', opcoes(page))
  })
})
