import { YAHOO_BASE, yahooHeaders, fetchJSON } from '../_lib/yahoo.js';

export default async function handler(req, res) {
  try {
    const { symbol } = req.query;
    const chartUrl = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=3y&includePrePost=false`;
    const chartData = await fetchJSON(chartUrl);
    const chartResult = chartData.chart?.result?.[0];
    if (!chartResult) throw new Error('No chart data');

    const timestamps = chartResult.timestamp || [];
    const closes = chartResult.indicators?.quote?.[0]?.close || [];
    const currentPrice = chartResult.meta?.regularMarketPrice ?? 0;

    const priceData = timestamps.map((ts, i) => ({
      time: new Date(ts * 1000).toISOString().slice(0, 10), ts, price: closes[i] ?? 0,
    })).filter(d => d.price > 0);

    const now = Math.floor(Date.now() / 1000);
    const threeYearsAgo = now - 3 * 365 * 86400;
    const peUrl = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=trailingPeRatio&period1=${threeYearsAgo}&period2=${now}`;

    let pePoints = [];
    try {
      const peResp = await fetch(peUrl, { headers: yahooHeaders });
      if (peResp.ok) {
        const peData = await peResp.json();
        const peResult = peData.timeseries?.result?.[0];
        if (peResult?.trailingPeRatio) {
          pePoints = peResult.trailingPeRatio.map(p => ({ date: p.asOfDate, pe: p.reportedValue?.raw ?? 0 })).filter(p => p.pe > 0);
        }
      }
    } catch {}

    const epsPoints = [];
    for (const pp of pePoints) {
      const ppTs = new Date(pp.date).getTime() / 1000;
      let closest = priceData[0];
      let minDiff = Infinity;
      for (const pd of priceData) { const diff = Math.abs(pd.ts - ppTs); if (diff < minDiff) { minDiff = diff; closest = pd; } }
      if (closest && pp.pe > 0) epsPoints.push({ date: pp.date, eps: closest.price / pp.pe, pe: pp.pe });
    }
    if (epsPoints.length === 0 && currentPrice > 0) epsPoints.push({ date: priceData[priceData.length - 1]?.time, eps: currentPrice / 20, pe: 20 });

    const result = priceData.map(pd => {
      let eps = epsPoints[0]?.eps ?? 1;
      const pdTs = new Date(pd.time).getTime();
      for (let i = 0; i < epsPoints.length; i++) {
        const epTs = new Date(epsPoints[i].date).getTime();
        if (i === epsPoints.length - 1 || pdTs <= epTs) { eps = epsPoints[i].eps; break; }
        const nextTs = new Date(epsPoints[i + 1].date).getTime();
        if (pdTs >= epTs && pdTs <= nextTs) { eps = epsPoints[i].eps + (epsPoints[i + 1].eps - epsPoints[i].eps) * ((pdTs - epTs) / (nextTs - epTs)); break; }
      }
      return { time: pd.time, price: pd.price, pe10: eps*10, pe15: eps*15, pe20: eps*20, pe25: eps*25, pe30: eps*30, pe35: eps*35, currentPE: pd.price/eps, eps };
    });

    const latestPE = currentPrice > 0 && epsPoints.length > 0 ? currentPrice / epsPoints[epsPoints.length - 1].eps : 0;
    res.json({ data: result, currentPE: latestPE, epsPoints });
  } catch (e) { res.status(500).json({ error: e.message, data: [], currentPE: 0 }); }
}
