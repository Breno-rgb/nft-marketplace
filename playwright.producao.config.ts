import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Roda os mesmos testes contra o site publicado: URL=https://... npm run test:e2e:producao
export default defineConfig({
  ...base,
  webServer: undefined,
  use: { ...base.use, baseURL: process.env.URL ?? 'https://nft-marketplace-pearl-one.vercel.app' },
})
