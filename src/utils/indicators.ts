import type { OHLCV, KDData, MACDData, TDCount } from '../types'

export function calculateKD(data: OHLCV[], period = 9): KDData[] {
  const result: KDData[] = []
  let prevK = 50
  let prevD = 50

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, k: 50, d: 50, rsv: 50 })
      continue
    }

    let highestHigh = -Infinity
    let lowestLow = Infinity
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].high > highestHigh) highestHigh = data[j].high
      if (data[j].low < lowestLow) lowestLow = data[j].low
    }

    const range = highestHigh - lowestLow
    const rsv = range === 0 ? 50 : ((data[i].close - lowestLow) / range) * 100
    const k = (2 / 3) * prevK + (1 / 3) * rsv
    const d = (2 / 3) * prevD + (1 / 3) * k

    prevK = k
    prevD = d
    result.push({ time: data[i].time, k, d, rsv })
  }
  return result
}

function ema(values: number[], period: number): number[] {
  const result: number[] = []
  const multiplier = 2 / (period + 1)

  let sum = 0
  for (let i = 0; i < period && i < values.length; i++) {
    sum += values[i]
  }
  result.length = period - 1
  result.fill(0)
  result.push(sum / period)

  for (let i = period; i < values.length; i++) {
    result.push((values[i] - result[i - 1]) * multiplier + result[i - 1])
  }
  return result
}

export function calculateMACD(
  data: OHLCV[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDData[] {
  const closes = data.map((d) => d.close)
  const ema12 = ema(closes, fastPeriod)
  const ema26 = ema(closes, slowPeriod)

  const dif: number[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < slowPeriod - 1) {
      dif.push(0)
    } else {
      dif.push(ema12[i] - ema26[i])
    }
  }

  const difForSignal = dif.slice(slowPeriod - 1)
  const signalLine = ema(difForSignal, signalPeriod)

  const result: MACDData[] = []
  for (let i = 0; i < data.length; i++) {
    const signalIdx = i - (slowPeriod - 1)
    if (signalIdx < signalPeriod - 1 || signalIdx < 0) {
      result.push({ time: data[i].time, dif: dif[i], dea: 0, histogram: 0 })
    } else {
      const dea = signalLine[signalIdx]
      result.push({
        time: data[i].time,
        dif: dif[i],
        dea,
        histogram: (dif[i] - dea) * 2,
      })
    }
  }
  return result
}

export function calculateTDSequential(data: OHLCV[]): TDCount[] {
  const result: TDCount[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < 4) {
      result.push({ time: data[i].time, buyCount: 0, sellCount: 0 })
      continue
    }

    const prev = result[i - 1]
    let buyCount = 0
    let sellCount = 0

    if (data[i].close < data[i - 4].close) {
      buyCount = prev.buyCount > 0 ? prev.buyCount + 1 : 1
      if (buyCount > 9) buyCount = 1
    } else if (data[i].close > data[i - 4].close) {
      sellCount = prev.sellCount > 0 ? prev.sellCount + 1 : 1
      if (sellCount > 9) sellCount = 1
    }

    result.push({ time: data[i].time, buyCount, sellCount })
  }
  return result
}

export function calculateMA(data: OHLCV[], period: number): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close
    result.push({ time: data[i].time, value: sum / period })
  }
  return result
}

export function calculateBollingerBands(
  data: OHLCV[],
  period = 20,
  multiplier = 2
): { time: string; upper: number; middle: number; lower: number }[] {
  const result: { time: string; upper: number; middle: number; lower: number }[] = []
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close
    const mean = sum / period

    let sqSum = 0
    for (let j = i - period + 1; j <= i; j++) sqSum += (data[j].close - mean) ** 2
    const std = Math.sqrt(sqSum / period)

    result.push({
      time: data[i].time,
      upper: mean + multiplier * std,
      middle: mean,
      lower: mean - multiplier * std,
    })
  }
  return result
}

export function calculateCCI(data: OHLCV[], period = 20): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = []
  for (let i = period - 1; i < data.length; i++) {
    let sumTP = 0
    for (let j = i - period + 1; j <= i; j++) {
      sumTP += (data[j].high + data[j].low + data[j].close) / 3
    }
    const meanTP = sumTP / period
    const tp = (data[i].high + data[i].low + data[i].close) / 3
    let sumDev = 0
    for (let j = i - period + 1; j <= i; j++) {
      sumDev += Math.abs((data[j].high + data[j].low + data[j].close) / 3 - meanTP)
    }
    const meanDev = sumDev / period
    const cci = meanDev === 0 ? 0 : (tp - meanTP) / (0.015 * meanDev)
    result.push({ time: data[i].time, value: cci })
  }
  return result
}

export function calculateWilliamsR(data: OHLCV[], period = 14): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = []
  for (let i = period - 1; i < data.length; i++) {
    let hh = -Infinity, ll = Infinity
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].high > hh) hh = data[j].high
      if (data[j].low < ll) ll = data[j].low
    }
    const wr = hh === ll ? -50 : ((hh - data[i].close) / (hh - ll)) * -100
    result.push({ time: data[i].time, value: wr })
  }
  return result
}

export function calculateMomentum(data: OHLCV[], period = 10): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = []
  for (let i = period; i < data.length; i++) {
    result.push({ time: data[i].time, value: data[i].close - data[i - period].close })
  }
  return result
}

export function calculateADX(data: OHLCV[], period = 14): { time: string; adx: number; pdi: number; mdi: number }[] {
  if (data.length < period * 2) return []
  const trueRanges: number[] = []
  const plusDM: number[] = []
  const minusDM: number[] = []

  for (let i = 1; i < data.length; i++) {
    const high = data[i].high, low = data[i].low, prevClose = data[i - 1].close
    trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)))
    const upMove = data[i].high - data[i - 1].high
    const downMove = data[i - 1].low - data[i].low
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
  }

  const smooth = (arr: number[], p: number) => {
    const result: number[] = []
    let sum = 0
    for (let i = 0; i < p; i++) sum += arr[i]
    result.push(sum)
    for (let i = p; i < arr.length; i++) {
      result.push(result[result.length - 1] - result[result.length - 1] / p + arr[i])
    }
    return result
  }

  const atr = smooth(trueRanges, period)
  const sPDM = smooth(plusDM, period)
  const sMDM = smooth(minusDM, period)

  const dx: number[] = []
  const result: { time: string; adx: number; pdi: number; mdi: number }[] = []

  for (let i = 0; i < atr.length; i++) {
    const pdi = atr[i] === 0 ? 0 : (sPDM[i] / atr[i]) * 100
    const mdi = atr[i] === 0 ? 0 : (sMDM[i] / atr[i]) * 100
    const sumDI = pdi + mdi
    dx.push(sumDI === 0 ? 0 : (Math.abs(pdi - mdi) / sumDI) * 100)

    let adx = 0
    if (dx.length >= period) {
      if (dx.length === period) {
        adx = dx.reduce((s, v) => s + v, 0) / period
      } else {
        adx = (result[result.length - 1].adx * (period - 1) + dx[dx.length - 1]) / period
      }
      result.push({ time: data[i + 1].time, adx, pdi, mdi })
    }
  }
  return result
}

export function calculateRSI(data: OHLCV[], period = 14): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = []
  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period && i < data.length; i++) {
    const change = data[i].close - data[i - 1].close
    if (change > 0) avgGain += change
    else avgLoss -= change
  }
  avgGain /= period
  avgLoss /= period

  for (let i = period; i < data.length; i++) {
    if (i > period) {
      const change = data[i].close - data[i - 1].close
      avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period
      avgLoss = (avgLoss * (period - 1) + (change < 0 ? -change : 0)) / period
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push({ time: data[i].time, value: 100 - 100 / (1 + rs) })
  }
  return result
}
