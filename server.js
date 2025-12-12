require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');

const app = express();

// ====================================
// SECURITY & MIDDLEWARE
// ====================================

// CORS configuration - adjust origins for production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In production, check against allowed origins
    // For now, allow all origins for widget embedding
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true); // Widgets need to work from any domain
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' })); // Limit payload size
app.use(express.static('public'));

// Simple in-memory rate limiting (per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per IP

function rateLimit(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const record = rateLimitMap.get(ip);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ 
      error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }
  
  record.count++;
  next();
}

// Apply rate limiting to API routes
app.use('/api/', rateLimit);

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime + RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;

// ====================================
// SUPABASE CLIENT SETUP
// ====================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ FATAL: Missing Supabase credentials');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔌 Connecting to Supabase...');
console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`   Key: ✅ Configured`);

// ====================================
// HEALTH CHECK ENDPOINT
// ====================================
app.get('/api/health', async (req, res) => {
  try {
    // Check Supabase connection
    const { data, error } = await supabase
      .from('clients')
      .select('count')
      .limit(1);
    
    const healthy = !error;
    
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        supabase: healthy ? 'connected' : 'disconnected',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
      },
      version: '2.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ====================================
// SIMPLE CONFIG CACHE (5 min TTL)
// ====================================
const configCache = new Map();
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedConfig(clientId) {
  const cached = configCache.get(clientId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.config;
  }
  return null;
}

function setCachedConfig(clientId, config) {
  configCache.set(clientId, {
    config,
    expiresAt: Date.now() + CONFIG_CACHE_TTL
  });
}

// ====================================
// ENDPOINT: Get Client Config
// ====================================
app.get('/api/config/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Validate clientId format (alphanumeric + hyphens only)
    if (!/^[a-zA-Z0-9-_]+$/.test(clientId)) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }
    
    // Check cache first
    const cachedConfig = getCachedConfig(clientId);
    if (cachedConfig) {
      return res.json(cachedConfig);
    }
    
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .single();
    
    if (error || !client) {
      console.log(`❌ Client not found: ${clientId}`);
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Return config in expected format (matching old structure)
    // Note: systemPrompt is NOT sent to frontend for security
    const config = {
      id: client.client_id,
      name: client.name,
      primaryColor: client.primary_color,
      secondaryColor: client.secondary_color,
      logo: client.logo,
      logoType: client.logo_type,
      welcomeMessage: client.welcome_message,
      hours: client.hours,
      shipping: client.shipping,
      returns: client.returns,
      payments: client.payments
    };

    // Cache the config
    setCachedConfig(clientId, config);

    console.log(`✅ Config loaded for: ${clientId}`);
    res.json(config);

  } catch (error) {
    console.error('❌ Error in /api/config:', error);
    res.status(500).json({ error: 'Error al cargar configuración' });
  }
});

// ====================================
// ENDPOINT: Chat with tracking
// ====================================
app.post('/api/chat', async (req, res) => {
  try {
    const { message, clientId, sessionId, pageUrl } = req.body;
    
    // Input validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }
    
    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({ error: 'ClientId requerido' });
    }
    
    // Sanitize message (limit length, trim)
    const sanitizedMessage = message.trim().substring(0, 2000);
    
    if (sanitizedMessage.length === 0) {
      return res.status(400).json({ error: 'Mensaje vacío' });
    }

    // 1. Get client (with system prompt - kept server-side only)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .single();
    
    if (clientError || !client) {
      return res.status(404).json({ error: 'Cliente no encontrado o inactivo' });
    }

    // 2. Get or create conversation
    let conversation;
    const actualSessionId = sessionId || `${clientId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    if (sessionId) {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .single();
      conversation = data;
    }
    
    if (!conversation) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          client_id: client.id,
          session_id: actualSessionId,
          user_agent: req.headers['user-agent']?.substring(0, 500),
          ip_address: req.ip,
          page_url: pageUrl?.substring(0, 500),
          started_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (convError) {
        console.error('Error creating conversation:', convError);
        return res.status(500).json({ error: 'Error al crear conversación' });
      }
      
      conversation = newConv;
      console.log(`📝 New conversation: ${conversation.id}`);
    }

    // 3. Get conversation history (last 20 messages)
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20);

    // 4. Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY not configured');
      return res.status(500).json({ error: 'Servicio temporalmente no disponible' });
    }

    const messages = [
      { role: 'system', content: client.system_prompt },
      ...(history || []),
      { role: 'user', content: sanitizedMessage }
    ];

    const startTime = Date.now();
    
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
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, errorData);
      
      if (response.status === 429) {
        return res.status(503).json({ error: 'Servicio ocupado. Intenta en unos segundos.' });
      }
      return res.status(500).json({ error: 'Error al procesar mensaje' });
    }

    const data = await response.json();
    const botResponse = data.choices[0].message.content;
    const responseTime = Date.now() - startTime;
    const tokensUsed = data.usage?.total_tokens || 0;

    // Calculate cost (approximate)
    // gpt-4o-mini: $0.15 per 1M input tokens, $0.60 per 1M output tokens
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const costUsd = (inputTokens * 0.15 / 1000000) + (outputTokens * 0.60 / 1000000);

    // 5. Save messages (async - don't block response)
    const messagesToInsert = [
      {
        conversation_id: conversation.id,
        client_id: client.id,
        role: 'user',
        content: sanitizedMessage,
        created_at: new Date().toISOString()
      },
      {
        conversation_id: conversation.id,
        client_id: client.id,
        role: 'assistant',
        content: botResponse,
        tokens_used: tokensUsed,
        response_time_ms: responseTime,
        cost_usd: costUsd,
        created_at: new Date().toISOString()
      }
    ];

    // Fire and forget - don't await
    supabase
      .from('messages')
      .insert(messagesToInsert)
      .then(({ error }) => {
        if (error) console.error('Error saving messages:', error);
      });

    // 6. Update conversation stats (async)
    supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (conversation.message_count || 0) + 2,
        user_messages: (conversation.user_messages || 0) + 1,
        bot_messages: (conversation.bot_messages || 0) + 1
      })
      .eq('id', conversation.id)
      .then(({ error }) => {
        if (error) console.error('Error updating conversation:', error);
      });

    // 7. Update client stats (async)
    supabase
      .rpc('increment_client_conversations', { client_uuid: client.id })
      .then(({ error }) => {
        if (error) console.error('Error updating client stats:', error);
      });

    // 8. Return response immediately
    console.log(`✅ Chat: ${clientId} | ${responseTime}ms | ${tokensUsed} tokens | $${costUsd.toFixed(6)}`);
    
    res.json({ 
      botResponse,
      sessionId: actualSessionId
    });

  } catch (error) {
    console.error('❌ Error in /api/chat:', error);
    res.status(500).json({ 
      error: 'Error al procesar solicitud'
    });
  }
});

// ====================================
// ENDPOINT: Get client dashboard analytics
// ====================================
app.get('/api/dashboard/:clientId/analytics', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Get client
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('client_id', clientId)
      .single();
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get this month's conversations
    const { count: conversationsThisMonth } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .gte('started_at', monthStart.toISOString());

    // Get last month's conversations for trend
    const { count: conversationsLastMonth } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .gte('started_at', lastMonthStart.toISOString())
      .lte('started_at', lastMonthEnd.toISOString());

    const trend = conversationsLastMonth > 0 
      ? ((conversationsThisMonth - conversationsLastMonth) / conversationsLastMonth * 100).toFixed(1)
      : 100;

    // Get daily conversations (last 30 days)
    const { data: dailyData } = await supabase
      .rpc('get_daily_conversations', {
        client_uuid: client.id,
        days: 30
      });

    // Get engagement metrics
    const { data: conversations } = await supabase
      .from('conversations')
      .select('message_count, started_at, last_message_at')
      .eq('client_id', client.id)
      .gte('started_at', monthStart.toISOString());

    const avgMessagesPerConversation = conversations && conversations.length > 0
      ? (conversations.reduce((sum, c) => sum + (c.message_count || 0), 0) / conversations.length).toFixed(1)
      : 0;

    // Get performance metrics
    const { data: messages } = await supabase
      .from('messages')
      .select('response_time_ms')
      .not('response_time_ms', 'is', null)
      .gte('created_at', monthStart.toISOString())
      .limit(1000);

    const avgResponseTime = messages && messages.length > 0
      ? (messages.reduce((sum, m) => sum + m.response_time_ms, 0) / messages.length).toFixed(0)
      : 0;

    res.json({
      overview: {
        conversationsThisMonth: conversationsThisMonth || 0,
        trend: `${trend > 0 ? '+' : ''}${trend}%`,
        avgMessagesPerConversation,
        avgResponseTime: `${avgResponseTime}ms`
      },
      dailyConversations: dailyData || []
    });

  } catch (error) {
    console.error('❌ Error in /api/dashboard:', error);
    res.status(500).json({ error: 'Error al cargar analytics' });
  }
});

// ====================================
// ADMIN ENDPOINTS (protected)
// ====================================

// Middleware to verify admin
async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Verify user is admin
  const { data: admin } = await supabase
    .from('admins')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (!admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  req.admin = admin;
  req.user = user;
  next();
}

// Get all clients (admin only)
app.get('/api/admin/clients', requireAdmin, async (req, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Error al cargar clientes' });
  }
});

// Get single client (admin only)
app.get('/api/admin/clients/:id', requireAdmin, async (req, res) => {
  try {
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Error al cargar cliente' });
  }
});

// Update client (admin only)
app.put('/api/admin/clients/:id', requireAdmin, async (req, res) => {
  try {
    const { data: client, error } = await supabase
      .from('clients')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// ====================================
// SCRAPER (keep existing functionality)
// ====================================
function runScraper() {
  const now = new Date();
  console.log(`\n🕷️  [${now.toLocaleString('es-AR')}] Actualizando catálogo...`);
  
  exec('node scraper.js', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error en scraper:', error.message);
    } else {
      console.log('✅ Catálogo actualizado');
    }
  });
}

// Only run scraper in production or when explicitly enabled
if (process.env.ENABLE_SCRAPER === 'true') {
  // Start scraper after 30 seconds (give time for server to stabilize)
  setTimeout(() => {
    console.log('\n🤖 Iniciando actualización automática...');
    runScraper();
  }, 30000);

  // Run scraper every 24 hours
  setInterval(runScraper, 24 * 60 * 60 * 1000);
  console.log('⏰ Auto-scraper: Activo (cada 24 horas)');
} else {
  console.log('⏰ Auto-scraper: Desactivado (set ENABLE_SCRAPER=true to enable)');
}

// ====================================
// GLOBAL ERROR HANDLERS
// ====================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err);
  // Keep the server running but log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
});

// ====================================
// START SERVER
// ====================================
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 ChatEch Widget API v2.0');
  console.log('='.repeat(50));
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🔑 OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ NO configurada'}`);
  console.log(`🗄️  Supabase: ✅ Conectada`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(50) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
