// Shared Yahoo Finance utilities for Vercel serverless functions
const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const YAHOO_BASE2 = 'https://query2.finance.yahoo.com';

const yahooHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

// Simple in-memory cache (per-invocation only in serverless, but helps with warm functions)
const cache = new Map();

function cachedGet(key) {
  const item = cache.get(key);
  if (item && Date.now() < item.expires) return item.data;
  return null;
}

function cachedSet(key, data, ttlMs) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

async function fetchJSON(url, ttlMs = 120000) {
  const res = await fetch(url, { headers: yahooHeaders });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

module.exports = { YAHOO_BASE, YAHOO_BASE2, yahooHeaders, fetchJSON, cachedGet, cachedSet };
