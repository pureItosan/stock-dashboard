const { YAHOO_BASE, fetchJSON } = require('../_lib/yahoo');

module.exports = async function handler(req, res) {
  try {
    const { symbol } = req.query;
    const interval = req.query.interval || '1d';
    const range = req.query.range || '6mo';
    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
    const data = await fetchJSON(url);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
