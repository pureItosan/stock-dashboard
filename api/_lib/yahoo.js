const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const YAHOO_BASE2 = 'https://query2.finance.yahoo.com';

const yahooHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

async function fetchJSON(url) {
  const res = await fetch(url, { headers: yahooHeaders });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

module.exports = { YAHOO_BASE, YAHOO_BASE2, yahooHeaders, fetchJSON };
