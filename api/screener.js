import { YAHOO_BASE, yahooHeaders } from './_lib/yahoo.js';

const TW_STOCKS = {
  '2330.TW':'台積電','2303.TW':'聯電','2454.TW':'聯發科','3711.TW':'日月光投控','2379.TW':'瑞昱','6415.TW':'矽力-KY','3034.TW':'聯詠','2408.TW':'南亞科',
  '2317.TW':'鴻海','2382.TW':'廣達','2356.TW':'英業達','4938.TW':'和碩','3231.TW':'緯創','2353.TW':'宏碁',
  '2308.TW':'台達電','2327.TW':'國巨','3008.TW':'大立光','2345.TW':'智邦','2049.TW':'上銀','6669.TW':'緯穎',
  '2881.TW':'富邦金','2882.TW':'國泰金','2884.TW':'玉山金','2886.TW':'兆豐金','2891.TW':'中信金','2887.TW':'台新金','2880.TW':'華南金','2890.TW':'永豐金',
  '1301.TW':'台塑','1303.TW':'南亞','1326.TW':'台化','6505.TW':'台塑化','1101.TW':'台泥','1102.TW':'亞泥',
  '2412.TW':'中華電','3045.TW':'台灣大','4904.TW':'遠傳','2912.TW':'統一超','1216.TW':'統一',
  '2603.TW':'長榮','2609.TW':'陽明','2615.TW':'萬海','2618.TW':'長榮航','2610.TW':'華航',
  '6446.TW':'藥華藥','4743.TW':'合一','1760.TW':'寶齡富錦','6472.TW':'保瑞','4142.TW':'國光生',
};
const US_STOCKS = {
  'AAPL':'Apple','MSFT':'Microsoft','GOOGL':'Alphabet','META':'Meta','NVDA':'NVIDIA','AMD':'AMD','INTC':'Intel','CRM':'Salesforce','ADBE':'Adobe','ORCL':'Oracle',
  'AMZN':'Amazon','TSLA':'Tesla','HD':'Home Depot','NKE':'Nike','MCD':'McDonald\'s','SBUX':'Starbucks','COST':'Costco','WMT':'Walmart',
  'JPM':'JPMorgan','BAC':'BofA','WFC':'Wells Fargo','GS':'Goldman','MS':'Morgan Stanley','V':'Visa','MA':'Mastercard','AXP':'AmEx',
  'JNJ':'J&J','PFE':'Pfizer','UNH':'UnitedHealth','ABBV':'AbbVie','MRK':'Merck','LLY':'Eli Lilly','TMO':'Thermo Fisher',
  'XOM':'ExxonMobil','CVX':'Chevron','COP':'ConocoPhillips','SLB':'Schlumberger','EOG':'EOG Resources',
  'NFLX':'Netflix','DIS':'Disney','CMCSA':'Comcast','T':'AT&T','VZ':'Verizon',
};

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

async function fetchInstitutional() {
  try {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    const url = `https://www.twse.com.tw/rwd/zh/fund/T86?date=${dateStr}&selectType=ALL&response=json`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) return {};
    const data = await resp.json();
    if (!data.data) return {};
    const map = {};
    for (const row of data.data) {
      const code = row[0]?.trim();
      if (!code) continue;
      const parse = (s) => parseInt(s?.replace(/,/g, ''), 10) || 0;
      const foreignNet = parse(row[4]);
      const trustNet = parse(row[7]);
      const dealerNet = parse(row[10]) + parse(row[13]);
      map[code] = { foreignNet, trustNet, dealerNet, totalNet: foreignNet + trustNet + dealerNet };
    }
    return map;
  } catch { return {}; }
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

function calcRSI(data, period = 14) {
  const result = [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period && i < data.length; i++) {
    const change = data[i].close - data[i-1].close;
    if (change > 0) avgGain += change; else avgLoss -= change;
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period; i < data.length; i++) {
    if (i > period) {
      const change = data[i].close - data[i-1].close;
      avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (change < 0 ? -change : 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ idx: i, value: 100 - 100 / (1 + rs) });
  }
  return result;
}

function calcMA(data, period) {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    result.push({ idx: i, value: sum / period });
  }
  return result;
}

function calcOBV(data) {
  const result = [data[0]?.volume || 0];
  for (let i = 1; i < data.length; i++) {
    const prev = result[i-1];
    if (data[i].close > data[i-1].close) result.push(prev + data[i].volume);
    else if (data[i].close < data[i-1].close) result.push(prev - data[i].volume);
    else result.push(prev);
  }
  return result;
}

function calcBollinger(data, period = 20, mult = 2) {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    const mean = sum / period;
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) sq += (data[j].close - mean) ** 2;
    const std = Math.sqrt(sq / period);
    result.push({ idx: i, upper: mean + mult * std, middle: mean, lower: mean - mult * std });
  }
  return result;
}

function scoreStock(bars, weeklyBars, meta, cnName, institutional) {
  if (bars.length < 60) return null;
  const symbol = meta?.symbol || '';
  const price = meta?.regularMarketPrice ?? bars[bars.length-1].close;

  const kd = calcKD(bars);
  const macd = calcMACD(bars);
  const td = calcTD(bars);
  const rsi = calcRSI(bars);
  const ma5 = calcMA(bars, 5);
  const ma10 = calcMA(bars, 10);
  const ma20 = calcMA(bars, 20);
  const ma60 = calcMA(bars, 60);
  const obv = calcOBV(bars);
  const bb = calcBollinger(bars);

  const last = bars.length - 1;
  const lastBar = bars[last];
  const prevBar = bars[last - 1];
  const lastKD = kd[last];
  const prevKD = kd[last - 1];
  const lastMACD = macd[last];
  const prevMACD = macd[last - 1];
  const lastTD = td[last];
  const lastRSI = rsi[rsi.length - 1]?.value ?? 50;
  const prevRSI = rsi[rsi.length - 2]?.value ?? 50;
  const lastMA5 = ma5[ma5.length - 1]?.value ?? 0;
  const lastMA10 = ma10[ma10.length - 1]?.value ?? 0;
  const lastMA20 = ma20[ma20.length - 1]?.value ?? 0;
  const lastMA60 = ma60[ma60.length - 1]?.value ?? 0;
  const lastBB = bb[bb.length - 1];

  let score = 0;
  const reasons = [];
  const conditions = new Set(); // Track distinct condition categories met

  // === CATEGORY 1: TD Sequential 九轉序列 ===
  if (lastTD.buy >= 7) {
    score += lastTD.buy === 9 ? 30 : lastTD.buy === 8 ? 25 : 18;
    reasons.push(`TD買${lastTD.buy}`);
    conditions.add('TD');
  }

  // === CATEGORY 2: KD 低檔 ===
  let kdMet = false;
  if (lastKD.k < 25 && lastKD.d < 25) { score += 25; reasons.push(`KD低檔(${lastKD.k.toFixed(0)}/${lastKD.d.toFixed(0)})`); kdMet = true; }
  else if (lastKD.k < 35 && lastKD.d < 35) { score += 15; reasons.push(`KD偏低(${lastKD.k.toFixed(0)}/${lastKD.d.toFixed(0)})`); kdMet = true; }
  if (lastKD.k > lastKD.d && prevKD.k <= prevKD.d && lastKD.k < 50) {
    score += 15; reasons.push('KD黃金交叉'); kdMet = true;
  }
  if (kdMet) conditions.add('KD');

  // === CATEGORY 3: MACD ===
  let macdMet = false;
  if (lastMACD.hist < 0 && prevMACD.hist < 0 && lastMACD.hist > prevMACD.hist) {
    const conv = Math.abs(lastMACD.hist) < Math.abs(prevMACD.hist) * 0.7;
    if (conv) { score += 20; reasons.push('MACD強收斂'); } else { score += 12; reasons.push('MACD收斂'); }
    macdMet = true;
  }
  if (lastMACD.dif > lastMACD.dea && prevMACD.dif <= prevMACD.dea) {
    score += 18; reasons.push('MACD金叉'); macdMet = true;
  }
  if (macdMet) conditions.add('MACD');

  // === CATEGORY 4: 量能 ===
  const recent3 = bars.slice(-3);
  const prev10 = bars.slice(-13, -3);
  const avgRecent = recent3.reduce((s, d) => s + d.volume, 0) / 3;
  const avgPrev = prev10.length > 0 ? prev10.reduce((s, d) => s + d.volume, 0) / prev10.length : 1;
  const volRatio = avgPrev > 0 ? avgRecent / avgPrev : 1;
  let volMet = false;
  if (volRatio > 1.5) { score += 20; reasons.push(`放量${volRatio.toFixed(1)}x`); volMet = true; }
  else if (volRatio > 1.2) { score += 10; reasons.push(`量增${volRatio.toFixed(1)}x`); volMet = true; }
  if (volMet) conditions.add('Volume');

  // === CATEGORY 5: 主力買超 (TW only) ===
  if (institutional) {
    const code = symbol.replace('.TW', '').replace('.TWO', '');
    const inst = institutional[code];
    if (inst && inst.totalNet > 0) {
      const net = inst.totalNet;
      if (net > 5000) { score += 20; reasons.push(`主力買超${(net/1000).toFixed(0)}張`); }
      else if (net > 1000) { score += 12; reasons.push(`主力小買${(net/1000).toFixed(0)}張`); }
      else { score += 5; reasons.push('主力微買'); }
      conditions.add('Institutional');
    }
  }

  // === CATEGORY 6: 均線多頭排列 / 跌深反彈 ===
  let maMet = false;
  // Bullish alignment: MA5 > MA10 > MA20 and price above MA5
  if (price > lastMA5 && lastMA5 > lastMA10 && lastMA10 > lastMA20) {
    score += 15; reasons.push('均線多頭排列'); maMet = true;
  }
  // Golden cross: MA5 just crossed above MA20
  else if (lastMA5 > lastMA20 && ma5[ma5.length - 2]?.value <= ma20[ma20.length - 2]?.value) {
    score += 18; reasons.push('均線黃金交叉'); maMet = true;
  }
  // Price bouncing off long-term MA (support test)
  else if (price > lastMA60 && price < lastMA60 * 1.03 && prevBar.close < lastMA60) {
    score += 12; reasons.push('季線支撐反彈'); maMet = true;
  }
  if (maMet) conditions.add('MA');

  // === CATEGORY 7: RSI 反轉 (券商常用) ===
  let rsiMet = false;
  if (lastRSI < 30 && lastRSI > prevRSI) {
    score += 15; reasons.push(`RSI超賣回升(${lastRSI.toFixed(0)})`); rsiMet = true;
  } else if (lastRSI < 40 && lastRSI > prevRSI && prevRSI < 35) {
    score += 10; reasons.push(`RSI低檔轉強(${lastRSI.toFixed(0)})`); rsiMet = true;
  }
  if (rsiMet) conditions.add('RSI');

  // === CATEGORY 8: 布林通道下軌反彈 ===
  if (lastBB) {
    if (price <= lastBB.lower * 1.01 && lastBar.close > prevBar.close) {
      score += 12; reasons.push('觸下軌反彈'); conditions.add('Bollinger');
    } else if (price < lastBB.middle && lastBar.close > prevBar.close && prevBar.close > bars[last-2]?.close) {
      score += 8; reasons.push('下軌附近企穩'); conditions.add('Bollinger');
    }
  }

  // === CATEGORY 9: 量價背離 / OBV 強勢 (券商實戰) ===
  // Price down but OBV up (accumulation 主力吸籌)
  const obvRecent = obv[obv.length - 1];
  const obv10ago = obv[obv.length - 11];
  const price10ago = bars[bars.length - 11]?.close ?? price;
  if (obvRecent > obv10ago && price < price10ago) {
    score += 15; reasons.push('量價底背離(吸籌)'); conditions.add('OBV');
  }

  // === CATEGORY 10: 跌深 (近期相對低點) ===
  const low20 = Math.min(...bars.slice(-20).map(d => d.low));
  const high20 = Math.max(...bars.slice(-20).map(d => d.high));
  const range20 = high20 - low20;
  if (range20 > 0) {
    const position = (price - low20) / range20;
    if (position < 0.25) { score += 10; reasons.push('近20日低點'); conditions.add('Value'); }
    else if (position < 0.4) { score += 5; reasons.push('近期偏低區'); conditions.add('Value'); }
  }

  // === CATEGORY 11: 週線同步 (大週期共振 - 高手必看) ===
  if (weeklyBars && weeklyBars.length >= 20) {
    const wKD = calcKD(weeklyBars);
    const wMACD = calcMACD(weeklyBars);
    const wTD = calcTD(weeklyBars);
    const lastWKD = wKD[wKD.length - 1];
    const lastWMACD = wMACD[wMACD.length - 1];
    const prevWMACD = wMACD[wMACD.length - 2];
    const lastWTD = wTD[wTD.length - 1];

    let weeklyMet = false;
    if (lastWKD.k < 30 && lastWKD.d < 30) {
      score += 18; reasons.push('週KD低檔'); weeklyMet = true;
    }
    if (lastWMACD.dif > lastWMACD.dea && prevWMACD.dif <= prevWMACD.dea) {
      score += 20; reasons.push('週MACD金叉'); weeklyMet = true;
    }
    if (lastWTD.buy >= 7) {
      score += 22; reasons.push(`週TD買${lastWTD.buy}`); weeklyMet = true;
    }
    if (weeklyMet) conditions.add('Weekly');
  }

  // === CATEGORY 12: K 線型態 (連續紅K / 長下影線 / 吞噬) ===
  let patternMet = false;
  // Bullish engulfing: today's red candle engulfs yesterday's black candle
  if (prevBar.close < prevBar.open && lastBar.close > lastBar.open &&
      lastBar.open <= prevBar.close && lastBar.close >= prevBar.open) {
    score += 15; reasons.push('多頭吞噬'); patternMet = true;
  }
  // Hammer: long lower shadow, small body
  const body = Math.abs(lastBar.close - lastBar.open);
  const lowerShadow = Math.min(lastBar.open, lastBar.close) - lastBar.low;
  if (body > 0 && lowerShadow >= body * 2 && lastBar.close > lastBar.open) {
    score += 12; reasons.push('鎚子線'); patternMet = true;
  }
  // Three consecutive bullish bars
  if (bars[last-2] && lastBar.close > lastBar.open && prevBar.close > prevBar.open &&
      bars[last-2].close > bars[last-2].open && lastBar.close > prevBar.close && prevBar.close > bars[last-2].close) {
    score += 12; reasons.push('連三紅K'); patternMet = true;
  }
  if (patternMet) conditions.add('Pattern');

  // === 至少要符合 3 個條件類別才推薦 ===
  if (conditions.size < 3) return null;
  if (score < 30) return null;

  return {
    symbol, cnName, name: meta?.shortName || meta?.longName || '', price, score, reasons,
    conditionCount: conditions.size,
    kd: lastKD, td: lastTD, macdHist: lastMACD.hist,
    volRatio: Math.round(volRatio * 100) / 100,
  };
}

let cachedResult = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

export default async function handler(req, res) {
  try {
    const page = parseInt(req.query.page) || 0;

    if (cachedResult && Date.now() - cacheTime < CACHE_TTL) {
      const tw = cachedResult.twAll.slice(page * 5, page * 5 + 5);
      const us = cachedResult.usAll.slice(page * 5, page * 5 + 5);
      return res.json({
        tw, us, scannedAt: cachedResult.scannedAt,
        totalScanned: cachedResult.totalScanned,
        qualifiedTW: cachedResult.twAll.length,
        qualifiedUS: cachedResult.usAll.length,
        hasMore: cachedResult.twAll.length > (page + 1) * 5 || cachedResult.usAll.length > (page + 1) * 5,
      });
    }

    const institutional = await fetchInstitutional();
    const twSymbols = Object.keys(TW_STOCKS);
    const usSymbols = Object.keys(US_STOCKS);
    const allStocks = [...twSymbols, ...usSymbols];
    const nameMap = { ...TW_STOCKS, ...US_STOCKS };

    const batchSize = 12;
    const scored = [];

    for (let i = 0; i < allStocks.length; i += batchSize) {
      const batch = allStocks.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (sym) => {
          const [chart, weekly] = await Promise.all([
            fetchChart(sym, '1d', '6mo'),
            fetchChart(sym, '1wk', '2y'),
          ]);
          if (!chart || chart.bars.length < 60) return null;
          return scoreStock(chart.bars, weekly?.bars, chart.meta, nameMap[sym] || '', institutional);
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) scored.push(r.value);
      }
    }

    const twAll = scored.filter(s => s.symbol.endsWith('.TW') || s.symbol.endsWith('.TWO'))
      .sort((a, b) => b.score - a.score);
    const usAll = scored.filter(s => !s.symbol.endsWith('.TW') && !s.symbol.endsWith('.TWO'))
      .sort((a, b) => b.score - a.score);

    cachedResult = { twAll, usAll, scannedAt: new Date().toISOString(), totalScanned: allStocks.length };
    cacheTime = Date.now();

    const tw = twAll.slice(0, 5);
    const us = usAll.slice(0, 5);
    res.json({
      tw, us, scannedAt: cachedResult.scannedAt, totalScanned: allStocks.length,
      qualifiedTW: twAll.length, qualifiedUS: usAll.length,
      hasMore: twAll.length > 5 || usAll.length > 5,
    });
  } catch (e) {
    res.status(500).json({ error: e.message, tw: [], us: [] });
  }
}
