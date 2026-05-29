import { useMemo } from 'react'
import { Target, ArrowUpCircle, ArrowDownCircle, MinusCircle, Shield, Zap } from 'lucide-react'
import type { OHLCV, KDData, MACDData } from '../types'
import { analyzeProbability, type ProbabilityResult } from '../utils/patterns'
import { formatNumber } from '../utils/format'

interface Props {
  chartData: OHLCV[]
  kdData: KDData[]
  macdData: MACDData[]
  rsiData: { time: string; value: number }[]
}

function getTechnicalScore(
  kdData: KDData[],
  macdData: MACDData[],
  rsiData: { time: string; value: number }[],
  chartData: OHLCV[],
): number {
  let score = 0
  let count = 0

  // KD
  if (kdData.length >= 2) {
    const last = kdData[kdData.length - 1]
    const prev = kdData[kdData.length - 2]
    if (last.k > last.d && prev.k <= prev.d) score += 1
    else if (last.k < last.d && prev.k >= prev.d) score -= 1
    else if (last.k < 20) score += 0.5
    else if (last.k > 80) score -= 0.5
    count++
  }

  // MACD
  if (macdData.length >= 2) {
    const last = macdData[macdData.length - 1]
    const prev = macdData[macdData.length - 2]
    if (last.dif > last.dea && prev.dif <= prev.dea) score += 1
    else if (last.dif < last.dea && prev.dif >= prev.dea) score -= 1
    else if (last.histogram > 0 && last.histogram > prev.histogram) score += 0.3
    else if (last.histogram < 0 && last.histogram < prev.histogram) score -= 0.3
    count++
  }

  // RSI
  if (rsiData.length > 0) {
    const rsi = rsiData[rsiData.length - 1].value
    if (rsi < 30) score += 0.8
    else if (rsi > 70) score -= 0.8
    count++
  }

  // MA trend
  if (chartData.length >= 20) {
    const ma5 = chartData.slice(-5).reduce((s, d) => s + d.close, 0) / 5
    const ma20 = chartData.slice(-20).reduce((s, d) => s + d.close, 0) / 20
    const price = chartData[chartData.length - 1].close
    if (price > ma5 && ma5 > ma20) score += 0.7
    else if (price < ma5 && ma5 < ma20) score -= 0.7
    count++
  }

  return count > 0 ? Math.max(-1, Math.min(1, score / count)) : 0
}

export default function ProbabilityAnalysis({ chartData, kdData, macdData, rsiData }: Props) {
  const result = useMemo<ProbabilityResult | null>(() => {
    if (chartData.length < 30) return null
    const techScore = getTechnicalScore(kdData, macdData, rsiData, chartData)
    return analyzeProbability(chartData, techScore)
  }, [chartData, kdData, macdData, rsiData])

  if (!result) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-500" /> 未來一週走勢機率
        </h3>
        <div className="h-[100px] flex items-center justify-center text-sm text-gray-400">
          資料不足，無法分析
        </div>
      </div>
    )
  }

  const lastPrice = chartData[chartData.length - 1].close
  const maxProb = Math.max(result.upProb, result.downProb, result.flatProb)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-500" /> 未來一週走勢機率
        </h3>
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <Shield className="w-3 h-3" /> 基於歷史統計，僅供參考
        </span>
      </div>

      {/* Probability Bars */}
      <div className="space-y-3 mb-4">
        <ProbBar
          icon={<ArrowUpCircle className="w-4 h-4 text-red-500" />}
          label="上漲 (>1%)"
          prob={result.upProb}
          color="bg-red-500"
          isMax={result.upProb === maxProb}
        />
        <ProbBar
          icon={<MinusCircle className="w-4 h-4 text-gray-400" />}
          label="盤整 (±1%)"
          prob={result.flatProb}
          color="bg-gray-400"
          isMax={result.flatProb === maxProb}
        />
        <ProbBar
          icon={<ArrowDownCircle className="w-4 h-4 text-green-500" />}
          label="下跌 (>1%)"
          prob={result.downProb}
          color="bg-green-500"
          isMax={result.downProb === maxProb}
        />
      </div>

      {/* Scenarios */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <ScenarioCard
          label="樂觀情境"
          price={result.scenarioBullish.price}
          change={((result.scenarioBullish.price - lastPrice) / lastPrice * 100)}
          color="text-red-500"
          bg="bg-red-50 dark:bg-red-950/20"
        />
        <ScenarioCard
          label="基準情境"
          price={result.scenarioBase.price}
          change={((result.scenarioBase.price - lastPrice) / lastPrice * 100)}
          color="text-blue-500"
          bg="bg-blue-50 dark:bg-blue-950/20"
        />
        <ScenarioCard
          label="悲觀情境"
          price={result.scenarioBearish.price}
          change={((result.scenarioBearish.price - lastPrice) / lastPrice * 100)}
          color="text-green-500"
          bg="bg-green-50 dark:bg-green-950/20"
        />
      </div>

      {/* Price Range */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <Zap className="w-3 h-3" /> 預估價格區間
        </div>
        <div className="relative h-10 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          {/* 95% confidence */}
          <div
            className="absolute top-0 h-full bg-blue-100 dark:bg-blue-900/30"
            style={{
              left: `${Math.max(0, ((result.confidenceRange95.low - result.confidenceRange95.low) / (result.confidenceRange95.high - result.confidenceRange95.low)) * 100)}%`,
              width: '100%',
            }}
          />
          {/* 68% confidence */}
          <div
            className="absolute top-1 h-8 bg-blue-200 dark:bg-blue-800/40 rounded"
            style={{
              left: `${Math.max(0, ((result.expectedRange.low - result.confidenceRange95.low) / (result.confidenceRange95.high - result.confidenceRange95.low)) * 100)}%`,
              width: `${((result.expectedRange.high - result.expectedRange.low) / (result.confidenceRange95.high - result.confidenceRange95.low)) * 100}%`,
            }}
          />
          {/* Current price marker */}
          <div
            className="absolute top-0 w-0.5 h-full bg-blue-600"
            style={{
              left: `${((lastPrice - result.confidenceRange95.low) / (result.confidenceRange95.high - result.confidenceRange95.low)) * 100}%`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-400">
          <span>{formatNumber(result.confidenceRange95.low)}</span>
          <span className="text-blue-500 font-medium">現價 {formatNumber(lastPrice)}</span>
          <span>{formatNumber(result.confidenceRange95.high)}</span>
        </div>
        <div className="flex justify-center gap-4 mt-1 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-blue-200 dark:bg-blue-800 rounded-sm" /> 68% 信賴區間
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-blue-100 dark:bg-blue-900 rounded-sm" /> 95% 信賴區間
          </span>
        </div>
      </div>

      {/* Support / Resistance + Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1.5">支撐 / 壓力</div>
          <div className="space-y-1">
            {result.resistanceLevels.slice(0, 3).reverse().map((r, i) => (
              <div key={`r${i}`} className="flex items-center justify-between text-xs">
                <span className="text-green-500">壓力{result.resistanceLevels.length - i}</span>
                <span className="font-mono">{formatNumber(r)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs border-y py-1 my-1 border-blue-200 dark:border-blue-800">
              <span className="text-blue-500 font-medium">現價</span>
              <span className="font-mono font-medium">{formatNumber(lastPrice)}</span>
            </div>
            {result.supportLevels.slice(-3).reverse().map((s, i) => (
              <div key={`s${i}`} className="flex items-center justify-between text-xs">
                <span className="text-red-500">支撐{i + 1}</span>
                <span className="font-mono">{formatNumber(s)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1.5">統計數據</div>
          <div className="space-y-1.5">
            <StatRow label="歷史週勝率" value={`${result.historicalWinRate}%`} />
            <StatRow label="平均週報酬" value={`${result.avgWeeklyReturn > 0 ? '+' : ''}${result.avgWeeklyReturn}%`} />
            <StatRow label="週波動率" value={`${result.volatility}%`} />
            <StatRow
              label="68% 區間"
              value={`${formatNumber(result.expectedRange.low)} ~ ${formatNumber(result.expectedRange.high)}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ProbBar({ icon, label, prob, color, isMax }: {
  icon: React.ReactNode; label: string; prob: number; color: string; isMax: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className={`text-xs w-20 ${isMax ? 'font-bold' : ''}`}>{label}</span>
      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${prob}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">
          {prob}%
        </span>
      </div>
    </div>
  )
}

function ScenarioCard({ label, price, change, color, bg }: {
  label: string; price: number; change: number; color: string; bg: string
}) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${bg}`}>
      <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{formatNumber(price)}</div>
      <div className={`text-[10px] ${color}`}>
        {change > 0 ? '+' : ''}{change.toFixed(2)}%
      </div>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  )
}
