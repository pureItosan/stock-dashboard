import type { StockQuote } from '../types'
import { formatNumber, formatLargeNumber, formatPercent, formatChange, getChangeColor } from '../utils/format'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  quote: StockQuote | null
  loading: boolean
}

export default function StockOverview({ quote, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-6 animate-pulse-gentle">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48 mb-2" />
        <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded w-32 mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!quote) return null

  const change = quote.regularMarketChange
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus

  const metrics = [
    { label: '開盤', value: formatNumber(quote.regularMarketOpen) },
    { label: '最高', value: formatNumber(quote.regularMarketDayHigh) },
    { label: '最低', value: formatNumber(quote.regularMarketDayLow) },
    { label: '前收', value: formatNumber(quote.regularMarketPreviousClose) },
    { label: '成交量', value: formatLargeNumber(quote.regularMarketVolume) },
    { label: '市值', value: formatLargeNumber(quote.marketCap) },
    { label: '本益比', value: quote.trailingPE ? formatNumber(quote.trailingPE) : '--' },
    { label: '殖利率', value: quote.dividendYield ? formatPercent(quote.dividendYield).replace('+', '') : '--' },
    { label: '52週高', value: formatNumber(quote.fiftyTwoWeekHigh) },
    { label: '52週低', value: formatNumber(quote.fiftyTwoWeekLow) },
  ]

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{quote.shortName}</h2>
            <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs">
              {quote.symbol}
            </span>
            <span className="badge bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs">
              {quote.exchange}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-3xl font-bold">{formatNumber(quote.regularMarketPrice)}</span>
            <span className="text-sm text-gray-500">{quote.currency}</span>
          </div>
          <div className={`flex items-center gap-1 justify-end text-lg font-semibold ${getChangeColor(change)}`}>
            <Icon className="w-5 h-5" />
            <span>{formatChange(change)}</span>
            <span>({formatPercent(quote.regularMarketChangePercent)})</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-xs text-gray-500 dark:text-gray-400">{m.label}</div>
            <div className="font-semibold text-sm mt-0.5">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
