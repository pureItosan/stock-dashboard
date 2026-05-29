import { YAHOO_BASE2, fetchJSON } from './_lib/yahoo.js';

let twStockList = [];
let twStockListLoaded = false;

async function loadTWStockList() {
  if (twStockListLoaded && twStockList.length > 0) return;
  try {
    const [listedRes, otcRes] = await Promise.allSettled([
      fetch('https://openapi.twse.com.tw/v1/opendata/t187ap03_L', { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.json()),
      fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes', { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.json()),
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
          if (!stocks.some(s => s.code === code.trim())) {
            stocks.push({ symbol: code.trim() + '.TWO', name: name.trim(), code: code.trim() });
          }
        }
      }
    }
    twStockList = stocks;
    twStockListLoaded = true;
  } catch {}
}

export default async function handler(req, res) {
  try {
    const q = req.query.q;
    if (!q) return res.json({ quotes: [] });
    const hasChinese = /[一-鿿]/.test(q);
    if (hasChinese) {
      await loadTWStockList();
      const qLower = q.trim().toLowerCase();
      const localResults = twStockList
        .filter(s => s.name.toLowerCase().includes(qLower) || s.code.includes(qLower))
        .slice(0, 10)
        .map(s => ({ symbol: s.symbol, shortname: s.name, exchange: s.symbol.endsWith('.TWO') ? 'TPEx' : 'TWSE', exchDisp: s.symbol.endsWith('.TWO') ? '櫃買中心' : '臺灣證券交易所', quoteType: 'EQUITY' }));
      if (localResults.length > 0) return res.json({ quotes: localResults });
    }
    const encoded = encodeURIComponent(q);
    let data = null;
    for (const url of [
      `${YAHOO_BASE2}/v1/finance/search?q=${encoded}&quotesCount=10&newsCount=0`,
      `${YAHOO_BASE2}/v1/finance/search?q=${encoded}&quotesCount=10&newsCount=0&lang=en`,
    ]) {
      try { data = await fetchJSON(url); if (data?.quotes?.length) break; } catch { continue; }
    }
    if (!data || !data.quotes?.length) {
      if (/^\d{4,6}$/.test(q.trim())) {
        const results = [];
        for (const suffix of ['.TW', '.TWO']) {
          try {
            const chartData = await fetchJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${q.trim()}${suffix}?interval=1d&range=1d`);
            const meta = chartData.chart?.result?.[0]?.meta;
            if (meta) results.push({ symbol: meta.symbol, shortname: meta.shortName || meta.symbol, exchange: meta.exchangeName, exchDisp: meta.fullExchangeName || meta.exchangeName, quoteType: 'EQUITY' });
          } catch {}
        }
        if (results.length > 0) return res.json({ quotes: results });
      }
      return res.json({ quotes: [] });
    }
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
}
