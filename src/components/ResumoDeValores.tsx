import { Badge } from '@/components/ui/badge'
import type { Cupom } from '../types/carrinho'
import type { ItemDoPedido, ResumoDeValores as Resumo } from '../types/pedido'

export function ListaDeItens({ itens, destaques = [] }: { itens: ItemDoPedido[]; destaques?: string[] }) {
  return (
    <ul className="divide-y divide-borda">
      {itens.map((item) => {
        const chave = `${item.nftId}-${item.edicao}`
        const mudou = destaques.includes(chave)
        return (
          <li key={chave} className="flex items-center gap-3 py-3">
            <img src={item.imagem} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{item.nome}</p>
              <p className="text-xs text-apagado">
                Edição {item.edicao} · {item.quantidade} × {item.precoEth} ETH
              </p>
              {mudou && <Badge className="mt-1">Preço atualizado</Badge>}
            </div>
            <p className={`text-sm font-bold ${mudou ? 'text-laranja' : ''}`}>{item.totalEth} ETH</p>
          </li>
        )
      })}
    </ul>
  )
}

export function TabelaDeValores({ resumo, cupom }: { resumo: Resumo; cupom: Cupom | null }) {
  const temDesconto = resumo.descontoEth !== '0.00'
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
      <dt className="text-apagado">Subtotal</dt>
      <dd className="text-right">{resumo.subtotalEth} ETH</dd>
      {temDesconto && (
        <>
          <dt className="text-apagado">Desconto {cupom ? `(${cupom.codigo}, ${cupom.percentual}%)` : ''}</dt>
          <dd className="text-right text-laranja">−{resumo.descontoEth} ETH</dd>
        </>
      )}
      <dt className="text-apagado">Taxa de rede</dt>
      <dd className="text-right">{resumo.taxaRedeEth} ETH</dd>
      <dt className="border-t border-borda pt-3 font-bold">Total</dt>
      <dd className="border-t border-borda pt-3 text-right text-lg font-bold text-laranja">{resumo.totalEth} ETH</dd>
    </dl>
  )
}
