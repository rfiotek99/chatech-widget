# 🚀 EMPIEZA AQUÍ - ChatEch v2.0

¡Bienvenido a ChatEch v2.0! Esta guía te ayudará a empezar en **menos de 30 minutos**.

---

## 📦 ¿Qué hay en esta carpeta?

```
chatechv2/
├── 📘 README.md                    ← Documentación completa del proyecto
├── 📗 GUIA-MIGRACION.md            ← Guía PASO A PASO (2-3 horas)
├── 📙 TODO.md                      ← Lista de tareas pendientes
├── 📕 CHANGELOG.md                 ← Historial de cambios
│
├── 🗄️  supabase-schema.sql          ← Schema SQL completo (copiar/pegar en Supabase)
├── 🔄 migrate-to-supabase.js       ← Script de migración automática
├── 🚀 server.js                    ← Backend refactorizado con Supabase
├── 🕷️  scraper.js                   ← Auto-scraper de catálogos
│
├── ⚙️  package.json                 ← Dependencias (incluye @supabase/supabase-js)
├── 🔐 .env.example                 ← Template de variables de entorno
├── 🚫 .gitignore                   ← Archivos a ignorar en git
├── 📜 setup.sh                     ← Script de setup automático
├── 🌐 vercel.json                  ← Configuración de deploy
│
├── 📁 public/                      ← Widget y archivos estáticos
│   ├── widget.js                  ← Widget JavaScript embebible
│   ├── demo-*.html                ← Páginas de demo
│   └── logos/                     ← Logos de clientes
│
└── 📄 clients.json                 ← (Legacy) Será reemplazado por DB
```

---

## ⚡ Quick Start (30 minutos)

### 1️⃣ Setup Inicial (5 min)

```bash
cd chatechv2

# Ejecutar script automático
./setup.sh

# O manualmente:
npm install
cp .env.example .env
```

### 2️⃣ Crear Proyecto Supabase (10 min)

1. Ve a https://supabase.com y crea una cuenta
2. Click en "New Project"
   - Name: `chatech-production`
   - Region: `South America (São Paulo)`
   - Generate password (¡guárdala!)
3. Espera 2-3 minutos a que se cree el proyecto

### 3️⃣ Ejecutar Schema SQL (5 min)

1. En Supabase, ve a **SQL Editor**
2. Click "+ New query"
3. Abre `supabase-schema.sql` y copia TODO el contenido
4. Pégalo en el editor y click **RUN**
5. Deberías ver: `Success. No rows returned`

### 4️⃣ Configurar Credenciales (3 min)

1. En Supabase, ve a **Settings → API**
2. Copia estas credenciales a tu `.env`:

```env
OPENAI_API_KEY=sk-tu-key-actual

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (service_role key, NO la anon key)

PORT=3000
```

### 5️⃣ Migrar Datos (2 min)

```bash
npm run migrate
```

Deberías ver:
```
✅ Successfully migrated: 6
📝 Total clients: 6
```

### 6️⃣ Iniciar Servidor (1 min)

```bash
npm start
```

Deberías ver:
```
🚀 ChatEch Widget API
📡 Server running on http://localhost:3000
🔑 OpenAI: ✅ Configurada
🗄️  Supabase: ✅ Conectada
```

### 7️⃣ ¡Testing! (4 min)

Abre en tu navegador:

1. **Config endpoint:** http://localhost:3000/api/config/demo
   - Deberías ver el JSON de configuración

2. **Widget demo:** http://localhost:3000/demo-shopnow.html
   - Click en el botón de chat
   - Envía un mensaje
   - ¿Responde el bot? ✅

3. **Verificar en Supabase:**
   - Ve a **Table Editor**
   - Abre la tabla `conversations` → Deberías ver tu conversación
   - Abre la tabla `messages` → Deberías ver tus mensajes

**✅ Si todo funciona → ¡MIGRACIÓN EXITOSA!** 🎉

---

## 🎯 ¿Qué sigue?

### Opción A: Deploy a Producción

1. Sube el proyecto a GitHub
2. Conecta con Vercel
3. Configura las variables de entorno
4. Deploy automático

**Guía:** Ver sección "Deploy" en `README.md`

### Opción B: Desarrollar Features

Revisa `TODO.md` para ver qué implementar primero:

- 🔴 **Crítico:** Sistema de billing (Mercado Pago)
- 🟡 **Alta:** Panel de administración
- 🟢 **Media:** Analytics mejorado
- 🔵 **Baja:** Integraciones (Shopify App)

### Opción C: Conseguir Primeros Clientes

1. Actualiza la landing page
2. Documenta 3 casos de éxito
3. Outreach a 50 prospectos
4. Ofrece trial gratis de 14 días

**Guía:** Ver `plan-empresa-chatech.html`

---

## 📚 Documentación por Tema

### Para Desarrollo
- `README.md` - Overview completo del proyecto
- `GUIA-MIGRACION.md` - Migración paso a paso detallada
- `TODO.md` - Backlog de features
- Código está bien comentado en `server.js`

### Para Negocio
- `plan-empresa-chatech.html` - Plan completo de creación de empresa
- `roadmap-producto-chatech.html` - Roadmap de producto 90 días
- `CHANGELOG.md` - Qué cambió en cada versión

### Base de Datos
- `supabase-schema.sql` - Schema completo
- Includes: 6 tablas, functions, triggers, indexes, RLS

### Scripts
- `migrate-to-supabase.js` - Migración de clients.json
- `setup.sh` - Setup automático
- `scraper.js` - Auto-scraper (pendiente implementar)

---

## 🆘 Problemas Comunes

### "Error connecting to Supabase"
✅ Verifica que usaste `service_role` key (no `anon` key)
✅ Revisa que el URL termine en `.supabase.co`
✅ Asegúrate que el proyecto esté activo

### "Cliente no encontrado"
✅ Ejecuta `npm run migrate` nuevamente
✅ Verifica en Supabase Table Editor que existan los clientes
✅ Chequea que el `client_id` sea correcto

### "OpenAI API error"
✅ Verifica que la key empiece con `sk-`
✅ Revisa límites en tu cuenta OpenAI
✅ Asegúrate que tengas créditos

### Widget no carga
✅ Abre la consola del navegador (F12)
✅ Verifica que el server esté corriendo
✅ Revisa CORS en `server.js`

---

## 💬 ¿Necesitas Ayuda?

1. **Lee primero:** `GUIA-MIGRACION.md` (tiene troubleshooting detallado)
2. **Revisa logs:** Console del servidor y navegador
3. **Verifica Supabase:** Ve a Database → Logs
4. **Chequea SQL:** Ejecuta queries en SQL Editor

---

## 🎉 ¡Siguiente Nivel!

Una vez que tienes todo funcionando:

### Semana 1-2: Fundamentos
- [ ] Deploy a producción (Vercel)
- [ ] Actualizar emails de clientes
- [ ] Setup monitoring (Sentry)
- [ ] Configurar backups

### Semana 3-4: Billing
- [ ] Implementar Mercado Pago
- [ ] Sistema de subscripciones
- [ ] Onboarding automatizado
- [ ] Email sequences

### Mes 2: Growth
- [ ] Panel de administración
- [ ] Analytics dashboard
- [ ] Landing page profesional
- [ ] Primeros 10 clientes de pago

---

## 📊 Métricas de Éxito

### Sprint 1 (esta semana)
- ✅ Migración completa a Supabase
- ✅ 0 pérdida de datos
- ✅ Widget funcionando perfectamente
- ✅ Deploy a producción exitoso

### Mes 1
- 🎯 5-10 clientes activos
- 🎯 $350-500 MRR
- 🎯 Sistema de billing funcionando
- 🎯 99% uptime

### Mes 3
- 🎯 20-30 clientes activos
- 🎯 $1,500-2,000 MRR
- 🎯 Panel admin operativo
- 🎯 Break-even operativo

---

## 🚀 ¡Éxitos!

Estás a punto de lanzar algo grande. ChatEch tiene:

- ✅ **Producto validado** (6 clientes funcionando)
- ✅ **Tech sólido** (Supabase + OpenAI)
- ✅ **Mercado enorme** (+70K tiendas en Argentina)
- ✅ **Ventaja competitiva real** (setup 5 min vs 2-3 días)

**Tu ventaja:** 6 años de experiencia en soporte + full-stack skills + visión clara

**Lo que necesitas:** Ejecución enfocada los próximos 90 días

---

**¡A construir!** 💪

Ramiro - ChatEch v2.0
Diciembre 2024
