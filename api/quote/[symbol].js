import { YAHOO_BASE, fetchJSON } from '../_lib/yahoo.js';

export default async function handler(req, res) {
  try {
    const { symbol } = req.query;
    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`;
    const data = await fetchJSON(url);
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No data');
    const timestamps = data.chart.result[0].timestamp || [];
    const quote = data.chart.result[0].indicators?.quote?.[0] || {};
    const lastIdx = timestamps.length - 1;
    const price = meta.regularMarketPrice ?? 0;
    let prevClose = 0;
    if (lastIdx >= 1 && quote.close) {
      for (let i = lastIdx - 1; i >= 0; i--) {
        if (quote.close[i] != null && quote.close[i] > 0) { prevClose = quote.close[i]; break; }
      }
    }
    if (!prevClose) prevClose = meta.chartPreviousClose ?? 0;
    const change = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;
    res.json({
      symbol: meta.symbol || symbol, shortName: meta.shortName || meta.longName || symbol, longName: meta.longName,
      regularMarketPrice: price, regularMarketChange: change, regularMarketChangePercent: changePct,
      regularMarketVolume: meta.regularMarketVolume ?? (lastIdx >= 0 ? quote.volume?.[lastIdx] : 0),
      regularMarketDayHigh: meta.regularMarketDayHigh ?? (lastIdx >= 0 ? quote.high?.[lastIdx] : 0),
      regularMarketDayLow: meta.regularMarketDayLow ?? (lastIdx >= 0 ? quote.low?.[lastIdx] : 0),
      regularMarketOpen: lastIdx >= 0 ? quote.open?.[lastIdx] : 0,
      regularMarketPreviousClose: prevClose,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0, fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
      currency: meta.currency || 'TWD', exchange: meta.exchangeName || '',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
