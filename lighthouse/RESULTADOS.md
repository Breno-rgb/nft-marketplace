# Resultados do Lighthouse

Mediana de 3 medições por página e perfil. Relatórios completos (HTML e JSON) em `lighthouse/relatorios/`.

| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mobile | inicio | 90 | 100 | 100 | 100 | 3.29 s | 0.004 | 182 ms |
| mobile | detalhe | 87 ⚠ | 100 | 100 | 100 | 3.48 s | 0.000 | 218 ms |
| desktop | inicio | 100 | 100 | 100 | 100 | 0.24 s | 0.008 | 0 ms |
| desktop | detalhe | 100 | 100 | 100 | 100 | 0.78 s | 0.017 | 0 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. ⚠ = abaixo da meta.

## Ambiente e condições

- Data: 2026-11-12T23:18:01.121Z
- Lighthouse 13.6.0 · Chrome/153.0.8010.12 (headless) · Node v22.23.4
- Sistema: Linux 6.18.44-fc-v378 · Intel(R) Xeon(R) Processor @ 2.10GHz × 2
- Build otimizado (`vite build` + `vite preview`), mocks (MSW) no cenário padrão, cache vazio a cada medição.
- Mobile: simulação padrão do Lighthouse (Moto G Power, 4G lento, CPU 4× mais lenta). Desktop: preset desktop do Lighthouse.
- Projeto nft-marketplace: vite ^8.3.6, react ^19.3.1.
