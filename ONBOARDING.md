# 📋 Checklist de Onboarding - Nuevo Cliente ChatEch

## Información a Recolectar del Cliente

### 1. Datos Básicos
- [ ] Nombre de la tienda/empresa
- [ ] Email de contacto
- [ ] Teléfono/WhatsApp
- [ ] URL del sitio web (si tiene)
- [ ] Plataforma: Shopify / Tienda Nube / WooCommerce / Instagram / Otro

### 2. Personalización Visual
- [ ] Color principal (hex o referencia de marca)
- [ ] Color secundario (opcional)
- [ ] Logo: ¿Emoji o imagen?
  - Si imagen: pedir archivo PNG/JPG (preferible cuadrado, min 100x100px)

### 3. Configuración del Bot

**Mensaje de bienvenida:**
```
Ejemplo: "¡Hola! 👋 Soy el asistente de [TIENDA]. ¿En qué puedo ayudarte?"
```

**Información del negocio:**
- [ ] Horarios de atención
- [ ] Política de envíos (zonas, costos, tiempos)
- [ ] Política de cambios/devoluciones
- [ ] Medios de pago aceptados

**Catálogo (opcional pero recomendado):**
- [ ] Lista de productos principales con precios
- [ ] Categorías de productos
- [ ] Información de stock

### 4. Tono y Personalidad
- [ ] ¿Formal o informal?
- [ ] ¿Usa emojis?
- [ ] ¿Tiene jerga o términos específicos?

---

## Proceso de Setup (Admin)

### Paso 1: Crear cliente en Supabase

Ir a Supabase Dashboard → SQL Editor y ejecutar:

```sql
INSERT INTO clients (
  client_id,
  name,
  email,
  primary_color,
  secondary_color,
  logo,
  logo_type,
  welcome_message,
  system_prompt,
  hours,
  shipping,
  returns,
  payments,
  status,
  plan,
  trial_ends_at
) VALUES (
  'mi-tienda',
  'Mi Tienda',
  'cliente@email.com',
  '#FF6B9D',
  '#C44569',
  '👗',
  'emoji',
  '¡Hola! 👋 Soy el asistente de Mi Tienda. ¿En qué puedo ayudarte?',
  'Eres el asistente virtual de Mi Tienda, una tienda de ropa femenina...',
  'Lun-Vie 9am-6pm',
  'Envío gratis en CABA',
  '30 días para cambios',
  'Mercado Pago, tarjetas',
  'active',
  'professional',
  NOW() + INTERVAL '14 days'
);
```

### Paso 2: Generar snippet para el cliente

```html
<!-- ChatEch Widget -->
<script 
  src="https://TU-APP.vercel.app/widget.js" 
  data-client="mi-tienda">
</script>
```

### Paso 3: Enviar instrucciones al cliente

**Email/WhatsApp template:**

```
¡Hola [NOMBRE]!

Tu asistente ChatEch ya está listo. Para instalarlo:

1. Copiá este código:
[SNIPPET]

2. Pegalo justo antes de </body> en tu sitio web

3. ¡Listo! Ya deberías ver el botón de chat

Si usás Shopify: Configuración → Checkout → Scripts adicionales
Si usás Tienda Nube: Configuración → Códigos externos

¿Dudas? Respondé este mensaje.
```

### Paso 4: Verificar instalación

1. Visitar el sitio del cliente
2. Verificar que aparece el botón de chat
3. Enviar mensaje de prueba
4. Confirmar que responde correctamente

---

## Template de System Prompt

```
Eres el asistente virtual de [NOMBRE TIENDA], [DESCRIPCIÓN BREVE].

PRODUCTOS QUE VENDEMOS:
[Lista de categorías o productos]

INFORMACIÓN IMPORTANTE:
- Horarios: [HORARIOS]
- Envíos: [POLÍTICA DE ENVÍOS]
- Pagos: [MEDIOS DE PAGO]
- Cambios: [POLÍTICA DE CAMBIOS]

CÓMO ATENDER:
- Sé amable y servicial
- Si no sabés algo, decí que vas a consultar
- Siempre intentá cerrar la venta o dar el siguiente paso
- [INSTRUCCIONES ESPECÍFICAS]

TONO: [Amigable/Formal/etc]
```

---

## Checklist Post-Instalación

- [ ] Widget aparece correctamente
- [ ] Colores coinciden con la marca
- [ ] Mensaje de bienvenida es correcto
- [ ] Bot responde preguntas de prueba
- [ ] Cliente confirmó que funciona
- [ ] Agendar seguimiento en 7 días
