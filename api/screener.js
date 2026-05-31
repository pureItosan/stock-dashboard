import { YAHOO_BASE, yahooHeaders } from './_lib/yahoo.js';

// All stocks to scan
const TW_STOCKS = [
  '2330.TW','2303.TW','2454.TW','3711.TW','2379.TW','6415.TW','3034.TW','2408.TW',
  '2317.TW','2382.TW','2356.TW','4938.TW','3231.TW','2353.TW',
  '2308.TW','2327.TW','3008.TW','2345.TW','2049.TW','6669.TW',
  '2881.TW','2882.TW','2884.TW','2886.TW','2891.TW','2887.TW','2880.TW','2890.TW',
  '1301.TW','1303.TW','1326.TW','6505.TW','1101.TW','1102.TW',
  '2412.TW','3045.TW','4904.TW','2912.TW','1216.TW',
  '2603.TW','2609.TW','2615.TW','2618.TW','2610.TW',
  '6446.TW','4743.TW','1760.TW','6472.TW','4142.TW',
];
const US_STOCKS = [
  'AAPL','MSFT','GOOGL','META','NVDA','AMD','INTC','CRM','ADBE','ORCL',
  'AMZN','TSLA','HD','NKE','MCD','SBUX','COST','WMT',
  'JPM','BAC','WFC','GS','MS','V','MA','AXP',
  'JNJ','PFE','UNH','ABBV','MRK','LLY','TMO',
  'XOM','CVX','COP','SLB','EOG',
  'NFLX','DIS','CMCSA','T','VZ',
];

async function fetchChart(symbol, interval, range) {
  const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  const resp = await fetch(url, { headers: yahooHeaders });
  if (!resp.ok) return null;
  const data = await resp.json();
  const result = data.chart?.result?.[0];
  if (!result) return null;
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const bars = ts.map((t, i) => ({
    time: new Date(t * 1000).toISOString().slice(0, 10),
    open: q.open?.[i] ?? 0, high: q.high?.[i] ?? 0,
    low: q.low?.[i] ?? 0, close: q.close?.[i] ?? 0,
    volume: q.volume?.[i] ?? 0,
  })).filter(d => d.open > 0 && d.close > 0);
  return { bars, meta: result.meta };
}

function calcKD(data, period = 9) {
  let prevK = 50, prevD = 50;
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push({ k: 50, d: 50 }); continue; }
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) { if (data[j].high > hh) hh = data[j].high; if (data[j].low < ll) ll = data[j].low; }
    const range = hh - ll;
    const rsv = range === 0 ? 50 : ((data[i].close - ll) / range) * 100;
    const k = (2/3) * prevK + (1/3) * rsv;
    const d = (2/3) * prevD + (1/3) * k;
    prevK = k; prevD = d;
    result.push({ k, d });
  }
  return result;
}

function calcMACD(data) {
  const closes = data.map(d => d.close);
  const ema = (vals, p) => {
    const r = []; const m = 2/(p+1); let sum = 0;
    for (let i = 0; i < p && i < vals.length; i++) sum += vals[i];
    r.length = p - 1; r.fill(0); r.push(sum / p);
    for (let i = p; i < vals.length; i++) r.push((vals[i] - r[i-1]) * m + r[i-1]);
    return r;
  };
  const e12 = ema(closes, 12), e26 = ema(closes, 26);
  const dif = closes.map((_, i) => i < 25 ? 0 : e12[i] - e26[i]);
  const difSlice = dif.slice(25);
  const signal = ema(difSlice, 9);
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const si = i - 25;
    if (si < 8 || si < 0) { result.push({ dif: dif[i], dea: 0, hist: 0 }); }
    else { const dea = signal[si]; result.push({ dif: dif[i], dea, hist: (dif[i] - dea) * 2 }); }
  }
  return result;
}

function calcTD(data) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < 4) { result.push({ buy: 0, sell: 0 }); continue; }
    const prev = result[i-1];
    let buy = 0, sell = 0;
    if (data[i].close < data[i-4].close) { buy = prev.buy > 0 ? prev.buy + 1 : 1; if (buy > 9) buy = 1; }
    else if (data[i].close > data[i-4].close) { sell = prev.sell > 0 ? prev.sell + 1 : 1; if (sell > 9) sell = 1; }
    result.push({ buy, sell });
  }
  return result;
}

function scoreStock(bars, meta) {
  if (bars.length < 60) return null;
  const name = meta?.shortName || meta?.longName || meta?.symbol || '';
  const price = meta?.regularMarketPrice ?? bars[bars.length-1].close;
  const symbol = meta?.symbol || '';

  const kd = calcKD(bars);
  const macd = calcMACD(bars);
  const td = calcTD(bars);

  const last = bars.length - 1;
  const lastKD = kd[last];
  const lastMACD = macd[last];
  const prevMACD = macd[last - 1];
  const lastTD = td[last];

  let score = 0;
  const reasons = [];

  // 1. TD Sequential approaching 9 (buy setup = close < close 4 bars ago)
  if (lastTD.buy >= 7) {
    score += lastTD.buy === 9 ? 30 : lastTD.buy === 8 ? 25 : 18;
    reasons.push(`TD買${lastTD.buy}`);
  }

  // 2. KD low (oversold zone)
  if (lastKD.k < 25 && lastKD.d < 25) { score += 25; reasons.push(`KD低檔(${lastKD.k.toFixed(0)}/${lastKD.d.toFixed(0)})`); }
  else if (lastKD.k < 35 && lastKD.d < 35) { score += 15; reasons.push(`KD偏低(${lastKD.k.toFixed(0)}/${lastKD.d.toFixed(0)})`); }
  else if (lastKD.k < 50) { score += 5; reasons.push(`KD中低(${lastKD.k.toFixed(0)})`); }

  // 3. MACD converging (histogram shrinking, approaching zero crossing)
  if (lastMACD.hist < 0 && prevMACD.hist < 0 && lastMACD.hist > prevMACD.hist) {
    const convergence = Math.abs(lastMACD.hist) < Math.abs(prevMACD.hist) * 0.7;
    if (convergence) { score += 20; reasons.push('MACD強收斂'); }
    else { score += 12; reasons.push('MACD收斂'); }
  }
  if (lastMACD.dif > lastMACD.dea && prevMACD.dif <= prevMACD.dea) {
    score += 15; reasons.push('MACD金叉');
  }

  // 4. Volume expanding (volume ratio)
  const recent3 = bars.slice(-3);
  const prev10 = bars.slice(-13, -3);
  const avgRecent = recent3.reduce((s, d) => s + d.volume, 0) / 3;
  const avgPrev = prev10.length > 0 ? prev10.reduce((s, d) => s + d.volume, 0) / prev10.length : 1;
  const volRatio = avgPrev > 0 ? avgRecent / avgPrev : 1;
  if (volRatio > 1.5) { score += 20; reasons.push(`放量${volRatio.toFixed(1)}x`); }
  else if (volRatio > 1.2) { score += 10; reasons.push(`量增${volRatio.toFixed(1)}x`); }

  // 5. Price near recent low (value territory)
  const low20 = Math.min(...bars.slice(-20).map(d => d.low));
  const high20 = Math.max(...bars.slice(-20).map(d => d.high));
  const range20 = high20 - low20;
  if (range20 > 0) {
    const position = (price - low20) / range20;
    if (position < 0.25) { score += 10; reasons.push('近20日低點'); }
  }

  if (score < 15) return null;

  return { symbol, name, price, score, reasons, kd: lastKD, td: lastTD, macdHist: lastMACD.hist, volRatio: Math.round(volRatio * 100) / 100 };
}

// Cache
let cachedResult = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export default async function handler(req, res) {
  try {
    // Return cache if fresh
    if (cachedResult && Date.now() - cacheTime < CACHE_TTL) {
      return res.json(cachedResult);
    }

    const allStocks = [...TW_STOCKS, ...US_STOCKS];

    // Fetch all in parallel (batched to avoid overwhelming)
    const batchSize = 15;
    const scored = [];

    for (let i = 0; i < allStocks.length; i += batchSize) {
      const batch = allStocks.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (sym) => {
          const chart = await fetchChart(sym, '1d', '6mo');
          if (!chart || chart.bars.length < 60) return null;
          return scoreStock(chart.bars, chart.meta);
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) scored.push(r.value);
      }
    }

    // Split by market and sort
    const tw = scored.filter(s => s.symbol.endsWith('.TW') || s.symbol.endsWith('.TWO'))
      .sort((a, b) => b.score - a.score).slice(0, 5);
    const us = scored.filter(s => !s.symbol.endsWith('.TW') && !s.symbol.endsWith('.TWO'))
      .sort((a, b) => b.score - a.score).slice(0, 5);

    const output = { tw, us, scannedAt: new Date().toISOString(), totalScanned: allStocks.length };

    cachedResult = output;
    cacheTime = Date.now();

    res.json(output);
  } catch (e) {
    res.status(500).json({ error: e.message, tw: [], us: [] });
  }
}
