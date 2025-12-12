# Changelog - ChatEch

Todas las cambios notables del proyecto serán documentados aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [2.0.0] - 2024-12-10

### 🎉 Release Mayor - Migración a Supabase

Esta versión marca una reescritura completa del backend para usar Supabase PostgreSQL en lugar de almacenamiento en memoria y archivos JSON.

### ✨ Agregado

- **Backend Supabase completo**
  - Schema SQL con 6 tablas (clients, conversations, messages, catalog_items, subscriptions, admins)
  - Funciones y triggers automáticos
  - Row Level Security (RLS) configurado
  - Indexes optimizados para performance

- **Tracking completo de conversaciones**
  - Guardado persistente de todas las conversaciones
  - Historial de mensajes ilimitado
  - Métricas de engagement (duración, mensajes por sesión)
  - Tracking de contexto (user agent, IP, página)

- **Sistema de analytics**
  - Endpoint `/api/dashboard/:clientId/analytics`
  - Métricas diarias, mensuales y trending
  - Cálculo de costos por cliente
  - Estadísticas de performance (tiempo de respuesta)

- **Gestión de clientes mejorada**
  - Base de datos relacional vs JSON plano
  - Campos adicionales: platform, subscription info
  - Soporte para integración Shopify/WooCommerce

- **Admin endpoints protegidos**
  - GET/PUT endpoints para gestión de clientes
  - Middleware de autenticación
  - Preparado para panel de administración

- **Scripts de utilidad**
  - `migrate-to-supabase.js` - Migración automática de datos
  - `setup.sh` - Script de configuración inicial
  - Comandos npm mejorados

- **Documentación completa**
  - README.md exhaustivo
  - GUIA-MIGRACION.md paso a paso
  - Comentarios inline en el código

### 🔄 Cambiado

- **Server.js completamente refactorizado**
  - Uso de Supabase client en lugar de fs.readFileSync
  - Endpoints actualizados para usar queries SQL
  - Mejor manejo de errores
  - Logging mejorado

- **Endpoint /api/chat mejorado**
  - Ahora guarda en DB en lugar de Map en memoria
  - Tracking de tokens usados y costos
  - Medición de response time
  - Actualización automática de stats del cliente

- **Endpoint /api/config optimizado**
  - Query directo a Supabase
  - Caché a nivel de DB
  - Validación de status del cliente

- **package.json actualizado**
  - Dependencia `@supabase/supabase-js` agregada
  - Scripts npm mejorados
  - Versión bumpeada a 2.0.0

### 🗑️ Removido

- **Dependencia de clients.json** (ahora legacy)
  - La configuración se lee de DB
  - Archivo mantenido solo para migración

- **Map en memoria para conversaciones**
  - Reemplazado por tabla `conversations` en Supabase
  - Ya no se pierden datos en redeploy

### 🔒 Seguridad

- Implementación de Row Level Security en Supabase
- Service role key separada de anon key
- Variables de entorno más seguras
- Admin endpoints requieren autenticación

### 📈 Performance

- Queries optimizadas con indexes
- Conexión pooling de Supabase
- Reducción de lecturas de disco (no más fs.readFileSync en cada request)
- Mejor escalabilidad (DB vs memoria)

### 🐛 Bugs Corregidos

- ❌ Pérdida de conversaciones en redeploy (ahora persistente)
- ❌ Límite de memoria con muchas conversaciones (ahora en DB)
- ❌ Race conditions en lectura de clients.json
- ❌ Falta de métricas y tracking

### 📊 Métricas de Migración

- 6 tablas creadas
- 15+ funciones y triggers
- 20+ endpoints actualizados
- 0 breaking changes en el widget (100% compatible)

---

## [1.0.0] - 2024-12-05

### ✨ Release Inicial

Primera versión funcional de ChatEch con funcionalidades core.

### Agregado

- Widget embebible JavaScript vanilla
- Backend Node.js + Express
- Integración OpenAI GPT-4o-mini
- Sistema multi-tenant con clients.json
- Personalización visual (colores, logo, mensajes)
- Memoria conversacional por sesión (en memoria)
- Auto-scraper de catálogos cada 24h
- 6 clientes de ejemplo funcionando
- Deploy en Vercel

### Features Core

- ✅ Chat en tiempo real
- ✅ Configuración por cliente
- ✅ System prompts personalizados
- ✅ Scraping de productos
- ✅ Responsive design
- ✅ Fácil integración (snippet)

---

## Notas de Migración

### De v1.0 a v2.0

**Guía completa:** Ver `GUIA-MIGRACION.md`

**Resumen:**
1. Crear proyecto Supabase
2. Ejecutar `supabase-schema.sql`
3. Configurar variables de entorno
4. Ejecutar `npm run migrate`
5. Reemplazar `server.js`
6. Testing y deploy

**Tiempo estimado:** 2-3 horas

**Breaking changes:** Ninguno para el widget, solo backend

**Rollback:** Mantén backup de `clients.json` y `server-old.js`

---

## Roadmap Futuro

### [2.1.0] - Planeado para Q1 2025

- [ ] Panel de administración web
- [ ] Dashboard de cliente mejorado con gráficos
- [ ] Export de conversaciones a CSV
- [ ] Filtros avanzados en analytics

### [2.2.0] - Planeado para Q1 2025

- [ ] Sistema de billing (Mercado Pago + Stripe)
- [ ] Subscripciones automatizadas
- [ ] Webhooks para pagos
- [ ] Onboarding self-service

### [2.3.0] - Planeado para Q2 2025

- [ ] Shopify App oficial
- [ ] WooCommerce Plugin
- [ ] Auto-sync de productos
- [ ] Instalación 1-click

### [3.0.0] - Futuro

- [ ] Multi-idioma
- [ ] Voice mode
- [ ] Sentiment analysis
- [ ] A/B testing de prompts
- [ ] Integraciones Zapier/Make

---

**Mantenido por:** Ramiro Fernández / RF Analytics
**Última actualización:** 10 de Diciembre, 2024
