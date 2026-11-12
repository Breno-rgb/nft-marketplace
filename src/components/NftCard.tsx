import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { Nft } from '../types/nft'

type Props = {
  nft: Nft
  // Cards que aparecem sem rolar a página carregam a imagem na hora, com prioridade alta.
  prioridade?: boolean
}

export function NftCard({ nft, prioridade = false }: Props) {
  const [semImagem, setSemImagem] = useState(false)

  return (
    <article className="overflow-hidden rounded-lg border border-borda bg-superficie transition hover:-translate-y-1 hover:border-laranja focus-within:border-laranja">
      <Link to="/nft/$id" params={{ id: nft.id }} className="block focus:outline-none">
        <div className="aspect-square bg-borda">
          {semImagem ? (
            <div className="flex h-full items-center justify-center text-3xl text-apagado" aria-hidden="true">
              {nft.nome.charAt(0)}
            </div>
          ) : (
            <img
              src={nft.imagem}
              alt={nft.nome}
              loading={prioridade ? 'eager' : 'lazy'}
              fetchPriority={prioridade ? 'high' : 'auto'}
              width={250}
              height={250}
              className="h-full w-full object-cover"
              onError={() => setSemImagem(true)}
            />
          )}
        </div>
        <div className="p-3">
          <h3 className="truncate text-sm">{nft.nome}</h3>
          <p className="mt-1 text-sm font-bold text-laranja">{nft.precoEth} ETH</p>
        </div>
      </Link>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-borda bg-superficie" aria-hidden="true">
      <div className="shimmer aspect-square" />
      <div className="space-y-2 p-3">
        <div className="shimmer h-4 w-3/4 rounded" />
        <div className="shimmer h-4 w-1/3 rounded" />
      </div>
    </div>
  )
}
