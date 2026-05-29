import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { KDData, MACDData, OHLCV } from '../types'

interface Props {
  kdData: KDData[]
  macdData: MACDData[]
  rsiData: { time: string; value: number }[]
  chartData: OHLCV[]
}

type Signal = 'bullish' | 'bearish' | 'neutral'

interface SignalItem {
  name: string
  signal: Signal
  detail: string
}

function getKDSignal(data: KDData[]): SignalItem {
  if (data.length < 2) return { name: 'KD', signal: 'neutral', detail: '資料不足' }
  const last = data[data.length - 1]
  const prev = data[data.length - 2]

  if (last.k > last.d && prev.k <= prev.d && last.k < 30) {
    return { name: 'KD', signal: 'bullish', detail: `低檔黃金交叉 (K:${last.k.toFixed(1)} D:${last.d.toFixed(1)})` }
  }
  if (last.k < last.d && prev.k >= prev.d && last.k > 70) {
    return { name: 'KD', signal: 'bearish', detail: `高檔死亡交叉 (K:${last.k.toFixed(1)} D:${last.d.toFixed(1)})` }
  }
  if (last.k < 20 && last.d < 20) {
    return { name: 'KD', signal: 'bullish', detail: `超賣區 (K:${last.k.toFixed(1)} D:${last.d.toFixed(1)})` }
  }
  if (last.k > 80 && last.d > 80) {
    return { name: 'KD', signal: 'bearish', detail: `超買區 (K:${last.k.toFixed(1)} D:${last.d.toFixed(1)})` }
  }
  return { name: 'KD', signal: 'neutral', detail: `K:${last.k.toFixed(1)} D:${last.d.toFixed(1)}` }
}

function getMACDSignal(data: MACDData[]): SignalItem {
  if (data.length < 2) return { name: 'MACD', signal: 'neutral', detail: '資料不足' }
  const last = data[data.length - 1]
  const prev = data[data.length - 2]

  if (last.dif > last.dea && prev.dif <= prev.dea) {
    return { name: 'MACD', signal: 'bullish', detail: `DIF 上穿 DEA (DIF:${last.dif.toFixed(2)})` }
  }
  if (last.dif < last.dea && prev.dif >= prev.dea) {
    return { name: 'MACD', signal: 'bearish', detail: `DIF 下穿 DEA (DIF:${last.dif.toFixed(2)})` }
  }
  if (last.histogram > 0 && last.histogram > prev.histogram) {
    return { name: 'MACD', signal: 'bullish', detail: `紅柱擴大 (柱:${last.histogram.toFixed(2)})` }
  }
  if (last.histogram < 0 && last.histogram < prev.histogram) {
    return { name: 'MACD', signal: 'bearish', detail: `綠柱擴大 (柱:${last.histogram.toFixed(2)})` }
  }
  return { name: 'MACD', signal: 'neutral', detail: `DIF:${last.dif.toFixed(2)} DEA:${last.dea.toFixed(2)}` }
}

function getRSISignal(data: { time: string; value: number }[]): SignalItem {
  if (data.length < 1) return { name: 'RSI', signal: 'neutral', detail: '資料不足' }
  const last = data[data.length - 1]

  if (last.value < 30) {
    return { name: 'RSI', signal: 'bullish', detail: `超賣 (${last.value.toFixed(1)})` }
  }
  if (last.value > 70) {
    return { name: 'RSI', signal: 'bearish', detail: `超買 (${last.value.toFixed(1)})` }
  }
  return { name: 'RSI', signal: 'neutral', detail: `${last.value.toFixed(1)}` }
}

function getVolumeSignal(data: OHLCV[]): SignalItem {
  if (data.length < 6) return { name: '成交量', signal: 'neutral', detail: '資料不足' }
  const last5 = data.slice(-5)
  const prev5 = data.slice(-10, -5)
  if (prev5.length < 5) return { name: '成交量', signal: 'neutral', detail: '資料不足' }

  const avgRecent = last5.reduce((s, d) => s + d.volume, 0) / 5
  const avgPrev = prev5.reduce((s, d) => s + d.volume, 0) / 5
  const ratio = avgPrev > 0 ? avgRecent / avgPrev : 1

  const lastBar = data[data.length - 1]
  const isUp = lastBar.close > lastBar.open

  if (ratio > 1.5 && isUp) {
    return { name: '成交量', signal: 'bullish', detail: `量增價漲 (量比:${ratio.toFixed(1)}x)` }
  }
  if (ratio > 1.5 && !isUp) {
    return { name: '成交量', signal: 'bearish', detail: `量增價跌 (量比:${ratio.toFixed(1)}x)` }
  }
  if (ratio < 0.5) {
    return { name: '成交量', signal: 'neutral', detail: `量縮 (量比:${ratio.toFixed(1)}x)` }
  }
  return { name: '成交量', signal: 'neutral', detail: `量比:${ratio.toFixed(1)}x` }
}

function getMASignal(data: OHLCV[]): SignalItem {
  if (data.length < 20) return { name: '均線', signal: 'neutral', detail: '資料不足' }
  const last = data[data.length - 1]
  const ma5 = data.slice(-5).reduce((s, d) => s + d.close, 0) / 5
  const ma20 = data.slice(-20).reduce((s, d) => s + d.close, 0) / 20

  const aboveBoth = last.close > ma5 && last.close > ma20
  const belowBoth = last.close < ma5 && last.close < ma20

  if (aboveBoth && ma5 > ma20) {
    return { name: '均線', signal: 'bullish', detail: `多頭排列 (收盤 > MA5 > MA20)` }
  }
  if (belowBoth && ma5 < ma20) {
    return { name: '均線', signal: 'bearish', detail: `空頭排列 (收盤 < MA5 < MA20)` }
  }
  return { name: '均線', signal: 'neutral', detail: `MA5:${ma5.toFixed(2)} MA20:${ma20.toFixed(2)}` }
}

const signalConfig = {
  bullish: { icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', label: '偏多' },
  bearish: { icon: TrendingDown, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30', label: '偏空' },
  neutral: { icon: Minus, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800', label: '中性' },
}

export default function SignalSummary({ kdData, macdData, rsiData, chartData }: Props) {
  const signals: SignalItem[] = [
    getKDSignal(kdData),
    getMACDSignal(macdData),
    getRSISignal(rsiData),
    getVolumeSignal(chartData),
    getMASignal(chartData),
  ]

  const bullishCount = signals.filter((s) => s.signal === 'bullish').length
  const bearishCount = signals.filter((s) => s.signal === 'bearish').length

  let overall: Signal = 'neutral'
  if (bullishCount > bearishCount + 1) overall = 'bullish'
  else if (bearishCount > bullishCount + 1) overall = 'bearish'

  const overallConfig = signalConfig[overall]
  const OverallIcon = overallConfig.icon

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> 訊號總覽
        </h3>
        <div className={`badge ${overallConfig.bg} ${overallConfig.color} flex items-center gap-1`}>
          <OverallIcon className="w-3 h-3" />
          綜合: {overallConfig.label} ({bullishCount}多 / {bearishCount}空)
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {signals.map((s) => {
          const cfg = signalConfig[s.signal]
          const Icon = cfg.icon
          return (
            <div key={s.name} className={`rounded-lg p-2.5 ${cfg.bg} text-center`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                <span className="text-xs font-semibold">{s.name}</span>
              </div>
              <div className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={s.detail}>
                {s.detail}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
