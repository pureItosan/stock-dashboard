import { Users } from 'lucide-react'
import { formatNumber, formatPercent, getChangeColor } from '../utils/format'

interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

interface Props {
  stocks: Stock[]
  sectorName: string
  loading: boolean
  onStockClick: (symbol: string) => void
}

export default function RelatedStocks({ stocks, sectorName, loading, onStockClick }: Props) {
  if (loading) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> 同類股
        </h3>
        <div className="space-y-2 animate-pulse-gentle">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" /> 同類股
        {sectorName && (
          <span className="badge bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
            {sectorName}
          </span>
        )}
      </h3>
      <div className="space-y-0.5 max-h-[300px] overflow-y-auto scrollbar-thin">
        {stocks.length === 0 && (
          <p className="text-sm text-gray-500 py-4 text-center">無同類股資料</p>
        )}
        {stocks.map((stock) => (
          <button
            key={stock.symbol}
            onClick={() => onStockClick(stock.symbol)}
            className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="text-left">
              <div className="text-sm font-medium">
                {stock.symbol.replace('.TW', '').replace('.TWO', '')}
              </div>
              <div className="text-xs text-gray-500 truncate max-w-[100px]">{stock.name}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{formatNumber(stock.price)}</div>
              <div className={`text-xs font-medium ${getChangeColor(stock.changePercent)}`}>
                {formatPercent(stock.changePercent)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
