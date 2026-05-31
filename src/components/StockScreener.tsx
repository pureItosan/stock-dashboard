import { useState, useEffect } from 'react'
import { Rocket, RefreshCw, TrendingUp, Volume2, Activity, BarChart3 } from 'lucide-react'
import axios from 'axios'
import { formatNumber, getChangeColor } from '../utils/format'

interface ScreenerStock {
  symbol: string
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
}

interface Props {
  onStockClick: (symbol: string) => void
}

function ScoreBar({ score }: { score: number }) {
  const maxScore = 100
  const pct = Math.min(100, (score / maxScore) * 100)
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
  else if (text.includes('低點')) color = 'bg-red-100 dark:bg-red-950/30 text-red-500'

  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${color}`}>{text}</span>
}

export default function StockScreener({ onStockClick }: Props) {
  const [data, setData] = useState<ScreenerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'tw' | 'us'>('tw')

  const fetchData = () => {
    setLoading(true)
    axios.get('/api/screener')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const stocks = data ? (tab === 'tw' ? data.tw : data.us) : []

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Rocket className="w-4 h-4 text-rose-500" /> 換車精選
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => setTab('tw')} className={`btn text-xs ${tab === 'tw' ? 'btn-active border' : 'btn-ghost'}`}>台股</button>
            <button onClick={() => setTab('us')} className={`btn text-xs ${tab === 'us' ? 'btn-active border' : 'btn-ghost'}`}>美股</button>
          </div>
          <button onClick={fetchData} disabled={loading} className="btn btn-ghost p-1.5" title="重新掃描">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Criteria explanation */}
      <div className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mb-3 flex flex-wrap gap-x-3 gap-y-0.5">
        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-purple-500" /> TD 九轉接近</span>
        <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3 text-blue-500" /> KD 低檔</span>
        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" /> MACD 收斂</span>
        <span className="flex items-center gap-1"><Volume2 className="w-3 h-3 text-orange-500" /> 量比放大</span>
      </div>

      {loading && stocks.length === 0 ? (
        <div className="space-y-3 animate-pulse-gentle">
          <div className="text-center py-6 text-sm text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            掃描 {tab === 'tw' ? '台股' : '美股'} 中... 約需 30 秒
          </div>
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
                    <span className="font-bold text-sm">{s.symbol.replace('.TW', '').replace('.TWO', '')}</span>
                    <span className="text-xs text-gray-500 ml-1.5 truncate max-w-[120px] inline-block align-bottom">{s.name}</span>
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

      {data && (
        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 flex justify-between">
          <span>掃描 {data.totalScanned} 檔 | {new Date(data.scannedAt).toLocaleTimeString('zh-TW')}</span>
          <span>條件: TD≥7 + KD低 + MACD收斂 + 放量</span>
        </div>
      )}
    </div>
  )
}
