type Props = {
  nome: string
  avatar: string | null
  tamanho?: 'p' | 'g'
}

const tamanhos = {
  p: 'h-8 w-8 text-sm',
  g: 'h-24 w-24 text-3xl',
}

export function Avatar({ nome, avatar, tamanho = 'p' }: Props) {
  if (avatar) {
    return <img src={avatar} alt="" className={`${tamanhos[tamanho]} shrink-0 rounded-full object-cover`} />
  }
  return (
    <span aria-hidden="true" className={`${tamanhos[tamanho]} flex shrink-0 items-center justify-center rounded-full bg-laranja font-bold text-fundo`}>
      {nome.trim()[0]?.toUpperCase()}
    </span>
  )
}
