export default async function handler(req, res) {
  try {
    const { symbol } = req.query;
    const query = symbol.replace('.TW', '').replace('.TWO', '');
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' stock')}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const xml = await response.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
      const content = match[1];
      const title = content.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || content.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const link = content.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      const source = content.match(/<source.*?>(.*?)<\/source>/)?.[1] || '';
      items.push({ title, link, pubDate, source });
    }
    res.json({ items });
  } catch (e) { res.status(500).json({ error: e.message, items: [] }); }
}
