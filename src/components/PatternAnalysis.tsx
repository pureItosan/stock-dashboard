import { useMemo } from 'react'
import { Crosshair, TrendingUp, TrendingDown, Minus, Volume2, Target, BarChart3, CheckCircle2, XCircle } from 'lucide-react'
import type { OHLCV, KDData, MACDData } from '../types'
import { detectPatterns, enhanceWithConfluence, type CandlePattern } from '../utils/patterns'

interface Props {
  data: OHLCV[]
  kdData: KDData[]
  macdData: MACDData[]
  rsiData: { time: string; value: number }[]
}

const typeConfig = {
  bullish: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30', label: '看漲', icon: TrendingUp },
  bearish: { color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30', label: '看跌', icon: TrendingDown },
  neutral: { color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800', label: '中性', icon: Minus },
}

function ConfidenceBar({ score }: { score: number }) {
  let color = 'bg-gray-300'
  let label = '低'
  if (score >= 70) { color = 'bg-red-500'; label = '高' }
  else if (score >= 45) { color = 'bg-amber-500'; label = '中' }
  else { color = 'bg-gray-400'; label = '低' }

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[10px] font-semibold ${score >= 70 ? 'text-red-500' : score >= 45 ? 'text-amber-500' : 'text-gray-400'}`}>
        {score}分 ({label})
      </span>
    </div>
  )
}

function ConfirmTag({ ok, label }: { ok?: boolean; label: string }) {
  if (ok === undefined) return null
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
      ok ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
    }`}>
      {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  )
}

export default function PatternAnalysis({ data, kdData, macdData, rsiData }: Props) {
  const patterns = useMemo(() => {
    if (data.length < 10) return []
    try {
      const raw = detectPatterns(data)

    // Build confluence context from latest indicator values
    const lastKD = kdData.length >= 2 ? kdData[kdData.length - 1] : null
    const prevKD = kdData.length >= 2 ? kdData[kdData.length - 2] : null
    const lastMACD = macdData.length >= 2 ? macdData[macdData.length - 1] : null
    const prevMACD = macdData.length >= 2 ? macdData[macdData.length - 2] : null
    const lastRSI = rsiData.length > 0 ? rsiData[rsiData.length - 1].value : undefined

    let macdCross: 'golden' | 'death' | null = null
    if (lastMACD && prevMACD) {
      if (lastMACD.dif > lastMACD.dea && prevMACD.dif <= prevMACD.dea) macdCross = 'golden'
      else if (lastMACD.dif < lastMACD.dea && prevMACD.dif >= prevMACD.dea) macdCross = 'death'
    }

    // Calculate MAs
    const ma5 = data.length >= 5 ? data.slice(-5).reduce((s, d) => s + d.close, 0) / 5 : undefined
    const ma20 = data.length >= 20 ? data.slice(-20).reduce((s, d) => s + d.close, 0) / 20 : undefined
    const ma60 = data.length >= 60 ? data.slice(-60).reduce((s, d) => s + d.close, 0) / 60 : undefined

    const enhanced = enhanceWithConfluence(raw, data, {
      rsiValue: lastRSI,
      kdK: lastKD?.k,
      kdD: lastKD?.d,
      macdHistogram: lastMACD?.histogram,
      macdCross,
      ma5, ma20, ma60,
    })

    // Only show recent patterns (last 20 bars), sort by confluence score
    const cutoff = data.length - 20
      return enhanced
        .filter((p) => p.index >= cutoff)
        .sort((a, b) => (b.confluenceScore ?? 0) - (a.confluenceScore ?? 0))
        .slice(0, 6)
    } catch (e) {
      console.error('PatternAnalysis error:', e)
      return []
    }
  }, [data, kdData, macdData, rsiData])

  // Overall confluence summary
  const highConfPatterns = patterns.filter(p => (p.confluenceScore ?? 0) >= 50)
  const bullishHigh = highConfPatterns.filter(p => p.type === 'bullish').length
  const bearishHigh = highConfPatterns.filter(p => p.type === 'bearish').length

  let overallVerdict = '觀望'
  let verdictColor = 'text-gray-500'
  if (bullishHigh > bearishHigh && bullishHigh > 0) { overallVerdict = '偏多訊號'; verdictColor = 'text-red-500' }
  else if (bearishHigh > bullishHigh && bearishHigh > 0) { overallVerdict = '偏空訊號'; verdictColor = 'text-green-500' }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-violet-500" /> K 線型態辨識
          <span className="text-[10px] text-gray-400 font-normal">多重驗證</span>
        </h3>
        <div className="flex items-center gap-2">
          {highConfPatterns.length > 0 && (
            <span className={`badge text-[10px] font-semibold ${verdictColor} bg-opacity-10`}>
              {overallVerdict}
            </span>
          )}
          <span className="text-xs text-gray-400">
            近 20 根
          </span>
        </div>
      </div>

      {/* Explanation banner */}
      <div className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mb-3">
        💡 複合信心分數 = K線型態可靠度 + 成交量確認 + 支撐壓力位置 + 指標共振（RSI/KD/MACD）
      </div>

      {patterns.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400">
          近期未偵測到明顯 K 線型態
        </div>
      ) : (
        <div className="space-y-2.5">
          {patterns.map((p, idx) => {
            const cfg = typeConfig[p.type]
            const Icon = cfg.icon
            const isStrong = (p.confluenceScore ?? 0) >= 50

            return (
              <div
                key={`${p.time}-${p.name}-${idx}`}
                className={`rounded-lg p-3 border ${
                  isStrong
                    ? (p.type === 'bullish' ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20' :
                       p.type === 'bearish' ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20' :
                       'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800')
                    : 'border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                    <span className={`font-semibold text-sm ${isStrong ? '' : 'text-gray-500'}`}>{p.name}</span>
                    <span className="text-[10px] text-gray-400">{p.nameEn}</span>
                    {isStrong && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 font-semibold">⚡ 強訊號</span>}
                  </div>
                  <span className="text-[10px] text-gray-400">{p.time}</span>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{p.description}</p>

                {/* Confluence details */}
                <div className="flex items-center justify-between flex-wrap gap-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <ConfirmTag ok={p.volumeConfirm} label={`量${p.volumeRatio ? p.volumeRatio.toFixed(1) + 'x' : ''}`} />
                    <ConfirmTag ok={p.trendConfirm} label="位置" />
                    <ConfirmTag ok={p.indicatorConfirm} label="指標共振" />
                  </div>
                  <ConfidenceBar score={p.confluenceScore ?? 0} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 已確認</span>
          <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-gray-400" /> 未確認</span>
        </div>
        <span>信心 ≥50 為可操作訊號</span>
      </div>
    </div>
  )
}
