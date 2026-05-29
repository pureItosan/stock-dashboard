import axios from 'axios'
import type { OHLCV, StockQuote, NewsItem, Timeframe, RangeOption } from '../types'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

export async function searchStocks(query: string) {
  if (!query.trim()) return []
  const { data } = await api.get('/search', { params: { q: query } })
  const results = (data.quotes || []).filter(
    (q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF'
  ).map((q: any) => ({
    symbol: q.symbol as string,
    name: (q.shortname || q.longname || q.symbol) as string,
    exchange: (q.exchDisp || q.exchange) as string,
    type: q.quoteType as string,
  }))
  results.sort((a: any, b: any) => {
    const aTW = a.symbol.endsWith('.TW') || a.symbol.endsWith('.TWO') ? 0 : 1
    const bTW = b.symbol.endsWith('.TW') || b.symbol.endsWith('.TWO') ? 0 : 1
    return aTW - bTW
  })
  return results
}

export async function getChartData(
  symbol: string,
  interval: Timeframe = '1d',
  range: RangeOption = '1y'
): Promise<OHLCV[]> {
  const { data } = await api.get(`/chart/${symbol}`, { params: { interval, range } })
  const result = data.chart?.result?.[0]
  if (!result) return []

  const timestamps = result.timestamp || []
  const quote = result.indicators?.quote?.[0] || {}

  return timestamps.map((ts: number, i: number) => {
    const date = new Date(ts * 1000)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return {
      time: `${yyyy}-${mm}-${dd}`,
      open: quote.open?.[i] ?? 0,
      high: quote.high?.[i] ?? 0,
      low: quote.low?.[i] ?? 0,
      close: quote.close?.[i] ?? 0,
      volume: quote.volume?.[i] ?? 0,
    }
  }).filter((d: OHLCV) => d.open > 0 && d.close > 0)
}

export async function getQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const { data } = await api.get(`/quote/${symbol}`)
    if (data.error) return null
    return {
      symbol: data.symbol || symbol,
      shortName: data.shortName || symbol,
      longName: data.longName,
      regularMarketPrice: data.regularMarketPrice ?? 0,
      regularMarketChange: data.regularMarketChange ?? 0,
      regularMarketChangePercent: data.regularMarketChangePercent ?? 0,
      regularMarketVolume: data.regularMarketVolume ?? 0,
      regularMarketDayHigh: data.regularMarketDayHigh ?? 0,
      regularMarketDayLow: data.regularMarketDayLow ?? 0,
      regularMarketOpen: data.regularMarketOpen ?? 0,
      regularMarketPreviousClose: data.regularMarketPreviousClose ?? 0,
      fiftyTwoWeekHigh: data.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: data.fiftyTwoWeekLow ?? 0,
      marketCap: data.marketCap ?? 0,
      trailingPE: data.trailingPE,
      dividendYield: data.dividendYield,
      currency: data.currency || 'TWD',
      exchange: data.exchange || '',
    }
  } catch {
    return null
  }
}

export async function getMultipleQuotes(symbols: string[]) {
  if (symbols.length === 0) return []
  const { data } = await api.get('/quotes', {
    params: { symbols: symbols.join(',') },
  })
  if (!Array.isArray(data)) return []
  return data
}

export async function getNews(symbol: string): Promise<NewsItem[]> {
  try {
    const { data } = await api.get(`/news/${symbol}`)
    return data.items || []
  } catch {
    return []
  }
}

export const TW_SECTORS: Record<string, { name: string; stocks: string[] }> = {
  semiconductor: {
    name: '半導體',
    stocks: ['2330.TW', '2303.TW', '2454.TW', '3711.TW', '2379.TW', '6415.TW', '3034.TW', '2408.TW'],
  },
  electronics: {
    name: '電子代工',
    stocks: ['2317.TW', '2382.TW', '2356.TW', '4938.TW', '3231.TW', '2353.TW'],
  },
  components: {
    name: '電子零組件',
    stocks: ['2308.TW', '2327.TW', '3008.TW', '2345.TW', '2049.TW', '6669.TW'],
  },
  finance: {
    name: '金融',
    stocks: ['2881.TW', '2882.TW', '2884.TW', '2886.TW', '2891.TW', '2887.TW', '2880.TW', '2890.TW'],
  },
  traditional: {
    name: '傳產/塑化',
    stocks: ['1301.TW', '1303.TW', '1326.TW', '6505.TW', '1101.TW', '1102.TW'],
  },
  telecom: {
    name: '電信/通路',
    stocks: ['2412.TW', '3045.TW', '4904.TW', '2912.TW', '1216.TW'],
  },
  shipping: {
    name: '航運',
    stocks: ['2603.TW', '2609.TW', '2615.TW', '2618.TW', '2610.TW'],
  },
  biotech: {
    name: '生技醫療',
    stocks: ['6446.TW', '4743.TW', '1760.TW', '6472.TW', '4142.TW'],
  },
}

export const US_SECTORS: Record<string, { name: string; stocks: string[] }> = {
  tech: {
    name: 'Technology',
    stocks: ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'AMD', 'INTC', 'CRM', 'ADBE', 'ORCL'],
  },
  consumer: {
    name: 'Consumer',
    stocks: ['AMZN', 'TSLA', 'HD', 'NKE', 'MCD', 'SBUX', 'COST', 'WMT'],
  },
  finance: {
    name: 'Finance',
    stocks: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP'],
  },
  healthcare: {
    name: 'Healthcare',
    stocks: ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'LLY', 'TMO'],
  },
  energy: {
    name: 'Energy',
    stocks: ['XOM', 'CVX', 'COP', 'SLB', 'EOG'],
  },
  communication: {
    name: 'Communication',
    stocks: ['NFLX', 'DIS', 'CMCSA', 'T', 'VZ'],
  },
}
