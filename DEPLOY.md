# 🚀 Guía de Deploy a Producción

## Opción 1: Vercel (Recomendado)

### Paso 1: Preparar Supabase

1. **Crear proyecto en Supabase**
   - Ve a https://supabase.com y crea una cuenta
   - Crea un nuevo proyecto (nombre: `chatech-prod`)
   - Espera ~2 minutos a que se inicialice

2. **Ejecutar el schema**
   - En Supabase Dashboard → SQL Editor
   - Copia y pega todo el contenido de `supabase-schema.sql`
   - Click en "Run"
   - Deberías ver: "Success. No rows returned"

3. **Obtener credenciales**
   - Ve a Settings → API
   - Copia:
     - `Project URL` → será tu `SUPABASE_URL`
     - `service_role` key (NO la anon key) → será tu `SUPABASE_SERVICE_KEY`

### Paso 2: Deploy a Vercel

1. **Subir a GitHub**
   ```bash
   git init
   git add .
   git commit -m "ChatEch v2.0 - Ready for production"
   git remote add origin https://github.com/tu-usuario/chatech-widget.git
   git push -u origin main
   ```

2. **Conectar con Vercel**
   - Ve a https://vercel.com
   - "Add New Project"
   - Importa tu repositorio de GitHub
   - Selecciona el repo `chatech-widget`

3. **Configurar variables de entorno**
   En Vercel → Project Settings → Environment Variables:
   
   | Variable | Valor |
   |----------|-------|
   | `OPENAI_API_KEY` | sk-tu-key-de-openai |
   | `SUPABASE_URL` | https://xxx.supabase.co |
   | `SUPABASE_SERVICE_KEY` | eyJhbGc... |
   | `NODE_ENV` | production |

4. **Deploy**
   - Click "Deploy"
   - Espera ~1-2 minutos
   - Tu app estará en: `https://tu-proyecto.vercel.app`

### Paso 3: Migrar datos iniciales

1. Crea un archivo `.env` local con tus credenciales de producción
2. Ejecuta:
   ```bash
   npm run migrate
   ```
3. Verifica en Supabase Dashboard → Table Editor → clients

### Paso 4: Verificar funcionamiento

1. **Health check:**
   ```
   https://tu-proyecto.vercel.app/api/health
   ```
   Debe retornar: `{"status":"healthy",...}`

2. **Probar widget:**
   ```
   https://tu-proyecto.vercel.app/demo-shopnow.html
   ```

---

## Opción 2: Railway

1. Ve a https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Configura las mismas variables de entorno
4. Railway detectará automáticamente que es Node.js

---

## Checklist Pre-Launch

- [ ] Supabase proyecto creado
- [ ] Schema SQL ejecutado
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy exitoso (sin errores en logs)
- [ ] Health check retorna "healthy"
- [ ] Migración de clientes completada
- [ ] Widget carga correctamente en demo
- [ ] Chat funciona (prueba enviar mensaje)
- [ ] Dominio personalizado configurado (opcional)

---

## Troubleshooting

### "Cliente no encontrado"
- Verifica que ejecutaste la migración
- Revisa en Supabase que el cliente existe con `status = 'active'`

### "Error de OpenAI"
- Verifica que `OPENAI_API_KEY` está configurada en Vercel
- Revisa que la key tiene créditos disponibles

### "Widget no carga"
- Abre DevTools (F12) → Console
- Verifica que no hay errores de CORS
- Asegúrate que la URL del API es correcta

### "500 Internal Server Error"
- Ve a Vercel Dashboard → Deployments → Ver logs
- Busca el error específico
