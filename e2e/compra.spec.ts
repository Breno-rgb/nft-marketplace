import { test, expect } from '@playwright/test'
import { abrir, adicionarAoCarrinho, badgeDoCarrinho, contarPedidos, entrarDireto, irAteRevisao, mudarCenarios, BRUNO } from './apoio'

test.beforeEach(async ({ page }) => {
  await abrir(page, '/')
  await entrarDireto(page)
})

test('compra confirmada mostra o recibo e esvazia o carrinho @mobile', async ({ page }) => {
  await adicionarAoCarrinho(page, '2')
  await irAteRevisao(page)
  await page.getByRole('button', { name: 'CONFIRMAR COMPRA' }).click()
  await expect(page.getByRole('heading', { name: 'Aguardando confirmação da rede' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Compra confirmada!' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Recibo' })).toBeVisible()
  await expect.poll(() => badgeDoCarrinho(page)).toBe('Carrinho, 0 itens')
})

test('pagamento recusado mantém os itens no carrinho', async ({ page }) => {
  await mudarCenarios(page, { pagamento: 'recusado' })
  await adicionarAoCarrinho(page, '3')
  await irAteRevisao(page)
  await page.getByRole('button', { name: 'CONFIRMAR COMPRA' }).click()
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 15_000 })
  await expect.poll(() => badgeDoCarrinho(page)).toBe('Carrinho, 1 item')
})

test('preço que muda antes de confirmar exige nova confirmação', async ({ page }) => {
  await mudarCenarios(page, { checkout: 'preco-muda' })
  await adicionarAoCarrinho(page, '4')
  await irAteRevisao(page)
  await page.getByRole('button', { name: 'CONFIRMAR COMPRA' }).click()
  await expect(page.getByRole('alert')).toContainText('Os valores mudaram')
  await expect(page.getByText('Preço atualizado')).toBeVisible()
  await page.getByRole('button', { name: 'CONFIRMAR NOVO VALOR' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada!' })).toBeVisible({ timeout: 15_000 })
})

test('edição que esgota durante a compra bloqueia o pedido', async ({ page }) => {
  await mudarCenarios(page, { checkout: 'esgota' })
  await adicionarAoCarrinho(page, '6')
  await irAteRevisao(page)
  await page.getByRole('button', { name: 'CONFIRMAR COMPRA' }).click()
  await expect(page.getByRole('alert')).toContainText('esgotou')
  await expect(page.getByRole('link', { name: 'Ajustar carrinho' })).toBeVisible()
  expect(await contarPedidos(page)).toBe(0)
})

test('timeout depois de criar o pedido recupera o mesmo pedido, sem duplicar', async ({ page }) => {
  test.slow()
  await mudarCenarios(page, { pedido: 'timeout' })
  await adicionarAoCarrinho(page, '7')
  await irAteRevisao(page)
  await page.getByRole('button', { name: 'CONFIRMAR COMPRA' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada!' })).toBeVisible({ timeout: 30_000 })
  expect(await contarPedidos(page)).toBe(1)
})

test('clique duplo em confirmar cria um pedido só', async ({ page }) => {
  await adicionarAoCarrinho(page, '8')
  await irAteRevisao(page)
  await page.getByRole('button', { name: 'CONFIRMAR COMPRA' }).dblclick()
  await expect(page).toHaveURL(/\/pedidos\//)
  expect(await contarPedidos(page)).toBe(1)
})

test('carteira que recusa a conexão mostra o erro', async ({ page }) => {
  await mudarCenarios(page, { carteira: 'recusa' })
  await adicionarAoCarrinho(page, '9')
  await page.goto('/pagamento')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('alert')).toContainText('conexão foi recusada')
})

test('outro usuário não abre o pedido', async ({ page }) => {
  await adicionarAoCarrinho(page, '10')
  await irAteRevisao(page)
  await page.getByRole('button', { name: 'CONFIRMAR COMPRA' }).click()
  await expect(page).toHaveURL(/\/pedidos\//)
  const caminho = new URL(page.url()).pathname

  await page.getByRole('button', { name: /abrir menu da conta/ }).click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
  await entrarDireto(page, BRUNO)
  await page.goto(caminho)
  await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
  await expect(page.getByText('Este pedido pertence a outra conta.')).toBeVisible()
})
