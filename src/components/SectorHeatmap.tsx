import { useState } from 'react'
import { LayoutGrid } from 'lucide-react'

interface HeatmapStock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  marketCap: number
}

interface SectorData {
  name: string
  stocks: HeatmapStock[]
  avgChange: number
}

interface Props {
  sectors: SectorData[]
  loading: boolean
  market: 'TW' | 'US'
  onStockClick: (symbol: string) => void
}

function getHeatColor(pct: number): string {
  if (pct > 3) return 'bg-red-600 text-white'
  if (pct > 2) return 'bg-red-500 text-white'
  if (pct > 1) return 'bg-red-400 text-white'
  if (pct > 0.3) return 'bg-red-300 text-red-900'
  if (pct > 0) return 'bg-red-200 text-red-800'
  if (pct === 0) return 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
  if (pct > -0.3) return 'bg-green-200 text-green-800'
  if (pct > -1) return 'bg-green-300 text-green-900'
  if (pct > -2) return 'bg-green-400 text-white'
  if (pct > -3) return 'bg-green-500 text-white'
  return 'bg-green-600 text-white'
}

export default function SectorHeatmap({ sectors, loading, market, onStockClick }: Props) {
  const [hoveredStock, setHoveredStock] = useState<HeatmapStock | null>(null)

  if (loading) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" /> 產業磚塊牆
        </h3>
        <div className="grid grid-cols-6 gap-1.5 animate-pulse-gentle">
          {[...Array(24)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" /> 產業磚塊牆
          <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs">
            {market === 'TW' ? '台股' : '美股'}
          </span>
        </h3>
        {hoveredStock && (
          <div className="text-xs text-gray-500">
            {hoveredStock.symbol} {hoveredStock.name} | {hoveredStock.price.toFixed(2)}{' '}
            <span className={hoveredStock.changePercent >= 0 ? 'text-red-500' : 'text-green-500'}>
              ({hoveredStock.changePercent >= 0 ? '+' : ''}{hoveredStock.changePercent.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {sectors.map((sector) => (
          <div key={sector.name}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {sector.name}
              </span>
              <span className={`text-xs font-semibold ${sector.avgChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {sector.avgChange >= 0 ? '+' : ''}{sector.avgChange.toFixed(2)}%
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {sector.stocks.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => onStockClick(stock.symbol)}
                  onMouseEnter={() => setHoveredStock(stock)}
                  onMouseLeave={() => setHoveredStock(null)}
                  className={`heatmap-cell px-2.5 py-2 rounded-lg text-center ${getHeatColor(stock.changePercent)} min-w-[80px] flex-1`}
                >
                  <div className="text-[10px] font-medium leading-tight opacity-80">
                    {stock.symbol.replace('.TW', '').replace('.TWO', '')}
                  </div>
                  <div className="text-xs font-bold leading-tight">
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(1)}%
                  </div>
                  <div className="text-[9px] leading-tight opacity-70 truncate">
                    {stock.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {sectors.length === 0 && (
          <p className="text-sm text-gray-500 py-8 text-center">載入產業資料中...</p>
        )}
      </div>
    </div>
  )
}
