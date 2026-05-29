export const YAHOO_BASE = 'https://query1.finance.yahoo.com';
export const YAHOO_BASE2 = 'https://query2.finance.yahoo.com';

export const yahooHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

export async function fetchJSON(url) {
  const res = await fetch(url, { headers: yahooHeaders });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
