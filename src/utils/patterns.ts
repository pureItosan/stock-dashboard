import type { OHLCV } from '../types'

export interface CandlePattern {
  time: string
  index: number
  name: string
  nameEn: string
  type: 'bullish' | 'bearish' | 'neutral'
  reliability: 1 | 2 | 3  // 1=low, 2=medium, 3=high
  description: string
  volumeConfirm?: boolean      // volume above average?
  trendConfirm?: boolean       // pattern aligns with trend context?
  indicatorConfirm?: boolean   // indicators agree?
  confluenceScore?: number     // 0-100 composite confidence
  volumeRatio?: number         // current vol / avg vol
}

function bodySize(c: OHLCV) { return Math.abs(c.close - c.open) }
function upperShadow(c: OHLCV) { return c.high - Math.max(c.open, c.close) }
function lowerShadow(c: OHLCV) { return Math.min(c.open, c.close) - c.low }
function range(c: OHLCV) { return c.high - c.low }
function isBullish(c: OHLCV) { return c.close > c.open }
function isBearish(c: OHLCV) { return c.close < c.open }
function isDoji(c: OHLCV) { return bodySize(c) <= range(c) * 0.1 && range(c) > 0 }

function avgBody(data: OHLCV[], idx: number, lookback = 10): number {
  let sum = 0, count = 0
  for (let i = Math.max(0, idx - lookback); i < idx; i++) {
    sum += bodySize(data[i])
    count++
  }
  return count > 0 ? sum / count : 1
}

export function detectPatterns(data: OHLCV[]): CandlePattern[] {
  const patterns: CandlePattern[] = []
  if (data.length < 5) return patterns

  for (let i = 1; i < data.length; i++) {
    const c = data[i]
    const p = data[i - 1]
    const r = range(c)
    const b = bodySize(c)
    const avg = avgBody(data, i)

    if (r === 0) continue

    // === Single Candle Patterns ===

    // Doji 十字線
    if (isDoji(c) && r > avg * 0.5) {
      patterns.push({
        time: c.time, index: i,
        name: '十字線', nameEn: 'Doji',
        type: 'neutral', reliability: 1,
        description: '開盤價≈收盤價，多空拉鋸，可能反轉訊號',
      })
    }

    // Hammer 鎚子 (bullish, at bottom)
    if (isBullish(c) && lowerShadow(c) >= b * 2 && upperShadow(c) < b * 0.5 && b > 0) {
      // Check if it's after a downtrend (last 5 bars declining)
      if (i >= 3 && data[i-1].close < data[i-3].close) {
        patterns.push({
          time: c.time, index: i,
          name: '鎚子', nameEn: 'Hammer',
          type: 'bullish', reliability: 2,
          description: '下跌趨勢中出現長下影線，可能止跌反彈',
        })
      }
    }

    // Hanging Man 吊人 (bearish, at top)
    if (lowerShadow(c) >= b * 2 && upperShadow(c) < b * 0.5 && b > 0) {
      if (i >= 3 && data[i-1].close > data[i-3].close) {
        patterns.push({
          time: c.time, index: i,
          name: '吊人', nameEn: 'Hanging Man',
          type: 'bearish', reliability: 2,
          description: '上漲趨勢中出現長下影線，可能見頂回落',
        })
      }
    }

    // Shooting Star 流星 (bearish)
    if (upperShadow(c) >= b * 2 && lowerShadow(c) < b * 0.5 && b > 0) {
      if (i >= 3 && data[i-1].close > data[i-3].close) {
        patterns.push({
          time: c.time, index: i,
          name: '流星', nameEn: 'Shooting Star',
          type: 'bearish', reliability: 2,
          description: '上漲趨勢中出現長上影線，上方賣壓沉重',
        })
      }
    }

    // Inverted Hammer 倒鎚子 (bullish)
    if (upperShadow(c) >= b * 2 && lowerShadow(c) < b * 0.5 && b > 0) {
      if (i >= 3 && data[i-1].close < data[i-3].close) {
        patterns.push({
          time: c.time, index: i,
          name: '倒鎚子', nameEn: 'Inverted Hammer',
          type: 'bullish', reliability: 1,
          description: '下跌趨勢中出現長上影線，可能醞釀反彈',
        })
      }
    }

    // Marubozu 光頭光腳 (strong trend)
    if (b > avg * 1.5 && upperShadow(c) < b * 0.05 && lowerShadow(c) < b * 0.05) {
      patterns.push({
        time: c.time, index: i,
        name: isBullish(c) ? '紅色光頭光腳' : '黑色光頭光腳',
        nameEn: isBullish(c) ? 'Bullish Marubozu' : 'Bearish Marubozu',
        type: isBullish(c) ? 'bullish' : 'bearish', reliability: 2,
        description: isBullish(c) ? '強勢上漲，無上下影線，買盤極強' : '強勢下跌，無上下影線，賣壓極重',
      })
    }

    // === Two Candle Patterns ===

    // Bullish Engulfing 多頭吞噬
    if (i >= 1 && isBearish(p) && isBullish(c) && c.open <= p.close && c.close >= p.open && b > bodySize(p) * 1.2) {
      patterns.push({
        time: c.time, index: i,
        name: '多頭吞噬', nameEn: 'Bullish Engulfing',
        type: 'bullish', reliability: 3,
        description: '紅K完全包覆前一根黑K，強力反轉看漲訊號',
      })
    }

    // Bearish Engulfing 空頭吞噬
    if (i >= 1 && isBullish(p) && isBearish(c) && c.open >= p.close && c.close <= p.open && b > bodySize(p) * 1.2) {
      patterns.push({
        time: c.time, index: i,
        name: '空頭吞噬', nameEn: 'Bearish Engulfing',
        type: 'bearish', reliability: 3,
        description: '黑K完全包覆前一根紅K，強力反轉看跌訊號',
      })
    }

    // Bullish Harami 多頭孕線
    if (i >= 1 && isBearish(p) && isBullish(c) && bodySize(p) > avg * 1.2 &&
        c.open > p.close && c.close < p.open && b < bodySize(p) * 0.5) {
      patterns.push({
        time: c.time, index: i,
        name: '多頭孕線', nameEn: 'Bullish Harami',
        type: 'bullish', reliability: 2,
        description: '小紅K被前一根大黑K包覆，下跌動能減弱',
      })
    }

    // Bearish Harami 空頭孕線
    if (i >= 1 && isBullish(p) && isBearish(c) && bodySize(p) > avg * 1.2 &&
        c.close > p.open && c.open < p.close && b < bodySize(p) * 0.5) {
      patterns.push({
        time: c.time, index: i,
        name: '空頭孕線', nameEn: 'Bearish Harami',
        type: 'bearish', reliability: 2,
        description: '小黑K被前一根大紅K包覆，上漲動能減弱',
      })
    }

    // Piercing Line 貫穿線 (bullish)
    if (i >= 1 && isBearish(p) && isBullish(c) && c.open < p.low &&
        c.close > (p.open + p.close) / 2 && c.close < p.open) {
      patterns.push({
        time: c.time, index: i,
        name: '貫穿線', nameEn: 'Piercing Line',
        type: 'bullish', reliability: 2,
        description: '低開後反彈收在前一黑K實體上半部，反轉看漲',
      })
    }

    // Dark Cloud Cover 烏雲蓋頂 (bearish)
    if (i >= 1 && isBullish(p) && isBearish(c) && c.open > p.high &&
        c.close < (p.open + p.close) / 2 && c.close > p.open) {
      patterns.push({
        time: c.time, index: i,
        name: '烏雲蓋頂', nameEn: 'Dark Cloud Cover',
        type: 'bearish', reliability: 2,
        description: '高開後回落收在前一紅K實體下半部，反轉看跌',
      })
    }

    // === Three Candle Patterns ===
    if (i >= 2) {
      const pp = data[i - 2]

      // Morning Star 晨星 (bullish)
      if (isBearish(pp) && bodySize(pp) > avg &&
          isDoji(p) && p.close < pp.close && p.open < pp.close &&
          isBullish(c) && c.close > (pp.open + pp.close) / 2) {
        patterns.push({
          time: c.time, index: i,
          name: '晨星', nameEn: 'Morning Star',
          type: 'bullish', reliability: 3,
          description: '大黑K→十字/小K→大紅K，經典底部反轉型態',
        })
      }

      // Evening Star 暮星 (bearish)
      if (isBullish(pp) && bodySize(pp) > avg &&
          isDoji(p) && p.close > pp.close && p.open > pp.close &&
          isBearish(c) && c.close < (pp.open + pp.close) / 2) {
        patterns.push({
          time: c.time, index: i,
          name: '暮星', nameEn: 'Evening Star',
          type: 'bearish', reliability: 3,
          description: '大紅K→十字/小K→大黑K，經典頂部反轉型態',
        })
      }

      // Three White Soldiers 紅三兵
      if (isBullish(pp) && isBullish(p) && isBullish(c) &&
          p.close > pp.close && c.close > p.close &&
          bodySize(pp) > avg * 0.8 && bodySize(p) > avg * 0.8 && bodySize(c) > avg * 0.8 &&
          upperShadow(pp) < bodySize(pp) * 0.3 && upperShadow(p) < bodySize(p) * 0.3 && upperShadow(c) < bodySize(c) * 0.3) {
        patterns.push({
          time: c.time, index: i,
          name: '紅三兵', nameEn: 'Three White Soldiers',
          type: 'bullish', reliability: 3,
          description: '連續三根帶量紅K遞增，強勢上攻訊號',
        })
      }

      // Three Black Crows 三隻烏鴉
      if (isBearish(pp) && isBearish(p) && isBearish(c) &&
          p.close < pp.close && c.close < p.close &&
          bodySize(pp) > avg * 0.8 && bodySize(p) > avg * 0.8 && bodySize(c) > avg * 0.8 &&
          lowerShadow(pp) < bodySize(pp) * 0.3 && lowerShadow(p) < bodySize(p) * 0.3 && lowerShadow(c) < bodySize(c) * 0.3) {
        patterns.push({
          time: c.time, index: i,
          name: '三隻烏鴉', nameEn: 'Three Black Crows',
          type: 'bearish', reliability: 3,
          description: '連續三根帶量黑K遞減，強勢下殺訊號',
        })
      }
    }
  }

  return patterns
}

// ===== Confluence Enhancement =====

interface ConfluenceContext {
  rsiValue?: number           // latest RSI
  kdK?: number; kdD?: number  // latest KD
  macdHistogram?: number      // latest MACD histogram
  macdCross?: 'golden' | 'death' | null
  ma5?: number; ma20?: number; ma60?: number
}

export function enhanceWithConfluence(
  patterns: CandlePattern[],
  data: OHLCV[],
  ctx: ConfluenceContext,
): CandlePattern[] {
  if (data.length < 20) return patterns

  // Pre-calc volume average
  const recentData = data.slice(-60)
  const avgVol = recentData.reduce((s, d) => s + d.volume, 0) / recentData.length

  // Support / resistance from recent 60 bars
  const supports: number[] = []
  const resistances: number[] = []
  for (let i = 2; i < recentData.length - 2; i++) {
    if (recentData[i].low <= recentData[i-1].low && recentData[i].low <= recentData[i+1].low &&
        recentData[i].low <= recentData[i-2].low && recentData[i].low <= recentData[i+2].low) {
      supports.push(recentData[i].low)
    }
    if (recentData[i].high >= recentData[i-1].high && recentData[i].high >= recentData[i+1].high &&
        recentData[i].high >= recentData[i-2].high && recentData[i].high >= recentData[i+2].high) {
      resistances.push(recentData[i].high)
    }
  }

  return patterns.map((pat) => {
    const bar = data[pat.index]
    if (!bar) return pat

    let score = 0
    const maxScore = 5 // total possible points

    // 1. Volume confirmation (0-1 point)
    const volRatio = avgVol > 0 ? bar.volume / avgVol : 1
    const volumeConfirm = volRatio > 1.2
    if (volumeConfirm) score += 1

    // 2. Trend context (0-1 point)
    // Bullish patterns near support = good; bearish patterns near resistance = good
    let trendConfirm = false
    const price = bar.close
    if (pat.type === 'bullish') {
      const nearSupport = supports.some(s => Math.abs(price - s) / price < 0.03)
      const inDowntrend = ctx.ma5 != null && ctx.ma20 != null && price < ctx.ma20
      trendConfirm = nearSupport || inDowntrend // bullish reversal from low = good
      if (trendConfirm) score += 1
    } else if (pat.type === 'bearish') {
      const nearResistance = resistances.some(r => Math.abs(price - r) / price < 0.03)
      const inUptrend = ctx.ma5 != null && ctx.ma20 != null && price > ctx.ma20
      trendConfirm = nearResistance || inUptrend // bearish reversal from high = good
      if (trendConfirm) score += 1
    }

    // 3. Indicator confluence (0-2 points)
    let indicatorConfirm = false
    let indicatorAgree = 0

    if (pat.type === 'bullish') {
      if (ctx.rsiValue != null && ctx.rsiValue < 40) indicatorAgree++
      if (ctx.kdK != null && ctx.kdD != null && ctx.kdK < 30) indicatorAgree++
      if (ctx.macdCross === 'golden') indicatorAgree++
      if (ctx.macdHistogram != null && ctx.macdHistogram > 0) indicatorAgree += 0.5
    } else if (pat.type === 'bearish') {
      if (ctx.rsiValue != null && ctx.rsiValue > 60) indicatorAgree++
      if (ctx.kdK != null && ctx.kdD != null && ctx.kdK > 70) indicatorAgree++
      if (ctx.macdCross === 'death') indicatorAgree++
      if (ctx.macdHistogram != null && ctx.macdHistogram < 0) indicatorAgree += 0.5
    }

    if (indicatorAgree >= 1) { indicatorConfirm = true; score += Math.min(2, indicatorAgree) }

    // 4. Base reliability (0-1 point)
    score += pat.reliability / 3

    const confluenceScore = Math.round((score / maxScore) * 100)

    return {
      ...pat,
      volumeConfirm,
      trendConfirm,
      indicatorConfirm,
      confluenceScore,
      volumeRatio: Math.round(volRatio * 100) / 100,
    }
  })
}

// Probability analysis utilities
export interface ProbabilityResult {
  upProb: number
  downProb: number
  flatProb: number
  expectedRange: { low: number; high: number }
  confidenceRange95: { low: number; high: number }
  historicalWinRate: number
  avgWeeklyReturn: number
  volatility: number
  supportLevels: number[]
  resistanceLevels: number[]
  scenarioBullish: { price: number; prob: number }
  scenarioBearish: { price: number; prob: number }
  scenarioBase: { price: number; prob: number }
}

export function analyzeProbability(
  data: OHLCV[],
  technicalScore: number, // -1 to +1 from technical indicators
): ProbabilityResult | null {
  if (data.length < 30) return null

  const lastPrice = data[data.length - 1].close

  // Calculate weekly returns
  const weeklyReturns: number[] = []
  for (let i = 5; i < data.length; i++) {
    const ret = (data[i].close - data[i - 5].close) / data[i - 5].close
    weeklyReturns.push(ret)
  }

  if (weeklyReturns.length < 10) return null

  // Statistics
  const avgReturn = weeklyReturns.reduce((s, r) => s + r, 0) / weeklyReturns.length
  const variance = weeklyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / weeklyReturns.length
  const stdDev = Math.sqrt(variance)

  // Historical win rate (positive weekly returns)
  const wins = weeklyReturns.filter(r => r > 0).length
  const historicalWinRate = wins / weeklyReturns.length

  // Adjusted expected return based on technical score
  const adjustedReturn = avgReturn + technicalScore * stdDev * 0.3

  // Probability estimates using normal distribution approximation
  // P(up > 1%) = ?
  const zUp = (0.01 - adjustedReturn) / stdDev
  const zDown = (-0.01 - adjustedReturn) / stdDev
  const normCDF = (z: number) => 0.5 * (1 + erf(z / Math.sqrt(2)))
  const upProb = 1 - normCDF(zUp)
  const downProb = normCDF(zDown)
  const flatProb = Math.max(0, 1 - upProb - downProb)

  // Price ranges
  const expectedLow = lastPrice * (1 + adjustedReturn - stdDev)
  const expectedHigh = lastPrice * (1 + adjustedReturn + stdDev)
  const conf95Low = lastPrice * (1 + adjustedReturn - 1.96 * stdDev)
  const conf95High = lastPrice * (1 + adjustedReturn + 1.96 * stdDev)

  // Support and resistance levels (from recent highs/lows)
  const recent = data.slice(-60)
  const supports: number[] = []
  const resistances: number[] = []

  for (let i = 2; i < recent.length - 2; i++) {
    const isLocalMin = recent[i].low <= recent[i-1].low && recent[i].low <= recent[i-2].low &&
                       recent[i].low <= recent[i+1].low && recent[i].low <= recent[i+2].low
    const isLocalMax = recent[i].high >= recent[i-1].high && recent[i].high >= recent[i-2].high &&
                       recent[i].high >= recent[i+1].high && recent[i].high >= recent[i+2].high

    if (isLocalMin && recent[i].low < lastPrice) supports.push(recent[i].low)
    if (isLocalMax && recent[i].high > lastPrice) resistances.push(recent[i].high)
  }

  // Deduplicate close levels (within 1%)
  const dedup = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b)
    const result: number[] = []
    for (const v of sorted) {
      if (result.length === 0 || Math.abs(v - result[result.length - 1]) / result[result.length - 1] > 0.01) {
        result.push(v)
      }
    }
    return result
  }

  const supportLevels = dedup(supports).slice(-3)
  const resistanceLevels = dedup(resistances).slice(0, 3)

  // Scenarios
  const bullishReturn = adjustedReturn + stdDev * 0.8
  const bearishReturn = adjustedReturn - stdDev * 0.8

  return {
    upProb: Math.round(upProb * 100),
    downProb: Math.round(downProb * 100),
    flatProb: Math.round(flatProb * 100),
    expectedRange: { low: Math.round(expectedLow * 100) / 100, high: Math.round(expectedHigh * 100) / 100 },
    confidenceRange95: { low: Math.round(conf95Low * 100) / 100, high: Math.round(conf95High * 100) / 100 },
    historicalWinRate: Math.round(historicalWinRate * 100),
    avgWeeklyReturn: Math.round(avgReturn * 10000) / 100,
    volatility: Math.round(stdDev * 10000) / 100,
    supportLevels,
    resistanceLevels,
    scenarioBullish: { price: Math.round(lastPrice * (1 + bullishReturn) * 100) / 100, prob: Math.round(upProb * 100) },
    scenarioBearish: { price: Math.round(lastPrice * (1 + bearishReturn) * 100) / 100, prob: Math.round(downProb * 100) },
    scenarioBase: { price: Math.round(lastPrice * (1 + adjustedReturn) * 100) / 100, prob: Math.round(flatProb * 100) },
  }
}

// Error function approximation for normal CDF
function erf(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x)
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return sign * y
}
