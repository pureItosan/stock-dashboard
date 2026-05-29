import { useState, useEffect } from 'react'
import { Star, X, Plus } from 'lucide-react'
import { getMultipleQuotes } from '../api/stock'
import { formatNumber, formatPercent, getChangeColor } from '../utils/format'

interface WatchItem {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

interface Props {
  currentSymbol: string
  onStockClick: (symbol: string) => void
}

const STORAGE_KEY = 'stockpulse-watchlist'

function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : ['2330.TW', '2317.TW', '2454.TW', 'AAPL', 'NVDA']
  } catch {
    return []
  }
}

function saveWatchlist(symbols: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols))
}

export default function Watchlist({ currentSymbol, onStockClick }: Props) {
  const [symbols, setSymbols] = useState<string[]>(loadWatchlist)
  const [items, setItems] = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (symbols.length === 0) return
    let cancelled = false
    setLoading(true)
    getMultipleQuotes(symbols)
      .then((data) => {
        if (cancelled) return
        setItems(data)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [symbols])

  const addSymbol = (symbol: string) => {
    const s = symbol.toUpperCase().trim()
    if (!s || symbols.includes(s)) return
    const next = [...symbols, s]
    setSymbols(next)
    saveWatchlist(next)
    setAdding(false)
  }

  const removeSymbol = (symbol: string) => {
    const next = symbols.filter((s) => s !== symbol)
    setSymbols(next)
    saveWatchlist(next)
    setItems((prev) => prev.filter((i) => i.symbol !== symbol))
  }

  const addCurrent = () => {
    if (currentSymbol && !symbols.includes(currentSymbol)) {
      addSymbol(currentSymbol)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" /> 自選股
          <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500">{symbols.length}</span>
        </h3>
        <div className="flex items-center gap-1">
          {currentSymbol && !symbols.includes(currentSymbol) && (
            <button
              onClick={addCurrent}
              className="btn btn-ghost text-xs flex items-center gap-1"
              title="加入自選"
            >
              <Plus className="w-3 h-3" />
              加入
            </button>
          )}
        </div>
      </div>
      <div className="space-y-0.5 max-h-[350px] overflow-y-auto scrollbar-thin">
        {loading && items.length === 0 && (
          <div className="space-y-2 animate-pulse-gentle">
            {symbols.map((s) => (
              <div key={s} className="h-10 bg-gray-200 dark:bg-gray-800 rounded" />
            ))}
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.symbol}
            className={`flex items-center justify-between py-2 px-2 rounded-lg transition-colors cursor-pointer group ${
              item.symbol === currentSymbol
                ? 'bg-blue-50 dark:bg-blue-950'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => onStockClick(item.symbol)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div>
                <div className="text-sm font-semibold">{item.symbol.replace('.TW', '').replace('.TWO', '')}</div>
                <div className="text-xs text-gray-500 truncate max-w-[80px]">{item.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-sm font-medium">{formatNumber(item.price)}</div>
                <div className={`text-xs font-medium ${getChangeColor(item.changePercent)}`}>
                  {formatPercent(item.changePercent)}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeSymbol(item.symbol) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {adding ? (
        <form
          className="mt-2"
          onSubmit={(e) => {
            e.preventDefault()
            const input = (e.target as HTMLFormElement).elements.namedItem('symbol') as HTMLInputElement
            addSymbol(input.value)
          }}
        >
          <input
            name="symbol"
            autoFocus
            placeholder="輸入代碼 (如 2330.TW)"
            className="input text-sm py-1.5"
            onBlur={() => setTimeout(() => setAdding(false), 200)}
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full mt-2 btn btn-ghost text-xs flex items-center justify-center gap-1 border border-dashed py-2"
        >
          <Plus className="w-3 h-3" /> 新增自選股
        </button>
      )}
    </div>
  )
}
