import { test, expect } from '@playwright/test'
import { abrir, entrar, entrarDireto, BRUNO } from './apoio'

test('rota protegida manda para o login e volta depois', async ({ page }) => {
  await abrir(page, '/perfil')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil|\/login\?redirect=\/perfil/)
  await entrar(page)
  await expect(page).toHaveURL(/\/perfil$/)
  await expect(page.getByLabel('Nome')).toHaveValue('Ana Ribeiro')
})

test('login com senha errada mostra erro', async ({ page }) => {
  await abrir(page, '/login')
  await entrar(page, { email: 'ana@kurio.dev', senha: 'errada123' })
  await expect(page.getByRole('alert')).toHaveText('Email ou senha incorretos.')
})

test('cadastro valida campos e recusa email já usado', async ({ page }) => {
  await abrir(page, '/cadastro')
  await page.getByRole('button', { name: 'CRIAR CONTA' }).click()
  await expect(page.getByText('Informe seu nome.')).toBeVisible()
  await expect(page.getByLabel('Nome completo')).toBeFocused()

  await page.getByLabel('Nome completo').fill('Breno Teste')
  await page.getByLabel('Email').fill('ana@kurio.dev')
  await page.getByLabel('Senha', { exact: true }).fill('senha1234')
  await page.getByLabel('Confirme a senha').fill('senha1234')
  await page.getByRole('button', { name: 'CRIAR CONTA' }).click()
  await expect(page.getByText('Este email já está em uso.')).toBeVisible()

  await page.getByLabel('Email').fill('breno@kurio.dev')
  await page.getByRole('button', { name: 'CRIAR CONTA' }).click()
  await expect(page.getByRole('button', { name: /Breno, abrir menu da conta/ })).toBeVisible()
})

test('logout limpa os dados e outra conta não vê os favoritos da primeira', async ({ page }) => {
  await abrir(page, '/')
  await entrarDireto(page)
  await page.goto('/perfil')
  await expect(page.locator('#titulo-favoritos ~ div article')).toHaveCount(2)

  await page.getByRole('button', { name: /abrir menu da conta/ }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()

  await entrarDireto(page, BRUNO)
  await page.goto('/perfil')
  await expect(page.getByText('Você ainda não favoritou nenhum NFT.', { exact: false })).toBeVisible()
})

test('trocar email exige a senha atual', async ({ page }) => {
  await abrir(page, '/')
  await entrarDireto(page)
  await page.goto('/perfil')
  await page.getByLabel('Email').fill('ana.nova@kurio.dev')
  await page.getByRole('button', { name: 'SALVAR ALTERAÇÕES' }).click()
  await expect(page.getByText('Digite sua senha para trocar o email.')).toBeVisible()
  await page.getByLabel('Senha atual').first().fill('Kurio@123')
  await page.getByRole('button', { name: 'SALVAR ALTERAÇÕES' }).click()
  await expect(page.getByText('Dados salvos.')).toBeVisible()
})

test('sessão expirada no pagamento volta ao login e preserva o formulário', async ({ page }) => {
  await abrir(page, '/')
  await entrarDireto(page)
  await page.goto('/nft/5')
  await page.getByRole('button', { name: '1/50', exact: true }).click()
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page.getByText('Adicionado ao carrinho')).toBeVisible()
  await page.goto('/pagamento')
  await page.getByLabel('Nome completo').fill('Ana Expirada')
  await page.evaluate(() => (window as unknown as { kurioMocks: { expirarSessao: () => void } }).kurioMocks.expirarSessao())
  await page.getByRole('button', { name: 'Desconectar' }).or(page.getByRole('button', { name: 'Conectar carteira' })).click()
  await expect(page).toHaveURL(/\/login\?.*motivo=expirou/)
  await expect(page.getByText('Sua sessão expirou.', { exact: false })).toBeVisible()
  await entrar(page)
  await expect(page).toHaveURL(/\/pagamento$/)
  await expect(page.getByLabel('Nome completo')).toHaveValue('Ana Expirada')
})
