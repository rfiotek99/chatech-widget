const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeCousinsSnkrs() {
  console.log('🕷️ Scraping Cousins SNKRS...\n');
  
  try {
    const url = 'https://cousinsnkrs1.empretienda.com.ar/productos';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const products = [];
    
    // Método 1: Buscar por estructura "Ver detalle" + nombre + precio
    let currentProduct = null;
    
    $('*').each((i, elem) => {
      const text = $(elem).text().trim();
      
      // Detectar "Ver detalle" como inicio de producto
      if (text === 'Ver detalle') {
        if (currentProduct && currentProduct.name) {
          products.push(currentProduct);
        }
        currentProduct = { name: '', price: '' };
      }
      // Detectar precios (formato $XXX.XXX,XX)
      else if (text.match(/^\$[\d\.]+,\d{2}$/)) {
        if (currentProduct) {
          currentProduct.price = text;
        }
      }
      // Detectar nombres (texto largo que no sea precio ni "Ver detalle")
      else if (text.length > 5 && text.length < 100 && 
               !text.includes('Ver detalle') && 
               !text.startsWith('$') &&
               !text.includes('Más nuevo') &&
               !text.includes('Precio') &&
               currentProduct && 
               !currentProduct.name) {
        currentProduct.name = text;
      }
    });
    
    // Agregar último producto
    if (currentProduct && currentProduct.name) {
      products.push(currentProduct);
    }
    
    // Limpiar productos duplicados y vacíos
    const cleanProducts = [];
    const seen = new Set();
    
    for (const p of products) {
      if (p.name && p.name.length > 3 && !seen.has(p.name)) {
        // Filtrar textos que no son productos
        const invalidTexts = [
          'Información', 'Compra por', 'Iniciar sesión', 
          'Crear cuenta', 'cousinsnkrs', 'Productos',
          'más viejo', 'más nuevo', 'Precio menor', 'Precio mayor'
        ];
        
        const isValid = !invalidTexts.some(invalid => 
          p.name.toLowerCase().includes(invalid.toLowerCase())
        );
        
        if (isValid) {
          cleanProducts.push(p);
          seen.add(p.name);
        }
      }
    }
    
    console.log(`✅ Encontrados ${cleanProducts.length} productos\n`);
    
    if (cleanProducts.length > 0) {
      console.log('=' .repeat(70));
      console.log('📦 PRODUCTOS ENCONTRADOS:\n');
      
      cleanProducts.forEach((p, i) => {
        console.log(`${i+1}. ${p.name}`);
        if (p.price) {
          console.log(`   💰 ${p.price}`);
        }
        console.log('');
      });
      
      console.log('=' .repeat(70) + '\n');
    }
    
    // Guardar datos
    const scrapedData = {
      lastUpdate: new Date().toISOString(),
      products: cleanProducts,
      totalProducts: cleanProducts.length,
      url: url
    };
    
    fs.writeFileSync('scraped-data.json', JSON.stringify(scrapedData, null, 2));
    console.log('💾 Datos guardados en scraped-data.json\n');
    
    // Generar system prompt
    if (cleanProducts.length > 0) {
      let productList = cleanProducts.map((p, i) => {
        let line = `${i+1}. ${p.name}`;
        if (p.price) {
          line += ` - ${p.price}`;
        }
        return line;
      }).join('\n');
      
      const dynamicPrompt = `Eres el asistente de Cousins SNKRS, tienda de sneakers exclusivos.

CATÁLOGO ACTUALIZADO (${new Date().toLocaleDateString('es-AR')}):

${productList}

INFORMACIÓN IMPORTANTE:
✅ Todos los productos son 100% ORIGINALES y verificados
✅ Stock disponible para entrega inmediata o encargue
✅ Consultas de disponibilidad respondidas al instante

CÓMO ATENDER:
- Si preguntan por un modelo de la lista → Confirmá que está disponible y preguntá el TALLE
- Si preguntan por otro modelo → "Dejame consultar ese modelo. ¿Qué talle necesitás?"
- SIEMPRE preguntá el talle cuando consultan zapatillas
- Mostrá entusiasmo por la cultura sneaker

MARCAS QUE MANEJAMOS:
Nike • Jordan • Adidas • Yeezy • Supreme • Bape • Gucci

DATOS DE LA TIENDA:
📅 Horarios: Todos los días 8am - 9pm
🚚 Envíos: A todo el país
💳 Pagos: Efectivo, transferencia, Mercado Pago, tarjetas
📍 Compra por encargue disponible

TONO: Urbano, relajado, entusiasta sneakerhead, pero profesional.`;
      
      console.log('📝 SYSTEM PROMPT GENERADO:\n');
      console.log('=' .repeat(70));
      console.log(dynamicPrompt);
      console.log('=' .repeat(70) + '\n');
      
      fs.writeFileSync('generated-prompt.txt', dynamicPrompt);
      console.log('💾 System prompt guardado en generated-prompt.txt\n');
      
      // También actualizar clients.json automáticamente
      try {
        const clientsData = JSON.parse(fs.readFileSync('clients.json', 'utf8'));
        if (clientsData.cousinssnkrs) {
          clientsData.cousinssnkrs.systemPrompt = dynamicPrompt;
          fs.writeFileSync('clients.json', JSON.stringify(clientsData, null, 2));
          console.log('✅ clients.json actualizado con nuevo system prompt\n');
        }
      } catch (e) {
        console.log('⚠️  No se pudo actualizar clients.json automáticamente');
      }
    }
    
    return { success: true, products: cleanProducts.length };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

scrapeCousinsSnkrs().then(result => {
  console.log('='.repeat(70));
  if (result.success) {
    console.log(`✅ SCRAPING EXITOSO: ${result.products} productos`);
    console.log('\n💡 El system prompt se actualizó automáticamente');
    console.log('💡 Reiniciá el servidor para que tome los cambios');
  } else {
    console.log(`❌ ERROR: ${result.error}`);
  }
  console.log('='.repeat(70) + '\n');
});
