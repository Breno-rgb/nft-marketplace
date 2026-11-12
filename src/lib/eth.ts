const CASAS = 6
const ESCALA = 10n ** BigInt(CASAS)

export function paraUnidades(valor: string): bigint {
  const [inteiro, decimal = ''] = valor.split('.')
  return BigInt(inteiro || '0') * ESCALA + BigInt((decimal + '0'.repeat(CASAS)).slice(0, CASAS))
}

export function deUnidades(unidades: bigint): string {
  const inteiro = unidades / ESCALA
  const decimal = (unidades % ESCALA).toString().padStart(CASAS, '0').replace(/0+$/, '')
  return `${inteiro}.${decimal.padEnd(2, '0')}`
}

export function multiplicar(precoEth: string, quantidade: number): string {
  return deUnidades(paraUnidades(precoEth) * BigInt(quantidade))
}
