// Roda a auditoria Lighthouse no build otimizado, com o cenário padrão dos mocks.
// Uso: npm run lighthouse  (faz o build, sobe o preview, mede e grava lighthouse/relatorios + lighthouse/RESULTADOS.md)
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import * as chromeLauncher from 'chrome-launcher'
import { auditoria } from '../lighthouse/config.mjs'

const pasta = new URL('../lighthouse/relatorios/', import.meta.url)
const base = `http://localhost:${auditoria.porta}`

function caminhoDoChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  return undefined
}

async function esperarServidor() {
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    try {
      const resposta = await fetch(base)
      if (resposta.ok) return
    } catch {
      // ainda subindo
    }
    await new Promise((resolver) => setTimeout(resolver, 500))
  }
  throw new Error('O preview não respondeu a tempo.')
}

function mediana(valores) {
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados[Math.floor(ordenados.length / 2)]
}

const servidor = spawn('npx', ['vite', 'preview', '--port', String(auditoria.porta), '--strictPort'], { stdio: 'ignore', shell: true })

try {
  await esperarServidor()
  await rm(pasta, { recursive: true, force: true })
  await mkdir(pasta, { recursive: true })

  const chrome = await chromeLauncher.launch({ chromePath: caminhoDoChrome(), chromeFlags: ['--headless=new', '--no-sandbox'] })
  const versaoDoChrome = (await (await fetch(`http://127.0.0.1:${chrome.port}/json/version`)).json()).Browser
  const linhas = []

  for (const perfil of auditoria.perfis) {
    for (const pagina of auditoria.paginas) {
      const medicoes = []
      for (let n = 1; n <= auditoria.medicoesPorPagina; n++) {
        const resultado = await lighthouse(
          `${base}${pagina.caminho}`,
          { port: chrome.port, output: ['html', 'json'], onlyCategories: auditoria.categorias, logLevel: 'error' },
          perfil === 'desktop' ? desktopConfig : undefined,
        )
        const [html, json] = resultado.report
        const nome = `${perfil}-${pagina.nome}-${n}`
        await writeFile(new URL(`${nome}.html`, pasta), html)
        await writeFile(new URL(`${nome}.json`, pasta), json)
        const lhr = resultado.lhr
        medicoes.push({
          notas: Object.fromEntries(auditoria.categorias.map((c) => [c, Math.round(lhr.categories[c].score * 100)])),
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
          versao: lhr.lighthouseVersion,
        })
        console.log(`${nome}:`, medicoes.at(-1).notas)
      }
      linhas.push({
        perfil,
        pagina: pagina.nome,
        notas: Object.fromEntries(auditoria.categorias.map((c) => [c, mediana(medicoes.map((m) => m.notas[c]))])),
        lcp: mediana(medicoes.map((m) => m.lcp)),
        cls: mediana(medicoes.map((m) => m.cls)),
        tbt: mediana(medicoes.map((m) => m.tbt)),
        versao: medicoes[0].versao,
      })
    }
  }
  await chrome.kill()

  const pacote = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const marca = (nota, categoria) => `${nota}${nota >= auditoria.metas[categoria] ? '' : ' ⚠'}`
  const md = [
    '# Resultados do Lighthouse',
    '',
    `Mediana de ${auditoria.medicoesPorPagina} medições por página e perfil. Relatórios completos (HTML e JSON) em \`lighthouse/relatorios/\`.`,
    '',
    '| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...linhas.map(
      (l) =>
        `| ${l.perfil} | ${l.pagina} | ${marca(l.notas.performance, 'performance')} | ${marca(l.notas.accessibility, 'accessibility')} | ${marca(l.notas['best-practices'], 'best-practices')} | ${marca(l.notas.seo, 'seo')} | ${(l.lcp / 1000).toFixed(2)} s | ${l.cls.toFixed(3)} | ${Math.round(l.tbt)} ms |`,
    ),
    '',
    `Metas: Performance ≥ ${auditoria.metas.performance}, Acessibilidade ≥ ${auditoria.metas.accessibility}, Boas práticas ≥ ${auditoria.metas['best-practices']}, SEO ≥ ${auditoria.metas.seo}. ⚠ = abaixo da meta.`,
    '',
    '## Ambiente e condições',
    '',
    `- Data: ${new Date().toISOString()}`,
    `- Lighthouse ${linhas[0].versao} · ${versaoDoChrome} (headless) · Node ${process.version}`,
    `- Sistema: ${os.type()} ${os.release()} · ${os.cpus()[0]?.model ?? 'CPU'} × ${os.cpus().length}`,
    `- Build otimizado (\`vite build\` + \`vite preview\`), mocks (MSW) no cenário padrão, cache vazio a cada medição.`,
    '- Mobile: simulação padrão do Lighthouse (Moto G Power, 4G lento, CPU 4× mais lenta). Desktop: preset desktop do Lighthouse.',
    `- Projeto ${pacote.name}: vite ${pacote.devDependencies.vite}, react ${pacote.dependencies.react}.`,
    '',
  ].join('\n')
  await writeFile(new URL('../lighthouse/RESULTADOS.md', import.meta.url), md)
  console.log('\n' + md)
} finally {
  servidor.kill()
}
