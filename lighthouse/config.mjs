// Configuração da auditoria Lighthouse (versionada junto com o código).
// Páginas: início e detalhe do NFT. Perfis: mobile (padrão do Lighthouse) e desktop. 3 medições cada.
export const auditoria = {
  porta: 4180,
  medicoesPorPagina: 3,
  paginas: [
    { nome: 'inicio', caminho: '/' },
    { nome: 'detalhe', caminho: '/nft/1' },
  ],
  perfis: ['mobile', 'desktop'],
  categorias: ['performance', 'accessibility', 'best-practices', 'seo'],
  metas: { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 },
}
