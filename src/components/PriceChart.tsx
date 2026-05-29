import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData, SeriesMarker, Time } from 'lightweight-charts'
import type { OHLCV, Timeframe, TDCount } from '../types'
import { calculateMA, calculateTDSequential } from '../utils/indicators'

interface Props {
  data: OHLCV[]
  timeframe: Timeframe
  onTimeframeChange: (tf: Timeframe) => void
  showTD: boolean
  showBB: boolean
  bbData: { time: string; upper: number; middle: number; lower: number }[]
  darkMode: boolean
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1d', label: '日線' },
  { value: '1wk', label: '週線' },
  { value: '1mo', label: '月線' },
]

const MA_CONFIGS = [
  { period: 5, color: '#f59e0b' },
  { period: 10, color: '#3b82f6' },
  { period: 20, color: '#ef4444' },
  { period: 60, color: '#8b5cf6' },
]

export default function PriceChart({ data, timeframe, onTimeframeChange, showTD, showBB, bbData, darkMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [crosshairData, setCrosshairData] = useState<any>(null)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const container = containerRef.current
    container.innerHTML = ''

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: darkMode ? '#111827' : '#ffffff' },
        textColor: darkMode ? '#9ca3af' : '#6b7280',
        fontFamily: "'Noto Sans TC', sans-serif",
      },
      grid: {
        vertLines: { color: darkMode ? '#1f2937' : '#f3f4f6' },
        horzLines: { color: darkMode ? '#1f2937' : '#f3f4f6' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: darkMode ? '#374151' : '#e5e7eb' },
      timeScale: {
        borderColor: darkMode ? '#374151' : '#e5e7eb',
        timeVisible: false,
      },
      width: container.clientWidth,
      height: 420,
    })

    chartRef.current = chart

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#ef4444',
      downColor: '#22c55e',
      borderUpColor: '#ef4444',
      borderDownColor: '#22c55e',
      wickUpColor: '#ef4444',
      wickDownColor: '#22c55e',
    })

    const candleData: CandlestickData[] = data.map((d) => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))
    candleSeries.setData(candleData)

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    const volumeData: HistogramData[] = data.map((d) => ({
      time: d.time as Time,
      value: d.volume,
      color: d.close >= d.open
        ? (darkMode ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.4)')
        : (darkMode ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.4)'),
    }))
    volumeSeries.setData(volumeData)

    const maSeriesRefs: ISeriesApi<'Line'>[] = []
    for (const ma of MA_CONFIGS) {
      const maData = calculateMA(data, ma.period)
      if (maData.length === 0) continue
      const series = chart.addLineSeries({
        color: ma.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      series.setData(maData.map((d) => ({ time: d.time as Time, value: d.value })))
      maSeriesRefs.push(series)
    }

    if (showTD) {
      const td = calculateTDSequential(data)
      const markers: SeriesMarker<Time>[] = []
      td.forEach((t: TDCount) => {
        if (t.buyCount >= 1 && t.buyCount <= 9) {
          const bar = data.find((d) => d.time === t.time)
          if (bar) {
            markers.push({
              time: t.time as Time,
              position: 'belowBar',
              shape: 'circle',
              color: t.buyCount === 9 ? '#22c55e' : 'rgba(34,197,94,0.5)',
              text: t.buyCount === 9 ? '9' : (t.buyCount >= 7 ? String(t.buyCount) : ''),
              size: t.buyCount === 9 ? 2 : 0.5,
            })
          }
        }
        if (t.sellCount >= 1 && t.sellCount <= 9) {
          const bar = data.find((d) => d.time === t.time)
          if (bar) {
            markers.push({
              time: t.time as Time,
              position: 'aboveBar',
              shape: 'circle',
              color: t.sellCount === 9 ? '#ef4444' : 'rgba(239,68,68,0.5)',
              text: t.sellCount === 9 ? '9' : (t.sellCount >= 7 ? String(t.sellCount) : ''),
              size: t.sellCount === 9 ? 2 : 0.5,
            })
          }
        }
      })
      candleSeries.setMarkers(markers)
    }

    if (showBB && bbData.length > 0) {
      const bbUpper = chart.addLineSeries({
        color: 'rgba(59,130,246,0.5)',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      bbUpper.setData(bbData.map((d) => ({ time: d.time as Time, value: d.upper })))

      const bbMiddle = chart.addLineSeries({
        color: 'rgba(59,130,246,0.3)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      bbMiddle.setData(bbData.map((d) => ({ time: d.time as Time, value: d.middle })))

      const bbLower = chart.addLineSeries({
        color: 'rgba(59,130,246,0.5)',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      bbLower.setData(bbData.map((d) => ({ time: d.time as Time, value: d.lower })))
    }

    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const candle = param.seriesData.get(candleSeries)
        const vol = param.seriesData.get(volumeSeries)
        if (candle) setCrosshairData({ ...candle as any, volume: (vol as any)?.value })
      }
    })

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, showTD, showBB, bbData, darkMode])

  const lastBar = data[data.length - 1]

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-sm">K 線圖</h3>
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => onTimeframeChange(tf.value)}
                className={`btn text-xs ${
                  timeframe === tf.value ? 'btn-active border' : 'btn-ghost'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs">
            {MA_CONFIGS.map((ma) => (
              <span key={ma.period} className="flex items-center gap-1">
                <span className="w-3 h-0.5 rounded" style={{ backgroundColor: ma.color }} />
                MA{ma.period}
              </span>
            ))}
          </div>
        </div>
        {crosshairData && (
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>開 {crosshairData.open?.toFixed(2)}</span>
            <span>高 {crosshairData.high?.toFixed(2)}</span>
            <span>低 {crosshairData.low?.toFixed(2)}</span>
            <span className={crosshairData.close >= crosshairData.open ? 'text-red-500' : 'text-green-500'}>
              收 {crosshairData.close?.toFixed(2)}
            </span>
            {crosshairData.volume && (
              <span>量 {(crosshairData.volume / 1000).toFixed(0)}K</span>
            )}
          </div>
        )}
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  )
}
