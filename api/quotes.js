import { YAHOO_BASE, yahooHeaders } from './_lib/yahoo.js';

export default async function handler(req, res) {
  try {
    const { symbols } = req.query;
    if (!symbols) return res.json([]);
    const symList = symbols.split(',').slice(0, 50);
    const results = await Promise.allSettled(
      symList.map(async (sym) => {
        const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d&includePrePost=false`;
        const resp = await fetch(url, { headers: yahooHeaders });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const meta = data.chart?.result?.[0]?.meta;
        if (!meta) throw new Error('No data');
        const timestamps = data.chart.result[0].timestamp || [];
        const closes = data.chart.result[0].indicators?.quote?.[0]?.close || [];
        const price = meta.regularMarketPrice ?? 0;
        let prevClose = 0;
        const li = timestamps.length - 1;
        if (li >= 1) { for (let i = li - 1; i >= 0; i--) { if (closes[i] != null && closes[i] > 0) { prevClose = closes[i]; break; } } }
        if (!prevClose) prevClose = meta.chartPreviousClose ?? 0;
        return { symbol: meta.symbol || sym, name: meta.shortName || meta.longName || sym, price, change: price - prevClose, changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0, volume: meta.regularMarketVolume ?? 0, marketCap: 0 };
      })
    );
    res.json(results.filter(r => r.status === 'fulfilled').map(r => r.value));
  } catch (e) { res.status(500).json({ error: e.message }); }
}
