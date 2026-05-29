import { useState, useEffect } from 'react'
import { Flame, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { getMultipleQuotes, TW_SECTORS, US_SECTORS } from '../api/stock'
import { formatNumber, formatPercent, getChangeColor } from '../utils/format'

interface MoverItem {
  symbol: string
  name: string
  price: number
  changePercent: number
}

interface Props {
  onStockClick: (symbol: string) => void
  market: 'TW' | 'US'
}

type Tab = 'gainers' | 'losers'

export default function TopMovers({ onStockClick, market }: Props) {
  const [tab, setTab] = useState<Tab>('gainers')
  const [data, setData] = useState<MoverItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const sectors = market === 'TW' ? TW_SECTORS : US_SECTORS
    const allSymbols = Object.values(sectors).flatMap((s) => s.stocks)

    getMultipleQuotes(allSymbols)
      .then((quotes) => {
        if (cancelled) return
        setData(
          quotes
            .filter((q: any) => q.price > 0)
            .map((q: any) => ({
              symbol: q.symbol,
              name: q.name,
              price: q.price,
              changePercent: q.changePercent,
            }))
        )
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [market])

  const sorted = [...data].sort((a, b) =>
    tab === 'gainers' ? b.changePercent - a.changePercent : a.changePercent - b.changePercent
  ).slice(0, 8)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" /> 漲跌排行
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab('gainers')}
            className={`btn text-xs ${tab === 'gainers' ? 'btn-active border' : 'btn-ghost'}`}
          >
            漲幅
          </button>
          <button
            onClick={() => setTab('losers')}
            className={`btn text-xs ${tab === 'losers' ? 'btn-active border' : 'btn-ghost'}`}
          >
            跌幅
          </button>
        </div>
      </div>
      <div className="space-y-0.5">
        {loading && data.length === 0 && (
          <div className="space-y-2 animate-pulse-gentle">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-200 dark:bg-gray-800 rounded" />
            ))}
          </div>
        )}
        {sorted.map((item, idx) => {
          const isUp = item.changePercent >= 0
          return (
            <div
              key={item.symbol}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => onStockClick(item.symbol)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-400 w-4 text-right">{idx + 1}</span>
                <div>
                  <div className="text-sm font-semibold">{item.symbol.replace('.TW', '').replace('.TWO', '')}</div>
                  <div className="text-[10px] text-gray-500 truncate max-w-[80px]">{item.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatNumber(item.price)}</span>
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${getChangeColor(item.changePercent)}`}>
                  {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {formatPercent(item.changePercent)}
                </span>
              </div>
            </div>
          )
        })}
        {!loading && sorted.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-4">暫無資料</div>
        )}
      </div>
    </div>
  )
}
