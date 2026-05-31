import { useState, useEffect } from 'react'
import { Car, RefreshCw, TrendingUp, Volume2, Activity, BarChart3, ChevronDown, Users } from 'lucide-react'
import axios from 'axios'
import { formatNumber } from '../utils/format'

interface ScreenerStock {
  symbol: string
  cnName: string
  name: string
  price: number
  score: number
  reasons: string[]
  kd: { k: number; d: number }
  td: { buy: number; sell: number }
  macdHist: number
  volRatio: number
}

interface ScreenerData {
  tw: ScreenerStock[]
  us: ScreenerStock[]
  scannedAt: string
  totalScanned: number
  hasMore: boolean
}

interface Props {
  onStockClick: (symbol: string) => void
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, score)
  let color = 'bg-gray-400'
  if (score >= 60) color = 'bg-red-500'
  else if (score >= 40) color = 'bg-orange-500'
  else if (score >= 25) color = 'bg-amber-500'

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-bold ${score >= 60 ? 'text-red-500' : score >= 40 ? 'text-orange-500' : 'text-amber-500'}`}>
        {score}
      </span>
    </div>
  )
}

function ReasonTag({ text }: { text: string }) {
  let color = 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  if (text.includes('TD')) color = 'bg-purple-100 dark:bg-purple-950/30 text-purple-600'
  else if (text.includes('KD')) color = 'bg-blue-100 dark:bg-blue-950/30 text-blue-600'
  else if (text.includes('MACD')) color = 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600'
  else if (text.includes('量') || text.includes('放量')) color = 'bg-orange-100 dark:bg-orange-950/30 text-orange-600'
  else if (text.includes('主力')) color = 'bg-rose-100 dark:bg-rose-950/30 text-rose-600'
  else if (text.includes('低點')) color = 'bg-red-100 dark:bg-red-950/30 text-red-500'

  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${color}`}>{text}</span>
}

export default function StockScreener({ onStockClick }: Props) {
  const [allTW, setAllTW] = useState<ScreenerStock[]>([])
  const [allUS, setAllUS] = useState<ScreenerStock[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tab, setTab] = useState<'tw' | 'us'>('tw')
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [scannedAt, setScannedAt] = useState('')
  const [totalScanned, setTotalScanned] = useState(0)

  const fetchPage = (p: number, append: boolean) => {
    const setLoad = p === 0 ? setLoading : setLoadingMore
    setLoad(true)
    axios.get('/api/screener', { params: { page: p } })
      .then(res => {
        const d = res.data
        if (append) {
          setAllTW(prev => [...prev, ...d.tw])
          setAllUS(prev => [...prev, ...d.us])
        } else {
          setAllTW(d.tw)
          setAllUS(d.us)
        }
        setHasMore(d.hasMore)
        setScannedAt(d.scannedAt)
        setTotalScanned(d.totalScanned)
        setPage(p)
      })
      .catch(() => {})
      .finally(() => setLoad(false))
  }

  useEffect(() => { fetchPage(0, false) }, [])

  const handleRefresh = () => {
    setAllTW([])
    setAllUS([])
    setPage(0)
    fetchPage(0, false)
  }

  const handleLoadMore = () => {
    fetchPage(page + 1, true)
  }

  const stocks = tab === 'tw' ? allTW : allUS

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Car className="w-4 h-4 text-rose-500" /> 換車精選
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => setTab('tw')} className={`btn text-xs ${tab === 'tw' ? 'btn-active border' : 'btn-ghost'}`}>台股</button>
            <button onClick={() => setTab('us')} className={`btn text-xs ${tab === 'us' ? 'btn-active border' : 'btn-ghost'}`}>美股</button>
          </div>
          <button onClick={handleRefresh} disabled={loading} className="btn btn-ghost p-1.5" title="重新掃描">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mb-3 flex flex-wrap gap-x-3 gap-y-0.5">
        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-purple-500" /> TD 九轉接近</span>
        <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3 text-blue-500" /> KD 低檔</span>
        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" /> MACD 收斂</span>
        <span className="flex items-center gap-1"><Volume2 className="w-3 h-3 text-orange-500" /> 量比放大</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3 text-rose-500" /> 主力買超</span>
      </div>

      {loading && stocks.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          掃描 {tab === 'tw' ? '台股' : '美股'} 中... 約需 30 秒
        </div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400">
          目前無符合條件的推薦股票
        </div>
      ) : (
        <div className="space-y-2">
          {stocks.map((s, idx) => (
            <div
              key={s.symbol}
              className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
              onClick={() => onStockClick(s.symbol)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5 text-right font-bold">#{idx + 1}</span>
                  <div>
                    <span className="font-bold text-sm">
                      {s.symbol.replace('.TW', '').replace('.TWO', '')}
                    </span>
                    {s.cnName && (
                      <span className="text-xs text-gray-600 dark:text-gray-300 ml-1.5 font-medium">{s.cnName}</span>
                    )}
                    {!s.cnName && s.name && (
                      <span className="text-xs text-gray-500 ml-1.5 truncate max-w-[100px] inline-block align-bottom">{s.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatNumber(s.price)}</span>
                  <ScoreBar score={s.score} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {s.reasons.map((r, i) => <ReasonTag key={i} text={r} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && !loading && stocks.length > 0 && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full mt-3 btn btn-ghost text-xs flex items-center justify-center gap-1 border border-dashed py-2.5 hover:border-rose-300 hover:text-rose-500 transition-colors"
        >
          {loadingMore ? (
            <><RefreshCw className="w-3 h-3 animate-spin" /> 載入中...</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> 再給我 5 檔</>
          )}
        </button>
      )}

      {scannedAt && (
        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 flex justify-between">
          <span>掃描 {totalScanned} 檔 | {new Date(scannedAt).toLocaleTimeString('zh-TW')}</span>
          <span>TD≥7 + KD低 + MACD收斂 + 放量 + 主力</span>
        </div>
      )}
    </div>
  )
}
