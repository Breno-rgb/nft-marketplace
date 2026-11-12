export function abreviarEndereco(endereco: string) {
  return `${endereco.slice(0, 6)}…${endereco.slice(-4)}`
}
