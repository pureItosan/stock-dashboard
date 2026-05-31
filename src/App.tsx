import { useState, useEffect, useRef } from 'react'
import { Moon, Sun, Activity, ToggleLeft, ToggleRight } from 'lucide-react'
import type { OHLCV, StockQuote, NewsItem, KDData, MACDData, Timeframe, RangeOption, ChipData } from './types'
import { getChartData, getQuote, getNews, getMultipleQuotes, TW_SECTORS, US_SECTORS } from './api/stock'
import { calculateKD, calculateMACD, calculateRSI, calculateBollingerBands } from './utils/indicators'
import { isTaiwanStock } from './utils/format'
import SearchBar from './components/SearchBar'
import StockOverview from './components/StockOverview'
import PriceChart from './components/PriceChart'
import KDChart from './components/KDChart'
import MACDChart from './components/MACDChart'
import RSIChart from './components/RSIChart'
import NewsPanel from './components/NewsPanel'
import ChipPanel from './components/ChipPanel'
import SectorHeatmap from './components/SectorHeatmap'
import RelatedStocks from './components/RelatedStocks'
import Watchlist from './components/Watchlist'
import MarketTicker from './components/MarketTicker'
import SignalSummary from './components/SignalSummary'
import TopMovers from './components/TopMovers'
import PERiverChart from './components/PERiverChart'
import TechnicalSummary from './components/TechnicalSummary'
import PatternAnalysis from './components/PatternAnalysis'
import ProbabilityAnalysis from './components/ProbabilityAnalysis'
import StockScreener from './components/StockScreener'

type IndicatorTab = 'kd' | 'macd' | 'rsi'

function getRangeForTimeframe(tf: Timeframe): RangeOption {
  if (tf === '1mo') return '5y'
  if (tf === '1wk') return '2y'
  return '1y'
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('stockpulse-dark') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  const [symbol, setSymbol] = useState('2330.TW')
  const [timeframe, setTimeframe] = useState<Timeframe>('1d')
  const [indicatorTab, setIndicatorTab] = useState<IndicatorTab>('kd')
  const [showTD, setShowTD] = useState(true)
  const [showBB, setShowBB] = useState(false)

  const [chartData, setChartData] = useState<OHLCV[]>([])
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [kdData, setKDData] = useState<KDData[]>([])
  const [macdData, setMACDData] = useState<MACDData[]>([])
  const [rsiData, setRSIData] = useState<{ time: string; value: number }[]>([])
  const [bbData, setBBData] = useState<{ time: string; upper: number; middle: number; lower: number }[]>([])
  const [chipData, setChipData] = useState<ChipData | null>(null)
  const [relatedStocks, setRelatedStocks] = useState<any[]>([])
  const [sectorName, setSectorName] = useState('')
  const [sectorHeatmap, setSectorHeatmap] = useState<any[]>([])

  const [loadingChart, setLoadingChart] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [loadingNews, setLoadingNews] = useState(false)
  const [loadingChip, setLoadingChip] = useState(false)
  const [loadingHeatmap, setLoadingHeatmap] = useState(false)
  const [loadingRelated, setLoadingRelated] = useState(false)

  const loadVersionRef = useRef(0)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('stockpulse-dark', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    if (!symbol) return
    const version = ++loadVersionRef.current

    setLoadingChart(true)
    setLoadingQuote(true)
    setLoadingNews(true)
    setLoadingChip(true)
    setLoadingRelated(true)
    setLoadingHeatmap(true)

    const range = getRangeForTimeframe(timeframe)
    getChartData(symbol, timeframe, range).then(data => {
      if (loadVersionRef.current !== version) return
      setChartData(data)
      setKDData(calculateKD(data))
      setMACDData(calculateMACD(data))
      setRSIData(calculateRSI(data))
      setBBData(calculateBollingerBands(data))
      setLoadingChart(false)
    }).catch(() => {
      if (loadVersionRef.current !== version) return
      setChartData([])
      setLoadingChart(false)
    })

    getQuote(symbol).then(q => {
      if (loadVersionRef.current !== version) return
      setQuote(q)
      setLoadingQuote(false)
    }).catch(() => {
      if (loadVersionRef.current !== version) return
      setQuote(null)
      setLoadingQuote(false)
    })

    getNews(symbol).then(n => {
      if (loadVersionRef.current !== version) return
      setNews(n)
      setLoadingNews(false)
    }).catch(() => {
      if (loadVersionRef.current !== version) return
      setNews([])
      setLoadingNews(false)
    })

    if (isTaiwanStock(symbol)) {
      const stockId = symbol.replace('.TW', '').replace('.TWO', '')
      const today = new Date()
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
      fetch(`/api/twse/institutional/${dateStr}`).then(r => r.json()).then(data => {
        if (loadVersionRef.current !== version) return
        if (data.data) {
          const row = data.data.find((r: string[]) => r[0]?.trim() === stockId)
          if (row) {
            const parse = (s: string) => parseInt(s.replace(/,/g, ''), 10) || 0
            setChipData({
              foreignBuy: parse(row[2]), foreignSell: parse(row[3]), foreignNet: parse(row[4]),
              trustBuy: parse(row[5]), trustSell: parse(row[6]), trustNet: parse(row[7]),
              dealerBuy: parse(row[8]) + parse(row[11]), dealerSell: parse(row[9]) + parse(row[12]),
              dealerNet: parse(row[10]) + parse(row[13]),
            })
          } else { setChipData(null) }
        } else { setChipData(null) }
        setLoadingChip(false)
      }).catch(() => { if (loadVersionRef.current === version) { setChipData(null); setLoadingChip(false) } })
    } else {
      setChipData(null)
      setLoadingChip(false)
    }

    const isTW = isTaiwanStock(symbol)
    const sectors = isTW ? TW_SECTORS : US_SECTORS
    let foundSector = ''
    let sectorStocks: string[] = []
    for (const [, sector] of Object.entries(sectors)) {
      if (sector.stocks.includes(symbol)) {
        foundSector = sector.name
        sectorStocks = sector.stocks.filter(s => s !== symbol)
        break
      }
    }
    setSectorName(foundSector)
    if (sectorStocks.length > 0) {
      getMultipleQuotes(sectorStocks).then(quotes => {
        if (loadVersionRef.current !== version) return
        setRelatedStocks(quotes)
        setLoadingRelated(false)
      }).catch(() => { if (loadVersionRef.current === version) { setRelatedStocks([]); setLoadingRelated(false) } })
    } else {
      setRelatedStocks([])
      setLoadingRelated(false)
    }

    const allSymbols = Object.values(sectors).flatMap(s => s.stocks)
    getMultipleQuotes(allSymbols).then(quotes => {
      if (loadVersionRef.current !== version) return
      const quoteMap = new Map(quotes.map((q: any) => [q.symbol, q]))
      const result = Object.entries(sectors).map(([, sector]) => {
        const stocks = sector.stocks.map(s => quoteMap.get(s)).filter(Boolean).map((q: any) => ({
          symbol: q.symbol, name: q.name, price: q.price,
          change: q.change, changePercent: q.changePercent, marketCap: q.marketCap,
        }))
        const avgChange = stocks.length > 0
          ? stocks.reduce((sum: number, s: any) => sum + s.changePercent, 0) / stocks.length : 0
        return { name: sector.name, stocks, avgChange }
      }).filter(s => s.stocks.length > 0).sort((a, b) => b.avgChange - a.avgChange)
      setSectorHeatmap(result)
      setLoadingHeatmap(false)
    }).catch(() => { if (loadVersionRef.current === version) { setSectorHeatmap([]); setLoadingHeatmap(false) } })
  }, [symbol, timeframe])

  const handleSymbolSelect = (sym: string) => {
    setSymbol(sym)
    setTimeframe('1d')
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <Activity className="w-6 h-6 text-blue-600" />
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              幫哥換車
            </h1>
          </div>
          <SearchBar onSelect={handleSymbolSelect} />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBB(!showBB)}
              className={`btn text-xs flex items-center gap-1 ${showBB ? 'btn-active border' : 'btn-ghost'}`}
              title="布林通道"
            >
              {showBB ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              BB
            </button>
            <button
              onClick={() => setShowTD(!showTD)}
              className={`btn text-xs flex items-center gap-1 ${showTD ? 'btn-active border' : 'btn-ghost'}`}
              title="TD 九轉序列"
            >
              {showTD ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              TD9
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="btn btn-ghost p-2"
              title={darkMode ? '切換淺色模式' : '切換深色模式'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <MarketTicker />

      <main className="max-w-[1600px] mx-auto px-4 py-4">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-9 space-y-4">
            <StockOverview quote={quote} loading={loadingQuote} />

            {chartData.length > 0 ? (
              <PriceChart
                data={chartData}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                showTD={showTD}
                showBB={showBB}
                bbData={bbData}
                darkMode={darkMode}
              />
            ) : loadingChart ? (
              <div className="card h-[470px] flex items-center justify-center animate-pulse-gentle">
                <span className="text-gray-400">載入圖表中...</span>
              </div>
            ) : null}

            <SignalSummary kdData={kdData} macdData={macdData} rsiData={rsiData} chartData={chartData} />

            <StockScreener onStockClick={handleSymbolSelect} />

            <ProbabilityAnalysis chartData={chartData} kdData={kdData} macdData={macdData} rsiData={rsiData} />

            <div>
              <div className="flex items-center gap-1 mb-3">
                {([
                  { key: 'kd', label: 'KD 指標' },
                  { key: 'macd', label: 'MACD' },
                  { key: 'rsi', label: 'RSI' },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setIndicatorTab(tab.key)}
                    className={`btn text-xs ${indicatorTab === tab.key ? 'btn-active border' : 'btn-ghost'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {indicatorTab === 'kd' && <KDChart data={kdData} darkMode={darkMode} />}
              {indicatorTab === 'macd' && <MACDChart data={macdData} darkMode={darkMode} />}
              {indicatorTab === 'rsi' && <RSIChart data={rsiData} darkMode={darkMode} />}
            </div>

            <PatternAnalysis data={chartData} kdData={kdData} macdData={macdData} rsiData={rsiData} />

            <TechnicalSummary
              chartData={chartData}
              kdData={kdData}
              macdData={macdData}
              rsiData={rsiData}
              darkMode={darkMode}
            />

            <PERiverChart symbol={symbol} darkMode={darkMode} />

            <ChipPanel data={chipData} loading={loadingChip} isTW={isTaiwanStock(symbol)} />

            <SectorHeatmap
              sectors={sectorHeatmap}
              loading={loadingHeatmap}
              market={isTaiwanStock(symbol) ? 'TW' : 'US'}
              onStockClick={handleSymbolSelect}
            />
          </div>

          <div className="col-span-12 lg:col-span-3 space-y-4">
            <Watchlist currentSymbol={symbol} onStockClick={handleSymbolSelect} />
            <TopMovers onStockClick={handleSymbolSelect} market={isTaiwanStock(symbol) ? 'TW' : 'US'} />
            <NewsPanel news={news} loading={loadingNews} />
            <RelatedStocks
              stocks={relatedStocks}
              sectorName={sectorName}
              loading={loadingRelated}
              onStockClick={handleSymbolSelect}
            />
          </div>
        </div>
      </main>

      <footer className="border-t mt-8 py-4">
        <div className="max-w-[1600px] mx-auto px-4 text-center text-xs text-gray-400">
          幫哥換車小工具 | 資料來源: Yahoo Finance, TWSE | 僅供參考，不構成投資建議
        </div>
      </footer>
    </div>
  )
}
