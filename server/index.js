import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';

const app = express();
const cache = new NodeCache({ stdTTL: 300 });

app.use(cors());
app.use(express.json());

let twStockList = [];
let twStockListLoaded = false;

async function loadTWStockList() {
  if (twStockListLoaded && twStockList.length > 0) return;
  try {
    const [listedRes, otcRes] = await Promise.allSettled([
      fetch('https://openapi.twse.com.tw/v1/opendata/t187ap03_L', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }).then(r => r.json()),
      fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }).then(r => r.json()),
    ]);

    const stocks = [];
    if (listedRes.status === 'fulfilled' && Array.isArray(listedRes.value)) {
      for (const item of listedRes.value) {
        const code = item['公司代號'] || item['證券代號'];
        const name = item['公司簡稱'] || item['證券簡稱'] || '';
        if (code && /^\d{4,6}$/.test(code.trim())) {
          stocks.push({ symbol: code.trim() + '.TW', name: name.trim(), code: code.trim() });
        }
      }
    }
    if (otcRes.status === 'fulfilled' && Array.isArray(otcRes.value)) {
      for (const item of otcRes.value) {
        const code = item['SecuritiesCompanyCode'] || item['Code'] || item['公司代號'] || item['證券代號'];
        const name = item['CompanyName'] || item['Name'] || item['公司簡稱'] || item['證券簡稱'] || '';
        if (code && /^\d{4,6}$/.test(code.trim())) {
          const exists = stocks.some(s => s.code === code.trim());
          if (!exists) {
            stocks.push({ symbol: code.trim() + '.TWO', name: name.trim(), code: code.trim() });
          }
        }
      }
    }
    twStockList = stocks;
    twStockListLoaded = true;
    console.log(`Loaded ${stocks.length} TW stocks for local search`);
  } catch (e) {
    console.error('Failed to load TW stock list:', e.message);
  }
}

loadTWStockList();

function searchLocalTW(query) {
  if (twStockList.length === 0) return [];
  const q = query.trim().toLowerCase();
  return twStockList
    .filter(s => s.name.toLowerCase().includes(q) || s.code.includes(q))
    .slice(0, 10)
    .map(s => ({
      symbol: s.symbol,
      shortname: s.name,
      exchange: s.symbol.endsWith('.TWO') ? 'TPEx' : 'TWSE',
      exchDisp: s.symbol.endsWith('.TWO') ? '櫃買中心' : '臺灣證券交易所',
      quoteType: 'EQUITY',
    }));
}

const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const YAHOO_BASE2 = 'https://query2.finance.yahoo.com';

const yahooHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

async function cachedFetch(key, url, ttl = 300) {
  const cached = cache.get(key);
  if (cached) return cached;
  const res = await fetch(url, { headers: yahooHeaders });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cache.set(key, data, ttl);
  return data;
}

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ quotes: [] });

    const hasChinese = /[一-鿿]/.test(q);

    if (hasChinese) {
      await loadTWStockList();
      const localResults = searchLocalTW(q);
      if (localResults.length > 0) {
        return res.json({ quotes: localResults });
      }
    }

    const encoded = encodeURIComponent(q);
    const urls = [
      `${YAHOO_BASE2}/v1/finance/search?q=${encoded}&quotesCount=10&newsCount=0`,
      `${YAHOO_BASE2}/v1/finance/search?q=${encoded}&quotesCount=10&newsCount=0&lang=en`,
    ];

    let data = null;
    for (const url of urls) {
      try {
        data = await cachedFetch(`search:${q}`, url, 60);
        if (data?.quotes?.length) break;
      } catch { continue; }
    }

    if (!data || !data.quotes?.length) {
      if (hasChinese) {
        return res.json({ quotes: [] });
      }
      const isNumber = /^\d{4,6}$/.test(q.trim());
      if (isNumber) {
        const results = [];
        for (const suffix of ['.TW', '.TWO']) {
          try {
            const chartUrl = `${YAHOO_BASE}/v8/finance/chart/${q.trim()}${suffix}?interval=1d&range=1d`;
            const chartResp = await fetch(chartUrl, { headers: yahooHeaders });
            if (chartResp.ok) {
              const chartData = await chartResp.json();
              const meta = chartData.chart?.result?.[0]?.meta;
              if (meta) {
                results.push({
                  symbol: meta.symbol,
                  shortname: meta.shortName || meta.longName || meta.symbol,
                  exchange: meta.exchangeName,
                  exchDisp: meta.fullExchangeName || meta.exchangeName,
                  quoteType: 'EQUITY',
                });
              }
            }
          } catch {}
        }
        if (results.length > 0) {
          return res.json({ quotes: results });
        }
      }
      return res.json({ quotes: [] });
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/chart/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1d', range = '6mo' } = req.query;
    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
    const key = `chart:${symbol}:${interval}:${range}`;
    const data = await cachedFetch(key, url, interval === '1d' ? 120 : 600);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`;
    const data = await cachedFetch(`quotemeta:${symbol}`, url, 120);
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
      symbol: meta.symbol || symbol,
      shortName: meta.shortName || meta.longName || symbol,
      longName: meta.longName,
      regularMarketPrice: price,
      regularMarketChange: change,
      regularMarketChangePercent: changePct,
      regularMarketVolume: meta.regularMarketVolume ?? (lastIdx >= 0 ? quote.volume?.[lastIdx] : 0),
      regularMarketDayHigh: meta.regularMarketDayHigh ?? (lastIdx >= 0 ? quote.high?.[lastIdx] : 0),
      regularMarketDayLow: meta.regularMarketDayLow ?? (lastIdx >= 0 ? quote.low?.[lastIdx] : 0),
      regularMarketOpen: lastIdx >= 0 ? quote.open?.[lastIdx] : 0,
      regularMarketPreviousClose: prevClose,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
      currency: meta.currency || 'TWD',
      exchange: meta.exchangeName || '',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/quotes', async (req, res) => {
  try {
    const { symbols } = req.query;
    if (!symbols) return res.json([]);
    const symList = symbols.split(',').slice(0, 50);
    const results = await Promise.allSettled(
      symList.map(async (sym) => {
        const key = `quotemini:${sym}`;
        const cached = cache.get(key);
        if (cached) return cached;
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
        if (li >= 1) {
          for (let i = li - 1; i >= 0; i--) {
            if (closes[i] != null && closes[i] > 0) { prevClose = closes[i]; break; }
          }
        }
        if (!prevClose) prevClose = meta.chartPreviousClose ?? 0;
        const result = {
          symbol: meta.symbol || sym,
          name: meta.shortName || meta.longName || sym,
          price,
          change: price - prevClose,
          changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
          volume: meta.regularMarketVolume ?? 0,
          marketCap: 0,
        };
        cache.set(key, result, 120);
        return result;
      })
    );
    res.json(results.filter(r => r.status === 'fulfilled').map(r => r.value));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/news/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const query = symbol.replace('.TW', '').replace('.TWO', '');
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' stock')}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
    const key = `news:${symbol}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const xml = await response.text();

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
      const content = match[1];
      const title = content.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || content.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const link = content.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      const source = content.match(/<source.*?>(.*?)<\/source>/)?.[1] || '';
      items.push({ title, link, pubDate, source });
    }
    const result = { items };
    cache.set(key, result, 300);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message, items: [] });
  }
});

app.get('/api/twse/institutional/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const url = `https://www.twse.com.tw/rwd/zh/fund/T86?date=${date}&selectType=ALL&response=json`;
    const key = `twse:${date}`;
    const data = await cachedFetch(key, url, 3600);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/pe-river/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const key = `periver:${symbol}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);

    // Get 3-year monthly price data
    const chartUrl = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=3y&includePrePost=false`;
    const chartResp = await fetch(chartUrl, { headers: yahooHeaders });
    if (!chartResp.ok) throw new Error(`Chart HTTP ${chartResp.status}`);
    const chartData = await chartResp.json();
    const chartResult = chartData.chart?.result?.[0];
    if (!chartResult) throw new Error('No chart data');

    const timestamps = chartResult.timestamp || [];
    const closes = chartResult.indicators?.quote?.[0]?.close || [];
    const currentPrice = chartResult.meta?.regularMarketPrice ?? 0;

    const priceData = timestamps.map((ts, i) => ({
      time: new Date(ts * 1000).toISOString().slice(0, 10),
      ts,
      price: closes[i] ?? 0,
    })).filter(d => d.price > 0);

    // Get PE data from Yahoo timeseries
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
          pePoints = peResult.trailingPeRatio.map(p => ({
            date: p.asOfDate,
            pe: p.reportedValue?.raw ?? 0,
          })).filter(p => p.pe > 0);
        }
      }
    } catch {}

    // Calculate EPS at each PE point by finding closest price
    const epsPoints = [];
    for (const pp of pePoints) {
      const ppTs = new Date(pp.date).getTime() / 1000;
      let closest = priceData[0];
      let minDiff = Infinity;
      for (const pd of priceData) {
        const diff = Math.abs(pd.ts - ppTs);
        if (diff < minDiff) { minDiff = diff; closest = pd; }
      }
      if (closest && pp.pe > 0) {
        epsPoints.push({ date: pp.date, eps: closest.price / pp.pe, pe: pp.pe });
      }
    }

    // If no PE data, try to estimate from current price (fallback)
    if (epsPoints.length === 0 && currentPrice > 0) {
      // Use a default PE of 20 for estimation
      epsPoints.push({ date: priceData[priceData.length - 1]?.time, eps: currentPrice / 20, pe: 20 });
    }

    // Interpolate EPS for each month
    const result = priceData.map(pd => {
      let eps = epsPoints[0]?.eps ?? 1;
      const pdTs = new Date(pd.time).getTime();

      // Find surrounding EPS points and interpolate
      for (let i = 0; i < epsPoints.length; i++) {
        const epTs = new Date(epsPoints[i].date).getTime();
        if (i === epsPoints.length - 1 || pdTs <= epTs) {
          eps = epsPoints[i].eps;
          break;
        }
        const nextTs = new Date(epsPoints[i + 1].date).getTime();
        if (pdTs >= epTs && pdTs <= nextTs) {
          const ratio = (pdTs - epTs) / (nextTs - epTs);
          eps = epsPoints[i].eps + (epsPoints[i + 1].eps - epsPoints[i].eps) * ratio;
          break;
        }
      }

      return {
        time: pd.time,
        price: pd.price,
        pe10: eps * 10,
        pe15: eps * 15,
        pe20: eps * 20,
        pe25: eps * 25,
        pe30: eps * 30,
        pe35: eps * 35,
        currentPE: pd.price / eps,
        eps,
      };
    });

    const latestPE = currentPrice > 0 && epsPoints.length > 0
      ? currentPrice / epsPoints[epsPoints.length - 1].eps : 0;

    const output = { data: result, currentPE: latestPE, epsPoints };
    cache.set(key, output, 3600);
    res.json(output);
  } catch (e) {
    res.status(500).json({ error: e.message, data: [], currentPE: 0 });
  }
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Stock API proxy running on http://localhost:${PORT}`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} in use, trying ${PORT + 1}...`);
    app.listen(PORT + 1, () => {
      console.log(`Stock API proxy running on http://localhost:${PORT + 1}`);
    });
  } else {
    console.error(err);
    process.exit(1);
  }
});
