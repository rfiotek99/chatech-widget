require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Guardar historial de conversaciones por sesión
const conversations = new Map();

// Función para obtener configuración del cliente
function getClientConfig(clientId) {
  try {
    const data = fs.readFileSync('clients.json', 'utf8');
    const clients = JSON.parse(data);
    return clients[clientId] || clients.demo;
  } catch (error) {
    console.error('Error reading clients.json:', error);
    return null;
  }
}

// Endpoint: Obtener configuración del cliente
app.get('/api/config/:clientId', (req, res) => {
  const { clientId } = req.params;
  const config = getClientConfig(clientId);
  
  if (config) {
    res.json(config);
  } else {
    res.status(404).json({ error: 'Cliente no encontrado' });
  }
});

// Endpoint: Chat con OpenAI con historial
app.post('/api/chat', async (req, res) => {
  const { message, clientId, sessionId } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Mensaje requerido' });
  }

  const config = getClientConfig(clientId);
  if (!config) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no configurada');
    }

    // Crear ID de sesión único (o usar el provisto)
    const conversationId = sessionId || `${clientId}-${Date.now()}`;
    
    // Obtener historial de la conversación
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, []);
    }
    
    const history = conversations.get(conversationId);
    
    // Agregar mensaje del usuario al historial
    history.push({
      role: 'user',
      content: message
    });

    // Construir mensajes para OpenAI
    const messages = [
      {
        role: 'system',
        content: config.systemPrompt
      },
      ...history
    ];

    // Llamar a OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const botResponse = data.choices[0].message.content;

    // Agregar respuesta del bot al historial
    history.push({
      role: 'assistant',
      content: botResponse
    });

    // Limitar historial a últimos 20 mensajes
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    res.json({ 
      botResponse,
      sessionId: conversationId
    });

  } catch (error) {
    console.error('Error en /api/chat:', error);
    res.status(500).json({ 
      error: 'Error al procesar solicitud',
      details: error.message 
    });
  }
});

// Endpoint: Admin panel
app.get('/admin', (req, res) => {
  res.send('<h1>Panel Admin - Próximamente</h1>');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ ChatEch Widget API running on http://localhost:${PORT}`);
  console.log(`🔑 OpenAI: ${process.env.OPENAI_API_KEY ? 'Configurada ✅' : 'NO configurada ❌'}`);
});

// Auto-scraper
const { exec } = require('child_process');

function runScraper() {
  const now = new Date();
  console.log(`\n🕷️ [${now.toLocaleString('es-AR')}] Actualizando catálogo...`);
  
  exec('node scraper.js', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error en scraper:', error.message);
    } else {
      console.log('✅ Catálogo actualizado');
    }
  });
}

setTimeout(() => {
  console.log('\n🤖 Iniciando actualización automática...');
  runScraper();
}, 5000);

setInterval(runScraper, 24 * 60 * 60 * 1000);
console.log('⏰ Auto-scraper: Activo (cada 24 horas)');
