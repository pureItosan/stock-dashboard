import { fetchJSON } from '../../_lib/yahoo.js';

export default async function handler(req, res) {
  try {
    const { date } = req.query;
    const url = `https://www.twse.com.tw/rwd/zh/fund/T86?date=${date}&selectType=ALL&response=json`;
    const data = await fetchJSON(url);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
}
