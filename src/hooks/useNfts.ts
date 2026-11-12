import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { buscarNft, listarNfts, type FiltrosDeNfts } from '../api/nfts'

export function useNfts(filtros: FiltrosDeNfts) {
  return useQuery({
    queryKey: ['nfts', filtros],
    queryFn: ({ signal }) => listarNfts(filtros, signal),
    placeholderData: keepPreviousData,
  })
}

export function useNft(id: string) {
  return useQuery({
    queryKey: ['nft', id],
    queryFn: ({ signal }) => buscarNft(id, signal),
  })
}
