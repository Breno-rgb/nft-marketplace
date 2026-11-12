const TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp']
const TAMANHO_MAXIMO = 5 * 1024 * 1024
const LADO = 256

export function problemaNaImagem(arquivo: File) {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) return 'Escolha uma imagem PNG, JPG ou WEBP.'
  if (arquivo.size > TAMANHO_MAXIMO) return 'A imagem pode ter no máximo 5 MB.'
  return null
}

// Corta no meio e reduz para 256x256 antes de enviar, assim o avatar fica leve.
export async function prepararAvatar(arquivo: File) {
  const bitmap = await createImageBitmap(arquivo)
  const lado = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = LADO
  canvas.height = LADO
  const contexto = canvas.getContext('2d')!
  contexto.drawImage(bitmap, (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, lado, 0, 0, LADO, LADO)
  bitmap.close()
  return canvas.toDataURL('image/webp', 0.85)
}
