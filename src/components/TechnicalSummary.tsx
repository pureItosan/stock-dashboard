import { useMemo } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'
import type { OHLCV, KDData, MACDData } from '../types'
import { calculateCCI, calculateWilliamsR, calculateMomentum, calculateADX, calculateMA } from '../utils/indicators'

type Signal = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'

interface IndicatorSignal {
  name: string
  value: string
  signal: Signal
}

interface Props {
  chartData: OHLCV[]
  kdData: KDData[]
  macdData: MACDData[]
  rsiData: { time: string; value: number }[]
  darkMode: boolean
}

const MA_PERIODS = [5, 10, 20, 60, 120, 240]

function classifyMA(price: number, maValue: number): Signal {
  if (price > maValue * 1.02) return 'buy'
  if (price < maValue * 0.98) return 'sell'
  return 'neutral'
}

function getSignalLabel(s: Signal): string {
  switch (s) {
    case 'strong_buy': return '強力買進'
    case 'buy': return '買進'
    case 'neutral': return '中性'
    case 'sell': return '賣出'
    case 'strong_sell': return '強力賣出'
  }
}

function getSignalColor(s: Signal): string {
  switch (s) {
    case 'strong_buy': return 'text-red-600'
    case 'buy': return 'text-red-500'
    case 'neutral': return 'text-gray-500'
    case 'sell': return 'text-green-500'
    case 'strong_sell': return 'text-green-600'
  }
}

function getSignalBg(s: Signal): string {
  switch (s) {
    case 'strong_buy': return 'bg-red-100 dark:bg-red-950/40'
    case 'buy': return 'bg-red-50 dark:bg-red-950/20'
    case 'neutral': return 'bg-gray-100 dark:bg-gray-800'
    case 'sell': return 'bg-green-50 dark:bg-green-950/20'
    case 'strong_sell': return 'bg-green-100 dark:bg-green-950/40'
  }
}

function computeOverall(signals: IndicatorSignal[]): Signal {
  let score = 0
  for (const s of signals) {
    if (s.signal === 'strong_buy') score += 2
    else if (s.signal === 'buy') score += 1
    else if (s.signal === 'sell') score -= 1
    else if (s.signal === 'strong_sell') score -= 2
  }
  const avg = signals.length > 0 ? score / signals.length : 0
  if (avg >= 1) return 'strong_buy'
  if (avg >= 0.3) return 'buy'
  if (avg <= -1) return 'strong_sell'
  if (avg <= -0.3) return 'sell'
  return 'neutral'
}

export default function TechnicalSummary({ chartData, kdData, macdData, rsiData }: Props) {
  const analysis = useMemo(() => {
    if (chartData.length < 30) return null

    const lastPrice = chartData[chartData.length - 1].close

    // ===== Moving Averages =====
    const maSignals: IndicatorSignal[] = []
    for (const period of MA_PERIODS) {
      const maData = calculateMA(chartData, period)
      if (maData.length === 0) continue
      const lastMA = maData[maData.length - 1].value
      const sig = classifyMA(lastPrice, lastMA)
      maSignals.push({
        name: `MA${period}`,
        value: lastMA.toFixed(2),
        signal: sig,
      })
    }
    // EMA signals (use simple approximation)
    for (const period of [12, 26]) {
      const multiplier = 2 / (period + 1)
      let ema = chartData[0].close
      for (let i = 1; i < chartData.length; i++) {
        ema = (chartData[i].close - ema) * multiplier + ema
      }
      const sig = classifyMA(lastPrice, ema)
      maSignals.push({
        name: `EMA${period}`,
        value: ema.toFixed(2),
        signal: sig,
      })
    }

    // ===== Oscillators =====
    const oscSignals: IndicatorSignal[] = []

    // RSI
    if (rsiData.length > 0) {
      const lastRSI = rsiData[rsiData.length - 1].value
      let sig: Signal = 'neutral'
      if (lastRSI < 20) sig = 'strong_buy'
      else if (lastRSI < 30) sig = 'buy'
      else if (lastRSI > 80) sig = 'strong_sell'
      else if (lastRSI > 70) sig = 'sell'
      oscSignals.push({ name: 'RSI (14)', value: lastRSI.toFixed(1), signal: sig })
    }

    // KD
    if (kdData.length >= 2) {
      const last = kdData[kdData.length - 1]
      const prev = kdData[kdData.length - 2]
      let sig: Signal = 'neutral'
      if (last.k > last.d && prev.k <= prev.d) sig = last.k < 30 ? 'strong_buy' : 'buy'
      else if (last.k < last.d && prev.k >= prev.d) sig = last.k > 70 ? 'strong_sell' : 'sell'
      else if (last.k < 20 && last.d < 20) sig = 'buy'
      else if (last.k > 80 && last.d > 80) sig = 'sell'
      oscSignals.push({ name: 'KD (9)', value: `K:${last.k.toFixed(1)} D:${last.d.toFixed(1)}`, signal: sig })
    }

    // MACD
    if (macdData.length >= 2) {
      const last = macdData[macdData.length - 1]
      const prev = macdData[macdData.length - 2]
      let sig: Signal = 'neutral'
      if (last.dif > last.dea && prev.dif <= prev.dea) sig = 'buy'
      else if (last.dif < last.dea && prev.dif >= prev.dea) sig = 'sell'
      else if (last.histogram > 0 && last.histogram > prev.histogram) sig = 'buy'
      else if (last.histogram < 0 && last.histogram < prev.histogram) sig = 'sell'
      oscSignals.push({ name: 'MACD (12,26)', value: `DIF:${last.dif.toFixed(2)}`, signal: sig })
    }

    // CCI
    const cciData = calculateCCI(chartData)
    if (cciData.length > 0) {
      const lastCCI = cciData[cciData.length - 1].value
      let sig: Signal = 'neutral'
      if (lastCCI < -200) sig = 'strong_buy'
      else if (lastCCI < -100) sig = 'buy'
      else if (lastCCI > 200) sig = 'strong_sell'
      else if (lastCCI > 100) sig = 'sell'
      oscSignals.push({ name: 'CCI (20)', value: lastCCI.toFixed(1), signal: sig })
    }

    // Williams %R
    const wrData = calculateWilliamsR(chartData)
    if (wrData.length > 0) {
      const lastWR = wrData[wrData.length - 1].value
      let sig: Signal = 'neutral'
      if (lastWR < -80) sig = 'buy'
      else if (lastWR > -20) sig = 'sell'
      oscSignals.push({ name: 'Williams %R', value: lastWR.toFixed(1), signal: sig })
    }

    // Momentum
    const momData = calculateMomentum(chartData)
    if (momData.length > 0) {
      const lastMom = momData[momData.length - 1].value
      let sig: Signal = 'neutral'
      if (lastMom > 0) sig = 'buy'
      else if (lastMom < 0) sig = 'sell'
      oscSignals.push({ name: '動量 (10)', value: lastMom.toFixed(2), signal: sig })
    }

    // ADX
    const adxData = calculateADX(chartData)
    if (adxData.length > 0) {
      const last = adxData[adxData.length - 1]
      let sig: Signal = 'neutral'
      if (last.adx > 25 && last.pdi > last.mdi) sig = 'buy'
      else if (last.adx > 25 && last.mdi > last.pdi) sig = 'sell'
      oscSignals.push({ name: 'ADX (14)', value: `${last.adx.toFixed(1)} (+DI:${last.pdi.toFixed(1)})`, signal: sig })
    }

    const allSignals = [...maSignals, ...oscSignals]
    const overall = computeOverall(allSignals)
    const maOverall = computeOverall(maSignals)
    const oscOverall = computeOverall(oscSignals)

    return { maSignals, oscSignals, overall, maOverall, oscOverall }
  }, [chartData, kdData, macdData, rsiData])

  if (!analysis) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> 技術指標概要
        </h3>
        <div className="h-[100px] flex items-center justify-center text-sm text-gray-400">
          資料不足，無法分析
        </div>
      </div>
    )
  }

  const { maSignals, oscSignals, overall, maOverall, oscOverall } = analysis

  const countSignals = (signals: IndicatorSignal[]) => {
    const buy = signals.filter(s => s.signal === 'buy' || s.signal === 'strong_buy').length
    const sell = signals.filter(s => s.signal === 'sell' || s.signal === 'strong_sell').length
    const neutral = signals.filter(s => s.signal === 'neutral').length
    return { buy, sell, neutral }
  }

  const allCounts = countSignals([...maSignals, ...oscSignals])
  const maCounts = countSignals(maSignals)
  const oscCounts = countSignals(oscSignals)

  // Gauge position: -1 (strong sell) to +1 (strong buy)
  const gaugeValue = (() => {
    const total = allCounts.buy + allCounts.sell + allCounts.neutral
    if (total === 0) return 0
    return (allCounts.buy - allCounts.sell) / total
  })()

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> 技術指標概要
        </h3>
        <span className="text-xs text-gray-400">
          綜合 {maSignals.length + oscSignals.length} 項指標
        </span>
      </div>

      {/* Overall Gauge */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-full max-w-md">
          {/* Gauge bar */}
          <div className="h-3 rounded-full bg-gradient-to-r from-green-500 via-gray-300 to-red-500 dark:from-green-600 dark:via-gray-600 dark:to-red-600 relative overflow-hidden">
            <div
              className="absolute top-0 w-1 h-full bg-white dark:bg-gray-200 border border-gray-800 rounded-full shadow-md transition-all duration-500"
              style={{ left: `${((gaugeValue + 1) / 2) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-400">
            <span>強力賣出</span>
            <span>賣出</span>
            <span>中性</span>
            <span>買進</span>
            <span>強力買進</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: '綜合', signal: overall, counts: allCounts },
          { label: '均線', signal: maOverall, counts: maCounts },
          { label: '震盪指標', signal: oscOverall, counts: oscCounts },
        ].map((item) => (
          <div key={item.label} className={`rounded-lg p-3 text-center ${getSignalBg(item.signal)}`}>
            <div className="text-xs text-gray-500 mb-1">{item.label}</div>
            <div className={`text-sm font-bold ${getSignalColor(item.signal)}`}>
              {getSignalLabel(item.signal)}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              <span className="text-red-500">{item.counts.buy}買</span>
              {' · '}
              <span>{item.counts.neutral}中</span>
              {' · '}
              <span className="text-green-500">{item.counts.sell}賣</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Tables */}
      <div className="grid grid-cols-2 gap-4">
        {/* Moving Averages */}
        <div>
          <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <ChevronRight className="w-3 h-3" /> 均線指標
          </div>
          <div className="space-y-1">
            {maSignals.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-gray-600 dark:text-gray-400 w-16">{s.name}</span>
                <span className="text-gray-500 font-mono text-[11px]">{s.value}</span>
                <span className={`font-semibold min-w-[50px] text-right ${getSignalColor(s.signal)}`}>
                  {s.signal === 'buy' || s.signal === 'strong_buy' ? '買進' : s.signal === 'sell' || s.signal === 'strong_sell' ? '賣出' : '中性'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Oscillators */}
        <div>
          <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <ChevronRight className="w-3 h-3" /> 震盪指標
          </div>
          <div className="space-y-1">
            {oscSignals.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-gray-600 dark:text-gray-400 w-20 truncate" title={s.name}>{s.name}</span>
                <span className="text-gray-500 font-mono text-[11px] truncate max-w-[90px]" title={s.value}>{s.value}</span>
                <span className={`font-semibold min-w-[50px] text-right ${getSignalColor(s.signal)}`}>
                  {getSignalLabel(s.signal)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
