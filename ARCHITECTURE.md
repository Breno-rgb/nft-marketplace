# Arquitetura

## Visão geral

```
Tela (pages/, components/)
  └─ hooks/ (TanStack Query: cache, estados, otimismo)
       └─ api/ (Axios: uma função por endpoint, interceptors de sessão)
            └─ rede ── MSW no navegador (mocks/) ── banco simulado (localStorage)
lib/tempoReal.ts ── socket.io-client ── MSW WebSocket + @mswjs/socket.io-binding
```

As telas não sabem que o servidor é simulado: falam só com hooks, que falam só com `api/`. Toda simulação (dados, latência, erros, pagamento, eventos) fica em `src/mocks/` e entra pela camada de rede. Com `VITE_MOCKS=false` o mesmo código aponta para um backend real em `/api`.

Os tipos de `src/types/` são o contrato compartilhado entre o app e os mocks.

## Contratos REST

Todas as respostas de erro seguem `{ mensagem: string, codigo?: string, campos?: Record<string, string> }`. `campos` traz o erro de cada campo de formulário, que a tela mostra junto do campo e foca o primeiro.

| Método e rota | Uso | Erros principais |
| --- | --- | --- |
| `GET /api/nfts` | Catálogo: `busca`, `categorias` (vírgula), `rede`, `precoMin`, `precoMax`, `ordenar`, `pagina`, `porPagina`. Devolve página + facetas por categoria | — |
| `GET /api/nfts/:id` | Detalhe do NFT (preço, edições, `versao`) | 404 |
| `GET /api/carrinho` | Carrinho do usuário ou do visitante, com resumo calculado no servidor | 401 sessão |
| `POST /api/carrinho/itens` | `{ nftId, edicao, quantidade }`; soma no mesmo item | 409 limite ou esgotado |
| `PATCH /api/carrinho/itens/:id` | Nova quantidade | 409 acima do disponível |
| `DELETE /api/carrinho/itens/:id` | Remove item (limpa cupom se esvaziar) | 404 |
| `POST / DELETE /api/carrinho/cupom` | `KURIO10` válido, `KURIO20` expirado, outros inválidos | 400 |
| `POST /api/auth/cadastro` | `{ nome, email, senha }` → `{ token, expiraEm, usuario }` | 409 email em uso, 422 |
| `POST /api/auth/login` | `{ email, senha }` → `{ token, expiraEm, usuario }` | 401 |
| `GET /api/auth/sessao` | Usuário do token | 401 `SESSAO_EXPIRADA` / `SESSAO_INVALIDA` |
| `POST /api/auth/logout` | Encerra a sessão | — |
| `GET / PUT / DELETE /api/favoritos[/:nftId]` | Lista e alterna favoritos | 401 |
| `GET / PATCH / DELETE /api/perfil` | Dados; trocar email e apagar conta exigem a senha | 400 senha, 409 email, 422 |
| `PUT / DELETE /api/perfil/avatar` | Imagem em data URL (já reduzida a 256 px no cliente) | 413, 422 |
| `POST /api/perfil/senha` | `{ senhaAtual, novaSenha }` | 400, 422 |
| `GET / POST / PATCH / DELETE /api/carteiras[/:id]` | Principal e secundária; `PATCH { tipo: 'principal' }` troca a principal | 409 duplicada, 422 endereço |
| `GET / POST / DELETE /api/carteiras/...conexao` | Conexão simulada da carteira na rede escolhida | 403 recusada |
| `POST /api/cotacao` | Congela itens, preços, cupom, taxa e total por 10 min | 400 vazio, 409 esgotado |
| `POST /api/pedidos` | Cabeçalho `Idempotency-Key`; `{ cotacaoId, carteiraId, rede, comprador }` → pedido `pendente` | 409 `COTACAO_DESATUALIZADA` (com nova cotação), `ESGOTADO`, `CARTEIRA_DESCONECTADA`, `IDEMPOTENCIA_CONFLITO`; 422 |
| `GET /api/pedidos/:id` | Pedido com `status` e `versao` | 403 outra conta, 404 |

## Eventos Socket.IO

| Evento | Quem recebe | Payload |
| --- | --- | --- |
| `nft.updated` | Todas as conexões (dado público) | `{ id, nftId, nome, versao, precoEth, precoAnteriorEth, edicoes, pedidoId \| null, emitidoEm }` |
| `order.updated` | Só as conexões do dono do pedido | `{ id, pedidoId, versao, pedido, emitidoEm }` |

- **Duplicados:** cada evento tem `id`; o cliente guarda os últimos 300 e ignora repetidos.
- **Fora de ordem:** cada NFT e cada pedido tem `versao`; evento com versão menor ou igual à conhecida é descartado.
- **Reconexão:** ao reconectar, o cliente invalida catálogo, detalhe, carrinho, pedidos e conexão da carteira e busca o estado atual via REST, porque eventos podem ter se perdido.
- **Isolamento:** a conexão é aberta com o token da sessão. No login, logout ou expiração ela é fechada e reaberta; eventos da conexão antiga são descartados.
- O `socket.io-client` é importado só depois do MSW ativo, para usar o WebSocket já interceptado.

## Política de sessão

- Token opaco no `localStorage` (sobrevive ao refresh). Validade de **30 minutos a partir do login**, sem renovação: decisão de segurança para um computador esquecido aberto.
- Um interceptor do Axios envia `Authorization: Bearer`. Resposta 401 com `SESSAO_EXPIRADA` ou `SESSAO_INVALIDA` limpa o token e os dados privados do cache. Em rota privada, a rota é revalidada e o guard manda para `/login?redirect=<rota>&motivo=expirou`; em rota pública, só um aviso.
- Rotas privadas (perfil, carteiras, pagamento, pedido) ficam sob uma rota de layout com `beforeLoad`. O `redirect` só aceita caminhos internos, para evitar open redirect.
- Senhas: hash SHA-256 com o id do usuário como sal (simulação; um backend real usaria bcrypt ou argon2).

## Estado do carrinho

- O carrinho mora no servidor (simulado), um por usuário e um de visitante. O resumo (subtotal, desconto, taxa, total) é sempre calculado no servidor.
- No login, os itens do visitante são somados ao carrinho da conta, respeitando o limite de cada edição.
- Valores em ETH trafegam como texto e são calculados com `BigInt` em unidades de 6 casas, sem erro de ponto flutuante.
- Limite por edição: o menor entre o disponível e 10. A tela desconta o que já está no carrinho e pede confirmação ao adicionar mais de um item que já está lá.
- Compra confirmada remove do carrinho só o que foi comprado e baixa o estoque; recusa mantém tudo.

## Estratégia de cache (TanStack Query)

| Chave | Conteúdo | Política |
| --- | --- | --- |
| `['nfts', filtros]` | Páginas do catálogo | `staleTime` 30 s, `keepPreviousData` (sem piscar ao filtrar), cancelamento via `AbortSignal` |
| `['nft', id]` | Detalhe | Atualizado direto pelos eventos `nft.updated` |
| `['carrinho']` | Carrinho | Mutações gravam a resposta no cache; quantidade e remoção são otimistas com rollback |
| `['sessao']` | Usuário logado | `staleTime` 5 min, sem retry |
| `['favoritos', usuarioId]`, `['perfil', id]`, `['carteiras', id]`, `['pedidos', id, pedidoId]` | Dados privados | Chave com o id do usuário; removidos no login, logout e expiração |

Padrões: `retry: 1` em consultas, nenhuma em mutações; mutações otimistas (favoritos, quantidade, remoção) cancelam consultas em andamento, guardam o estado anterior e desfazem no erro.

## Reconciliação REST × Socket.IO

- O REST é a fonte da verdade; os eventos aceleram a atualização.
- `nft.updated` atualiza `['nft', id]` e as páginas do catálogo no cache e invalida o carrinho, cujo total é recalculado pelo servidor. Se o item está no carrinho, um aviso explica a mudança. Se a revisão do pagamento contém o item, ela é descartada e o usuário revisa de novo.
- `order.updated` grava o pedido no cache se a versão for maior. Com o socket conectado, a consulta periódica do pedido pendente cai para 10 s (rede de segurança); desconectado, volta a 1,5 s.
- A confirmação final nunca depende do evento: o servidor revalida a cotação no `POST /api/pedidos`.

## Compra: cotação e idempotência

1. **Revisar** cria uma cotação (foto de itens, preços, cupom, taxa e total).
2. **Confirmar** envia a cotação com uma `Idempotency-Key` derivada da tentativa (mesma cotação + mesmos dados = mesma chave, guardada no `sessionStorage`).
3. O servidor revalida preço, estoque, cupom, carteira e validade. Divergência → 409 com nova cotação; a tela destaca o que mudou e pede nova confirmação.
4. Timeout ou queda de conexão → a tela reenvia uma vez com a mesma chave e recupera o pedido já criado. Clique duplo é bloqueado e, mesmo assim, a chave impede duplicar.
5. O pedido nasce `pendente`; a confirmação ou recusa chega por `order.updated` e a URL `/pedidos/:id` sobrevive ao refresh. O recibo é a foto do pedido.

## Acessibilidade

Navegação por teclado com foco visível, link "Pular para o conteúdo", erros ligados aos campos (`aria-invalid`, `aria-describedby`) com foco no primeiro inválido, avisos em `aria-live`, `aria-current` na paginação e trilha, diálogos, menu e abas do shadcn/ui (Radix), animações desligadas com `prefers-reduced-motion`.

## Performance

Imagens WebP com dimensões declaradas, primeiras imagens do catálogo com prioridade alta, fonte Space Mono servida pelo próprio site, rotas secundárias carregadas sob demanda e a interface renderizando em paralelo à inicialização do MSW. Resultados em [lighthouse/RESULTADOS.md](./lighthouse/RESULTADOS.md).

**Abaixo da meta:** Performance mobile no detalhe do NFT (87, meta 90) e início no limite (90). Causa principal: o servidor simulado roda no próprio navegador (MSW + binding Socket.IO, cerca de 160 KB comprimidos) e precisa registrar o service worker antes da primeira resposta da API, o que atrasa o LCP (a imagem do NFT depende dessa resposta) e soma tempo de CPU no perfil mobile, que simula um aparelho 4× mais lento. Com um backend real esse código não iria para produção. Desktop fica entre 99 e 100 em todas as categorias.

## Decisões de UX

- Busca com debounce de 350 ms; filtros, ordenação e página ficam na URL; mudar filtro volta para a página 1 sem rolar a tela para o topo.
- Ao adicionar um NFT que já está no carrinho, um diálogo mostra quantas unidades existem e quantas serão adicionadas; o seletor volta para 1 depois de adicionar.
- Trocar email e apagar a conta pedem a senha; nome e bio, não.
- Favoritar sem login leva ao login e volta para o NFT.
- Formulário do pagamento é salvo como rascunho na aba e volta depois de um login por sessão expirada.

## Desvios do Figma e limitações

- "Criadores" e "Aprenda" aparecem desabilitados (fora do escopo do enunciado).
- Telas e estados não desenhados (erros, vazios, pendente, recusado, diálogos, painel de cenários) seguem as cores, tipografia e componentes do restante do layout.
- A aba "Avaliações" do NFT mostra só o total; não há avaliações individuais nos dados.
- Transações e explorador de blocos são simulados; nenhuma carteira real é conectada.
- `@mswjs/socket.io-binding` declara compatibilidade com MSW 2; foi validado com MSW 3 e é instalado com `legacy-peer-deps` (configurado no `.npmrc`).
- Os mocks são importados no bundle principal para iniciar junto com a página (ganho de LCP); com `VITE_MOCKS=false` eles não são iniciados, mas continuam no bundle.
- O tempo real é simulado dentro de cada aba: duas abas abertas não compartilham eventos entre si.
- As imagens de referência da regressão visual dependem do sistema operacional; na primeira execução numa plataforma nova elas são gravadas (`updateSnapshots: 'missing'`).
