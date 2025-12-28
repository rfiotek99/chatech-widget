const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeEmpretienda(baseUrl) {
  const products = [];
  
  try {
    const response = await axios.get(baseUrl + '/productos');
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
  } catch (error) {
    console.error('Error scraping:', error.message);
  }
  
  return products;
}

function generateSystemPrompt(clientData, products) {
  const productList = products
    .filter(p => p.hasStock)
    .map(p => `- ${p.name}: ${p.price || 'Consultar precio'}`)
    .join('\n');
  
  const outOfStock = products
    .filter(p => !p.hasStock)
    .map(p => p.name)
    .join(', ');

  return `Eres el asistente virtual de ${clientData.name}. 

PRODUCTOS DISPONIBLES:
${productList}

${outOfStock ? `SIN STOCK: ${outOfStock}` : ''}

INFO:
- Horarios: ${clientData.hours || 'Consultar'}
- Envíos: ${clientData.shipping || 'Consultar'}
- Pagos: ${clientData.payments || 'Mercado Pago, tarjetas, transferencia'}
- Cambios: ${clientData.returns || '30 días'}

Responde en español argentino, sé amable. No inventes productos.
Actualizado: ${new Date().toLocaleString('es-AR')}`;
}

async function scrapeAndUpdate(clientId, storeUrl) {
  console.log(`Scraping ${clientId}...`);
  
  const { data: clientData } = await supabase
    .from('clients')
    .select('*')
    .eq('client_id', clientId)
    .single();
  
  if (!clientData) {
    console.error('Cliente no encontrado');
    return { success: false };
  }
  
  const products = await scrapeEmpretienda(storeUrl);
  console.log(`Productos: ${products.length}`);
  
  if (products.length === 0) {
    return { success: false, message: 'No products found' };
  }
  
  const newPrompt = generateSystemPrompt(clientData, products);
  
  await supabase
    .from('clients')
    .update({ system_prompt: newPrompt })
    .eq('client_id', clientId);
  
  return { success: true, products: products.length };
}

module.exports = { scrapeAndUpdate, scrapeEmpretienda };
