const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Temporalmente sin verificación de API key para testing
  const { client_id, store_url } = req.query;
  
  if (!client_id || !store_url) {
    return res.status(400).json({ error: 'Faltan client_id y store_url' });
  }
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', client_id)
      .single();
    
    if (clientError || !clientData) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    const products = [];
    const response = await axios.get(store_url + '/productos', { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    $('h3 a').each((i, el) => {
      const name = $(el).text().trim();
      const container = $(el).closest('div').parent();
      const priceText = container.text();
      const priceMatch = priceText.match(/\$[\d.,]+/);
      const price = priceMatch ? priceMatch[0] : null;
      const hasStock = !container.text().toLowerCase().includes('sin stock');
      
      if (name && name.length > 2 && !products.some(p => p.name === name)) {
        products.push({ name, price, hasStock });
      }
    });
    
    if (products.length === 0) {
      return res.json({ success: false, message: 'No se encontraron productos', debug: 'scraper ejecutado' });
    }
    
    const productList = products
      .filter(p => p.hasStock)
      .map(p => `- ${p.name}: ${p.price || 'Consultar'}`)
      .join('\n');
    
    const outOfStock = products
      .filter(p => !p.hasStock)
      .map(p => p.name)
      .join(', ');
    
    const newPrompt = `Eres el asistente virtual de ${clientData.name}.

PRODUCTOS DISPONIBLES:
${productList}

${outOfStock ? `SIN STOCK: ${outOfStock}` : ''}

INFO:
- Envíos: ${clientData.shipping || 'Consultar'}
- Pagos: ${clientData.payments || 'Mercado Pago, tarjetas, transferencia'}
- Cambios: ${clientData.returns || '30 días'}

Responde en español argentino, sé amable. No inventes productos.
Actualizado: ${new Date().toLocaleString('es-AR')}`;
    
    const { error: updateError } = await supabase
      .from('clients')
      .update({ system_prompt: newPrompt })
      .eq('client_id', client_id);
    
    if (updateError) {
      return res.status(500).json({ error: 'Error actualizando base de datos' });
    }
    
    return res.json({ 
      success: true, 
      products: products.length,
      withStock: products.filter(p => p.hasStock).length,
      outOfStock: products.filter(p => !p.hasStock).length
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
