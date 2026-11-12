# Kurio — Marketplace de NFTs

Solução do desafio frontend da Jungle Gaming: marketplace de NFTs em React + TypeScript com catálogo, detalhe, carrinho, pagamento, confirmação, login, cadastro, perfil e carteiras. Toda a API, a autenticação, as carteiras, os pagamentos e o tempo real são simulados no navegador com MSW.

- **Aplicação publicada:** https://nft-marketplace-pearl-one.vercel.app
- **Repositório:** https://github.com/Breno-rgb/nft-marketplace
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Auditoria Lighthouse:** [lighthouse/RESULTADOS.md](./lighthouse/RESULTADOS.md)

## Stack

| Responsabilidade | Tecnologia |
| --- | --- |
| Interface e linguagem | React 19 + TypeScript |
| Build | Vite |
| Roteamento | TanStack Router (rotas em código, busca validada na URL) |
| Estado remoto | TanStack Query |
| Cliente HTTP | Axios (interceptors de sessão) |
| Tempo real | Socket.IO (`socket.io-client` + `@mswjs/socket.io-binding`) |
| Estilização e componentes | Tailwind CSS v4 + shadcn/ui (Radix) |
| Mocking | MSW (REST e WebSocket) |
| Testes E2E e regressão visual | Playwright |
| Auditoria | Lighthouse |

## Como rodar

Requisitos: **Node.js 22.12 ou mais novo** e npm.

```bash
npm install                      # o .npmrc já ativa legacy-peer-deps (ver Limitações)
npm run dev                      # http://localhost:5173 com a API simulada
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks |
| `npm run build` | Verificação de tipos + build otimizado em `dist/` |
| `npm run preview` | Serve o build otimizado |
| `npm run typecheck` | Verificação de tipos (app, testes e configs) |
| `npm run lint` | Lint com oxlint |
| `npx playwright install chromium` | Baixa o navegador dos testes (uma vez só) |
| `npm run test:e2e` | 30 testes E2E e de regressão visual (sobe o build sozinho) |
| `npm run test:e2e:ui` | Mesmos testes no modo visual do Playwright |
| `npm run test:e2e:producao` | Roda os testes E2E contra a URL publicada |
| `npm run test:e2e:atualizar-visual` | Regrava as imagens de referência da regressão visual |
| `npm run lighthouse` | Build + 3 medições por página e perfil, relatórios em `lighthouse/` |

### Variáveis de ambiente

Nenhuma é obrigatória.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_MOCKS` | ligado | `VITE_MOCKS=false` desliga o MSW (para apontar para um backend real em `/api`) |
| `URL` | URL publicada | Destino do `npm run test:e2e:producao` |
| `CHROME_PATH` | Chrome instalado | Navegador usado pelo `npm run lighthouse` |

## Credenciais fictícias

| Conta | Email | Senha | Estado inicial |
| --- | --- | --- | --- |
| Ana | `ana@kurio.dev` | `Kurio@123` | 2 favoritos, 1 carteira principal |
| Bruno | `bruno@kurio.dev` | `Kurio@123` | Sem favoritos nem carteiras |

Também é possível criar contas pela tela de cadastro. As senhas são guardadas apenas como hash SHA-256.

## Cenários e reset

Os dados simulados ficam no `localStorage` do navegador e sobrevivem ao refresh.

- **Painel "Cenários"** (botão no canto inferior esquerdo): escolhe latência, falhas de rede, falha ao favoritar, recusa ou queda da carteira, mudança de preço ou esgotamento durante a compra, timeout na criação do pedido e resultado do pagamento. Também dispara eventos de tempo real e tem o botão **Resetar dados e recarregar**, que volta ao estado inicial conhecido.
- **Pela URL:** `/?cenario=pagamento:recusado,latencia:lenta` (`?cenario=padrao` restaura o padrão).
- **Pelo console:** `kurioMocks.resetar()`, `kurioMocks.expirarSessao()`, `kurioMocks.mudarPreco()`, `kurioMocks.derrubarConexao()`. `kurioTempoReal` mostra os contadores de eventos aplicados, repetidos, antigos e reconexões.

Cenários marcados "(1 vez)" voltam ao normal depois de acontecer, para a nova tentativa funcionar.

## Como reproduzir os fluxos de falha

| Fluxo | Passos |
| --- | --- |
| Pagamento recusado | Cenários → Resultado do pagamento: **Recusado** → comprar. Mostra "Pagamento recusado" e os itens continuam no carrinho. |
| Preço muda antes de confirmar | Cenários → Durante a compra: **Preço sobe** → revisar → confirmar. Mostra "Os valores mudaram" e pede nova confirmação. |
| Edição esgota | Cenários → Durante a compra: **Edição esgota** → confirmar. Bloqueia o pedido e mostra o link para ajustar o carrinho. |
| Timeout após criar o pedido | Cenários → Criação do pedido: **Timeout** → confirmar. A interface recupera o mesmo pedido pela chave de idempotência, sem duplicar. |
| Carteira recusa / desconecta | Cenários → Conexão da carteira: **Recusa** ou **Desconecta ao confirmar**. |
| Sessão expirada | Console: `kurioMocks.expirarSessao()` e qualquer ação. Em rota privada volta ao login com `?redirect=` e o rascunho do pagamento é preservado. |
| Falha de rede / erro 500 | Cenários → Falha de rede: **Sem conexão** ou **Erro 500**. As telas mostram o erro e "Tentar de novo". |
| Favorito falha | Cenários → Favoritar: **Falha**. O coração volta ao estado anterior (rollback). |
| Tempo real | Com um item no carrinho: Cenários → **Mudar preço**, **Repetir último evento**, **Enviar evento antigo**, **Derrubar conexão**. |
| Dados de outro usuário | Entrar como Ana, comprar, sair, entrar como Bruno e abrir a URL do pedido da Ana: "Pedido não encontrado". |

## Estrutura

```
src/
  api/          chamadas HTTP (Axios), uma função por endpoint
  hooks/        hooks do TanStack Query (consultas, mutações, otimismo)
  pages/        as 9 telas
  components/   componentes do app; ui/ = componentes do shadcn/ui
  lib/          sessão, validação, erros, tempo real, cálculo em ETH
  mocks/        MSW: handlers REST, Socket.IO, banco simulado e cenários
  types/        contratos (tipos) compartilhados entre app e mocks
e2e/            testes Playwright e imagens de referência
lighthouse/     configuração, resultados e relatórios da auditoria
scripts/        script da auditoria Lighthouse
```

## Uso de IA

Este projeto foi desenvolvido com o **Claude (Anthropic) como par de programação**. A maior parte do código foi escrita com assistência da IA. Eu, Breno, conduzi o trabalho: estudei e revisei cada parte, testei os fluxos manualmente, encontrei e reportei problemas (como o limite de quantidade no carrinho e a sessão expirando durante a compra) e tomei as decisões de produto, como a confirmação ao adicionar um item que já está no carrinho, a senha obrigatória para trocar email e apagar a conta, e a sessão de 30 minutos contados a partir do login. Os testes E2E e a auditoria Lighthouse validam o comportamento entregue.
