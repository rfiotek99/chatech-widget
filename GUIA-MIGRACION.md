# 🚀 Guía de Migración a Supabase - ChatEch

## 📋 Resumen
Esta guía te llevará paso a paso para migrar ChatEch de `clients.json` + memoria a Supabase PostgreSQL.

**Duración estimada:** 2-3 horas
**Nivel:** Intermedio

---

## ✅ Pre-requisitos

Antes de empezar, asegúrate de tener:
- [ ] Node.js v18+ instalado
- [ ] Cuenta de Supabase (gratis en supabase.com)
- [ ] OpenAI API key activa
- [ ] Backup de tu `clients.json` actual

---

## 📝 Paso 1: Crear Proyecto en Supabase (15 min)

### 1.1 Crear cuenta y proyecto
1. Ve a https://supabase.com
2. Click en "Start your project"
3. Crea una cuenta (GitHub OAuth recomendado)
4. Click en "New Project"
   - **Name:** chatech-production
   - **Database Password:** Genera una contraseña segura (¡guárdala!)
   - **Region:** Elige la más cercana (South America - São Paulo recomendado)
   - **Pricing Plan:** Free (suficiente para empezar)
5. Click "Create new project"
6. **Espera 2-3 minutos** mientras Supabase crea tu base de datos

### 1.2 Obtener credenciales
Una vez creado el proyecto:

1. En el dashboard de Supabase, ve a **Settings** → **API**
2. Copia estos valores (los necesitarás):
   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon public key: eyJhbGc... (clave pública)
   service_role key: eyJhbGc... (clave privada - ¡NUNCA la compartas!)
   ```

**⚠️ IMPORTANTE:** La `service_role` key tiene permisos de administrador. Nunca la expongas en el frontend o en GitHub.

---

## 📝 Paso 2: Ejecutar Schema SQL (10 min)

### 2.1 Abrir SQL Editor
1. En tu proyecto de Supabase, ve a **SQL Editor** (icono </> en el menú izquierdo)
2. Click en "+ New query"

### 2.2 Ejecutar el schema
1. Abre el archivo `supabase-schema.sql`
2. Copia **TODO** el contenido (son ~350 líneas)
3. Pégalo en el SQL Editor de Supabase
4. Click en **RUN** (abajo a la derecha)
5. Deberías ver: `Success. No rows returned`

### 2.3 Verificar que se creó todo
Ejecuta este query para verificar:
```sql
-- Ver todas las tablas creadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Deberías ver: clients, conversations, messages, catalog_items, subscriptions, admins
```

Si ves las 6 tablas, ¡perfecto! 🎉

---

## 📝 Paso 3: Configurar Variables de Entorno (5 min)

### 3.1 Crear archivo .env
En la raíz de tu proyecto:

```bash
# Copia el .env.example
cp .env.example .env
```

### 3.2 Completar las variables
Edita `.env` con tus credenciales:

```env
# OpenAI (ya la tienes)
OPENAI_API_KEY=sk-tu-key-actual

# Supabase (del Paso 1.2)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (service_role key)

# Resto por ahora puede quedar comentado
PORT=3000
```

**⚠️ Verificación:** 
- ¿Copiaste el `service_role` key (NO el `anon` key)?
- ¿El URL termina en `.supabase.co`?

---

## 📝 Paso 4: Instalar Dependencias (2 min)

```bash
# Instalar/actualizar dependencias
npm install

# Específicamente Supabase
npm install @supabase/supabase-js
```

Deberías ver en tu `package.json`:
```json
"@supabase/supabase-js": "^2.39.0"
```

---

## 📝 Paso 5: Ejecutar Migración de Datos (10 min)

### 5.1 Backup de clients.json
```bash
# Hacer backup por las dudas
cp clients.json clients.json.backup
```

### 5.2 Ejecutar script de migración
```bash
node migrate-to-supabase.js
```

**Output esperado:**
```
🚀 Starting migration from clients.json to Supabase...

📋 Found 6 clients to migrate

⏳ Migrating: demo (Tienda Demo)...
✅ Migrated: demo → abc-123-def

⏳ Migrating: shopnow (ShopNow)...
✅ Migrated: shopnow → xyz-456-ghi

...

==================================================
📊 MIGRATION SUMMARY
==================================================
✅ Successfully migrated: 6
❌ Failed: 0
📝 Total clients: 6

✅ Found 6 clients in database:
┌─────────┬────────────┬──────────────────────────┬────────┬──────────────┐
│ (index) │ client_id  │ name                     │ status │ plan         │
├─────────┼────────────┼──────────────────────────┼────────┼──────────────┤
│ 0       │ 'demo'     │ 'Tienda Demo'            │'active'│'professional'│
│ 1       │ 'shopnow'  │ 'ShopNow'                │'active'│'professional'│
...
└─────────┴────────────┴──────────────────────────┴────────┴──────────────┘

🎉 Migration complete!
```

### 5.3 Verificar en Supabase Dashboard
1. Ve a **Table Editor** en Supabase
2. Abre la tabla `clients`
3. Deberías ver tus 6 clientes migrados

**⚠️ Si hubo errores:**
- Revisa que las credenciales en `.env` sean correctas
- Verifica que ejecutaste el schema completo
- Mira los logs para ver qué falló

---

## 📝 Paso 6: Reemplazar server.js (5 min)

### 6.1 Backup del server actual
```bash
# Guardar el server viejo
mv server.js server-old-backup.js
```

### 6.2 Usar el nuevo server
```bash
# Copiar el nuevo server con Supabase
cp server-supabase.js server.js
```

### 6.3 Revisar el nuevo código
Abre `server.js` y verifica que se ve así al inicio:

```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
```

---

## 📝 Paso 7: Testing (15 min)

### 7.1 Iniciar el servidor
```bash
npm start
```

**Output esperado:**
```
🔌 Connecting to Supabase...
   URL: https://xxxxx.supabase.co
   Key: ✅ Configured

==================================================
🚀 ChatEch Widget API
==================================================
📡 Server running on http://localhost:3000
🔑 OpenAI: ✅ Configurada
🗄️  Supabase: ✅ Conectada
==================================================

⏰ Auto-scraper: Activo (cada 24 horas)
```

### 7.2 Test 1: Endpoint de config
Abre en tu navegador:
```
http://localhost:3000/api/config/demo
```

Deberías ver el JSON de configuración del cliente demo.

### 7.3 Test 2: Widget en demo
Abre:
```
http://localhost:3000/demo-shopnow.html
```

- ¿Se carga el widget?
- ¿Puedes abrir el chat?
- ¿Responde el bot?

### 7.4 Test 3: Verificar que se guardó en DB
Después de enviar un mensaje, ve a Supabase → Table Editor:

1. Tabla `conversations`: Debería haber una nueva conversación
2. Tabla `messages`: Deberían estar tus mensajes
3. Tabla `clients`: El campo `total_conversations` debería haber aumentado

**✅ Si todo funciona:** ¡Migración exitosa! 🎉

---

## 📝 Paso 8: Deploy a Producción (20 min)

### 8.1 Actualizar variables en Vercel

Si usas Vercel:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGc...
   ```
4. Redeploy el proyecto

### 8.2 Verificar en producción
```bash
# Test en producción
curl https://tu-app.vercel.app/api/config/demo
```

### 8.3 Actualizar widgets en producción
Si tienes clientes activos, **NO NECESITAS CAMBIAR NADA** en los snippets. El widget sigue funcionando igual, solo cambió el backend.

---

## 📝 Paso 9: Limpieza (5 min)

Una vez que TODO funcione perfectamente por 24-48 horas:

### 9.1 Eliminar archivos viejos
```bash
# Ya no necesitas clients.json (pero guarda el backup)
# mv clients.json clients.json.archived

# Opcional: eliminar el server viejo
# rm server-old-backup.js
```

### 9.2 Actualizar .gitignore
Asegúrate de que `.env` esté en `.gitignore`:

```
# .gitignore
.env
.env.local
clients.json.backup
```

---

## 🎉 ¡Migración Completa!

### ✅ Lo que lograste:
- [x] Base de datos PostgreSQL en Supabase
- [x] Todos los clientes migrados
- [x] Tracking de conversaciones y mensajes
- [x] Analytics listos para implementar
- [x] Sistema escalable para miles de conversaciones

### 🚀 Próximos Pasos:
1. **Implementar Analytics Dashboard** (Sprint 3)
2. **Setup de Billing con Mercado Pago** (Sprint 2)
3. **Panel de Administración** (Sprint 4)

---

## 🆘 Troubleshooting

### Error: "Error connecting to Supabase"
- Verifica que `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` estén correctos
- Asegúrate de usar `service_role` key, no `anon` key
- Revisa que el proyecto de Supabase esté activo

### Error: "Cliente no encontrado"
- Ejecuta la migración nuevamente: `node migrate-to-supabase.js`
- Verifica en Table Editor que los clientes existan
- Revisa que el `client_id` coincida exactamente

### Error: "OPENAI_API_KEY no configurada"
- Verifica que `.env` tenga la key de OpenAI
- Reinicia el servidor después de modificar `.env`

### El widget no carga
- Revisa la consola del navegador (F12)
- Verifica que el server esté corriendo
- Asegúrate que el `data-client` coincida con un `client_id` en la DB

### Performance lento
- Supabase free tier tiene límites
- Para producción, considera upgrade a Pro ($25/mes)
- Verifica que los indexes estén creados (deberían estar del schema)

---

## 📞 Soporte

Si algo no funciona:
1. Revisa los logs del servidor
2. Chequea los logs de Supabase (Database → Logs)
3. Verifica que todas las tablas existan
4. Asegúrate que la migración fue 100% exitosa

---

**¡Éxitos con la migración!** 🚀

Ramiro - ChatEch
