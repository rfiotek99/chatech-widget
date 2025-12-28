const { scrapeAndUpdate } = require('../scraper-empretienda');

module.exports = async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.key;
  
  if (apiKey !== process.env.SCRAPER_API_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  const { client_id, store_url } = req.query;
  
  if (!client_id || !store_url) {
    return res.status(400).json({ error: 'Faltan client_id y store_url' });
  }
  
  try {
    const result = await scrapeAndUpdate(client_id, store_url);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
