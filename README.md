# ChatEch v2.0 - AI Widget para E-commerce

🚀 **Sistema de chatbot IA embebible con backend Supabase y tracking completo**

## 🎯 ¿Qué es ChatEch?

ChatEch es un widget de chat con IA que se integra en cualquier e-commerce en menos de 5 minutos. Utiliza GPT-4o-mini de OpenAI para responder consultas de clientes 24/7 de forma automática.

### ✨ Features Principales

- ✅ **Widget embebible** - Un snippet y listo
- ✅ **Multi-tenant** - Múltiples clientes con configs personalizadas
- ✅ **Personalización completa** - Colores, logo, mensajes, prompts
- ✅ **Memoria conversacional** - Mantiene contexto en la sesión
- ✅ **Auto-scraping** - Actualiza catálogo de productos cada 24h
- ✅ **Backend Supabase** - PostgreSQL escalable con tracking completo
- ✅ **Analytics** - Métricas de conversaciones, engagement y performance
- ✅ **OpenAI GPT-4o-mini** - Respuestas inteligentes y naturales

## 🏗️ Arquitectura

```
┌─────────────┐
│   Cliente   │
│  (E-commerce)│
└──────┬──────┘
       │ 1. Instala snippet
       │
       ▼
┌─────────────────────────────────────┐
│         Widget JavaScript            │
│  • Interfaz de chat                  │
│  • Gestión de sesiones               │
│  • Personalización visual            │
└──────┬──────────────────────────────┘
       │ 2. API calls
       │
       ▼
┌─────────────────────────────────────┐
│       Express.js Backend             │
│  • GET /api/config/:clientId         │
│  • POST /api/chat                    │
│  • GET /api/dashboard/:id/analytics  │
└──────┬──────────────────────────────┘
       │ 3. Queries
       │
       ▼
┌─────────────────────────────────────┐
│        Supabase PostgreSQL           │
│  • clients (configuración)           │
│  • conversations (sesiones)          │
│  • messages (historial)              │
│  • catalog_items (productos)         │
│  • subscriptions (billing)           │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│          OpenAI API                  │
│  • GPT-4o-mini                       │
│  • Streaming responses               │
└─────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Clonar o descargar el proyecto

```bash
cd chatechv2
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

Sigue la guía completa en [`GUIA-MIGRACION.md`](./GUIA-MIGRACION.md)

**Resumen:**
1. Crear proyecto en https://supabase.com
2. Ejecutar `supabase-schema.sql` en SQL Editor
3. Copiar credenciales (URL + service key)

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
OPENAI_API_KEY=sk-tu-key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
```

### 5. Migrar datos (si vienes de v1)

```bash
npm run migrate
```

### 6. Iniciar servidor

```bash
npm start
```

El servidor estará corriendo en `http://localhost:3000`

### 7. Probar el widget

Abre en tu navegador:
```
http://localhost:3000/demo-shopnow.html
```

## 📁 Estructura del Proyecto

```
chatechv2/
├── server.js                 # Backend principal con Supabase
├── migrate-to-supabase.js    # Script de migración
├── scraper.js                # Auto-scraper de catálogos
├── supabase-schema.sql       # Schema completo de DB
├── package.json              # Dependencias
├── .env.example              # Template de variables
├── vercel.json               # Config de deploy
├── clients.json              # (Legacy) Será reemplazado por DB
├── public/
│   ├── widget.js             # Widget embebible
│   ├── demo-*.html           # Páginas de demo
│   └── logos/                # Logos de clientes
├── README.md                 # Este archivo
└── GUIA-MIGRACION.md         # Guía completa paso a paso
```

## 🔧 Comandos Disponibles

```bash
npm start              # Iniciar servidor
npm run dev            # Iniciar con nodemon (auto-reload)
npm run migrate        # Migrar datos de clients.json a Supabase
npm run scraper        # Ejecutar scraper manualmente
```

## 🌐 API Endpoints

### Públicos (widget)

- `GET /api/config/:clientId` - Obtener configuración del cliente
- `POST /api/chat` - Enviar mensaje y recibir respuesta
- `GET /api/dashboard/:clientId/analytics` - Obtener métricas

### Privados (admin - requieren auth)

- `GET /api/admin/clients` - Listar todos los clientes
- `GET /api/admin/clients/:id` - Obtener detalle de cliente
- `PUT /api/admin/clients/:id` - Actualizar cliente

## 📊 Base de Datos

### Tablas principales:

**clients** - Configuración de cada cliente
```sql
- client_id (único, usado en snippet)
- name, email
- primary_color, secondary_color, logo
- welcome_message, system_prompt
- plan, status, trial_ends_at
```

**conversations** - Sesiones de chat
```sql
- session_id (único por usuario)
- client_id (FK)
- started_at, last_message_at
- message_count, duration_seconds
```

**messages** - Mensajes individuales
```sql
- conversation_id (FK)
- role (user/assistant)
- content
- tokens_used, response_time_ms, cost_usd
```

**catalog_items** - Productos scrapeados
```sql
- client_id (FK)
- name, price, description, image_url
- stock_status
```

## 🎨 Personalización del Widget

El widget se personaliza completamente por cliente en la DB:

```javascript
// En la tabla clients:
{
  primary_color: "#667eea",      // Color principal
  secondary_color: "#764ba2",    // Color secundario  
  logo: "💬",                    // Emoji o URL de imagen
  welcome_message: "¡Hola! 👋", // Mensaje de bienvenida
  system_prompt: "Eres un..."   // Instrucciones para la IA
}
```

## 🔐 Seguridad

- ✅ Row Level Security (RLS) en Supabase
- ✅ Service key solo en backend (nunca en frontend)
- ✅ CORS configurado
- ✅ Rate limiting (TODO)
- ✅ Input sanitization
- ✅ Auth para admin endpoints

## 📈 Analytics

Métricas disponibles por cliente:

- 📊 Conversaciones por día/mes
- 💬 Mensajes por conversación (promedio)
- ⏱️ Tiempo de respuesta promedio
- 📈 Trending (comparación mes anterior)
- 🕐 Heatmap de horarios pico
- 💰 Costo OpenAI por cliente

## 🚀 Deploy a Producción

### Vercel (Recomendado)

1. Conectar repo a Vercel
2. Configurar variables de entorno en Vercel:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
3. Deploy automático en cada push

### Otras opciones

- Railway
- Render
- AWS Lambda
- Google Cloud Run

## 💰 Costos Estimados

**Supabase:**
- Free tier: Hasta 500 MB DB, 2 GB bandwidth
- Pro: $25/mes (8 GB DB, 250 GB bandwidth)

**OpenAI:**
- GPT-4o-mini: ~$0.15 input + $0.60 output por 1M tokens
- Estimado: $30-100/mes con 50 clientes activos

**Hosting:**
- Vercel: $0 (hobby) o $20/mes (pro)

**Total: ~$0-50/mes** para comenzar

## 🛣️ Roadmap

### ✅ Completado (v2.0)
- [x] Migración a Supabase
- [x] Tracking de conversaciones
- [x] Analytics básicos
- [x] Multi-tenant funcionando

### 🚧 En progreso (Q1 2025)
- [ ] Panel de administración web
- [ ] Sistema de billing (Mercado Pago + Stripe)
- [ ] Onboarding automatizado
- [ ] Dashboard de cliente mejorado

### 📅 Planeado (Q2 2025)
- [ ] Shopify App
- [ ] WooCommerce Plugin
- [ ] Integraciones (Zapier, Make)
- [ ] Multi-idioma
- [ ] Voice mode

## 🐛 Troubleshooting

**Error: Cliente no encontrado**
- Verifica que el `client_id` exista en la tabla `clients`
- Ejecuta la migración si vienes de v1

**Error: OpenAI API**
- Verifica que la key sea válida
- Revisa límites de rate limit en OpenAI

**Error: Supabase connection**
- Verifica URL y service key
- Asegúrate que el proyecto esté activo

**Widget no carga**
- Revisa la consola del navegador (F12)
- Verifica que el server esté corriendo
- Chequea CORS settings

## 📞 Soporte

- 📧 Email: ramiro@chatech.com
- 🐛 Issues: [GitHub Issues](link)
- 📖 Documentación: Ver `GUIA-MIGRACION.md`

## 📄 Licencia

MIT License - Ramiro Fernández / RF Analytics

---

**Hecho con ❤️ en Argentina 🇦🇷**

v2.0.0 - Diciembre 2024
