import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { getMultipleQuotes } from '../api/stock'

const INDICES = [
  { symbol: '^TWII', label: '加權指數' },
  { symbol: '^DJI', label: '道瓊' },
  { symbol: '^IXIC', label: 'NASDAQ' },
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^SOX', label: '費半' },
  { symbol: '^VIX', label: 'VIX' },
]

interface IndexData {
  symbol: string
  label: string
  price: number
  change: number
  changePercent: number
}

export default function MarketTicker() {
  const [data, setData] = useState<IndexData[]>([])

  useEffect(() => {
    let cancelled = false
    const symbols = INDICES.map((i) => i.symbol)
    getMultipleQuotes(symbols)
      .then((quotes) => {
        if (cancelled) return
        const result = INDICES.map((idx) => {
          const q = quotes.find((q: any) => q.symbol === idx.symbol)
          return {
            symbol: idx.symbol,
            label: idx.label,
            price: q?.price ?? 0,
            change: q?.change ?? 0,
            changePercent: q?.changePercent ?? 0,
          }
        }).filter((d) => d.price > 0)
        setData(result)
      })
      .catch(() => {})

    const timer = setInterval(() => {
      getMultipleQuotes(symbols)
        .then((quotes) => {
          if (cancelled) return
          const result = INDICES.map((idx) => {
            const q = quotes.find((q: any) => q.symbol === idx.symbol)
            return {
              symbol: idx.symbol,
              label: idx.label,
              price: q?.price ?? 0,
              change: q?.change ?? 0,
              changePercent: q?.changePercent ?? 0,
            }
          }).filter((d) => d.price > 0)
          setData(result)
        })
        .catch(() => {})
    }, 60000)

    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  if (data.length === 0) return null

  return (
    <div className="border-b bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="flex items-center gap-6 py-2 overflow-x-auto scrollbar-thin">
          {data.map((d) => {
            const isUp = d.change >= 0
            return (
              <div key={d.symbol} className="flex items-center gap-2 whitespace-nowrap shrink-0">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{d.label}</span>
                <span className="text-sm font-semibold">{d.price.toLocaleString('zh-TW', { maximumFractionDigits: 2 })}</span>
                <span className={`text-xs font-medium flex items-center gap-0.5 ${isUp ? 'text-red-500' : 'text-green-500'}`}>
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isUp ? '+' : ''}{d.changePercent.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
