export type Cenarios = {
  latencia: 'normal' | 'lenta' | 'instantanea'
  falha: 'nenhuma' | 'offline' | 'erro-servidor'
  favoritos: 'ok' | 'falha'
  carteira: 'aceita' | 'recusa' | 'desconecta'
  checkout: 'normal' | 'preco-muda' | 'esgota'
  pedido: 'normal' | 'timeout'
  pagamento: 'confirmado' | 'recusado'
}

export const CENARIOS_PADRAO: Cenarios = {
  latencia: 'normal',
  falha: 'nenhuma',
  favoritos: 'ok',
  carteira: 'aceita',
  checkout: 'normal',
  pedido: 'normal',
  pagamento: 'confirmado',
}

export const OPCOES_DE_CENARIO: { [K in keyof Cenarios]: { rotulo: string; opcoes: Record<Cenarios[K], string> } } = {
  latencia: { rotulo: 'Latência da API', opcoes: { normal: 'Normal (0,3 a 0,9 s)', lenta: 'Lenta (2 a 4 s)', instantanea: 'Sem atraso' } },
  falha: { rotulo: 'Falha de rede', opcoes: { nenhuma: 'Nenhuma', offline: 'Sem conexão', 'erro-servidor': 'Erro 500 em tudo' } },
  favoritos: { rotulo: 'Favoritar', opcoes: { ok: 'Funciona', falha: 'Falha (erro 500)' } },
  carteira: { rotulo: 'Conexão da carteira', opcoes: { aceita: 'Aceita', recusa: 'Usuário recusa', desconecta: 'Desconecta ao confirmar (1 vez)' } },
  checkout: { rotulo: 'Durante a compra', opcoes: { normal: 'Nada muda', 'preco-muda': 'Preço sobe 10% (1 vez)', esgota: 'Edição esgota (1 vez)' } },
  pedido: { rotulo: 'Criação do pedido', opcoes: { normal: 'Responde normal', timeout: 'Timeout após criar (1 vez)' } },
  pagamento: { rotulo: 'Resultado do pagamento', opcoes: { confirmado: 'Confirmado', recusado: 'Recusado' } },
}

const CHAVE = 'kurio-cenarios'

export function lerCenarios(): Cenarios {
  try {
    return { ...CENARIOS_PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') }
  } catch {
    return CENARIOS_PADRAO
  }
}

export function salvarCenarios(cenarios: Cenarios) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(cenarios))
  } catch {
    // sem localStorage: os cenários voltam ao padrão no próximo carregamento
  }
}

// Permite abrir o app já num cenário, ex.: /?cenario=pagamento:recusado,latencia:lenta
export function aplicarCenariosDaUrl() {
  const parametro = new URLSearchParams(location.search).get('cenario')
  if (!parametro) return
  const atuais = parametro === 'padrao' ? { ...CENARIOS_PADRAO } : lerCenarios()
  for (const par of parametro.split(',')) {
    const [chave, valor] = par.split(':') as [keyof Cenarios, string]
    if (chave in OPCOES_DE_CENARIO && valor in OPCOES_DE_CENARIO[chave].opcoes) {
      Object.assign(atuais, { [chave]: valor })
    }
  }
  salvarCenarios(atuais)
}
