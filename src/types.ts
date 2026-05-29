export interface OHLCV {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface StockQuote {
  symbol: string
  shortName: string
  longName?: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketVolume: number
  regularMarketDayHigh: number
  regularMarketDayLow: number
  regularMarketOpen: number
  regularMarketPreviousClose: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  marketCap: number
  trailingPE?: number
  dividendYield?: number
  currency: string
  exchange: string
}

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
}

export interface KDData {
  time: string
  k: number
  d: number
  rsv: number
}

export interface MACDData {
  time: string
  dif: number
  dea: number
  histogram: number
}

export interface TDCount {
  time: string
  buyCount: number
  sellCount: number
}

export interface SectorStock {
  symbol: string
  name: string
  change: number
  changePercent: number
  price: number
  volume: number
  marketCap: number
}

export interface SectorGroup {
  name: string
  stocks: SectorStock[]
  avgChange: number
}

export type Timeframe = '1d' | '1wk' | '1mo'
export type RangeOption = '3mo' | '6mo' | '1y' | '2y' | '5y'

export interface ChipData {
  foreignBuy: number
  foreignSell: number
  foreignNet: number
  trustBuy: number
  trustSell: number
  trustNet: number
  dealerBuy: number
  dealerSell: number
  dealerNet: number
}
