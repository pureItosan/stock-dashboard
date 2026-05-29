import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { searchStocks } from '../api/stock'

interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

interface Props {
  onSelect: (symbol: string) => void
}

export default function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await searchStocks(q)
      setResults(res)
      setSelectedIdx(-1)
    } catch { setResults([]) }
    setLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (query.trim()) {
      timerRef.current = setTimeout(() => doSearch(query), 300)
    } else {
      setResults([])
    }
    return () => clearTimeout(timerRef.current)
  }, [query, doSearch])

  const handleSelect = (symbol: string) => {
    onSelect(symbol)
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIdx >= 0 && results[selectedIdx]) {
        handleSelect(results[selectedIdx].symbol)
      } else if (query.trim()) {
        const q = query.trim()
        if (/^\d{4,6}$/.test(q)) {
          handleSelect(q + '.TW')
        } else {
          handleSelect(q.toUpperCase())
        }
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="搜尋股票代碼或名稱 (如: 2330, AAPL)"
          className="input pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && query.trim() && (results.length > 0 || loading || (!loading && results.length === 0)) && (
        <div className="absolute z-50 w-full mt-1 card shadow-lg max-h-80 overflow-y-auto scrollbar-thin">
          {loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">搜尋中...</div>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <div className="px-4 py-3 text-sm text-gray-500">
              找不到結果，請嘗試輸入股票代碼 (如: 2330, 3529, AAPL)
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={r.symbol}
              onClick={() => handleSelect(r.symbol)}
              className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                i === selectedIdx ? 'bg-blue-50 dark:bg-blue-950' : ''
              }`}
            >
              <div className="text-left">
                <span className="font-semibold text-sm">{r.symbol}</span>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{r.name}</span>
              </div>
              <span className="text-xs text-gray-400 badge bg-gray-100 dark:bg-gray-800">
                {r.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
