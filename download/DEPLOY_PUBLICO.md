# 🚀 ROCKOLA SaaS - Guía de Deploy Público GRATUITO

## 📊 ANÁLISIS DE OPCIONES

| Plataforma | ¿Gratuito? | ¿Sin Protección? | ¿Next.js? | Recomendación |
|------------|------------|------------------|-----------|---------------|
| **Vercel (nuevo proyecto)** | ✅ Sí | ✅ Configurable | ✅ Nativo | ⭐⭐⭐⭐⭐ MEJOR OPCIÓN |
| **Cloudflare Pages** | ✅ Sí | ✅ Sí | ✅ Con adaptador | ⭐⭐⭐⭐ Alternativa excelente |
| **Netlify** | ✅ Sí | ✅ Sí | ⚠️ Limitado | ⭐⭐⭐ Buena opción |
| **Render** | ✅ Sí | ✅ Sí | ✅ Sí | ⭐⭐⭐ Pero se duerme |

---

## 🏆 SOLUCIÓN #1: NUEVO PROYECTO EN VERCEL (RECOMENDADO)

### ¿Por qué funciona?
El problema NO es el plan gratuito de Vercel. El problema es que tu proyecto actual tiene activado **"Deployment Protection"** que requiere login. Creando un **NUEVO proyecto**, puedes asegurarte de que esté desactivado desde el inicio.

### 📋 PASO 1: Eliminar el proyecto antiguo en Vercel

1. Ve a [vercel.com](https://vercel.com) y logueate
2. Ve a tu proyecto actual de Rockola
3. Click en **Settings** → **General**
4. Scroll hasta abajo → Click en **Delete Project**
5. Confirma escribiendo el nombre del proyecto

### 📋 PASO 2: Crear NUEVO proyecto SIN protección

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Click en **"Add GitHub Account"** si es necesario
3. Autoriza el acceso a tu repositorio `Saburto2025/mi-rockola-bar`
4. Selecciona el repositorio `mi-rockola-bar`

### 📋 PASO 3: Configurar el proyecto

**Configuración del Framework:**
- Framework Preset: **Next.js** (se detecta automáticamente)
- Root Directory: `./` (por defecto)

### 📋 PASO 4: Agregar Variables de Entorno

Click en **"Environment Variables"** y agrega estas 3 variables:

```
NEXT_PUBLIC_SUPABASE_URL
https://ckrvayovabyojkogklvr.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
sb_publishable_vbYH5Wb7iLshSzAHdQ67dg_yqhJsatC

NEXT_PUBLIC_YOUTUBE_API_KEY
AIzaSyC2JJqbZUDOkjBOzyU3xE6yJFoCJh1a6JY
```

### 📋 PASO 5: DESACTIVAR DEPLOYMENT PROTECTION ⚠️ IMPORTANTE

**ANTES de hacer click en Deploy:**

1. Click en **"Deployment Protection"** en la columna de la izquierda
2. Selecciona **"Standard Protection"** o **"Vercel Authentication Off"**
3. **Asegúrate que diga "Off" o "Standard"**

> 💡 **NOTA:** Si no ves esta opción antes del deploy, puedes configurarla DESPUÉS del primer deploy en Settings → Deployment Protection → Off

### 📋 PASO 6: Deploy

1. Click en **"Deploy"**
2. Espera 2-3 minutos mientras se construye el proyecto
3. ¡Listo! Tu Rockola estará accesible públicamente

### 📋 PASO 7: Verificar que NO hay protección

1. Abre una ventana de incógnito del navegador
2. Visita tu URL de Vercel (ej: `https://mi-rockola-bar.vercel.app`)
3. **NO debe pedir login** - debe mostrar la app directamente

Si todavía pide login:
1. Ve a Settings → Deployment Protection
2. Cambia a **"Off"** o **"Standard"**
3. Haz un nuevo deploy (Settings → Deployments → Redeploy)

---

## 🌐 SOLUCIÓN #2: CLOUDFLARE PAGES (ALTERNATIVA EXCELENTE)

### ¿Por qué Cloudflare?
- 100% GRATUITO y sin límites estrictos
- Sin "Deployment Protection" 
- CDN global súper rápido
- Sin "cold starts"

### 📋 PASO 1: Crear cuenta en Cloudflare

1. Ve a [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Crea una cuenta gratuita con tu email
3. Verifica tu email

### 📋 PASO 2: Conectar GitHub

1. Ve a [pages.cloudflare.com](https://pages.cloudflare.com)
2. Click en **"Connect to Git"**
3. Selecciona **"GitHub"**
4. Autoriza el acceso a `Saburto2025/mi-rockola-bar`

### 📋 PASO 3: Configurar el proyecto

**Configuración:**
- Project name: `mi-rockola-bar`
- Production branch: `main` (o `master`)
- Framework preset: **Next.js (Static HTML Export)** o **Next.js**

> ⚠️ **NOTA:** Para Next.js completo en Cloudflare, necesitas usar el adaptador `@cloudflare/next-on-pages`

### 📋 PASO 4: Variables de entorno

Click en **"Environment Variables"** y agrega:

```
NEXT_PUBLIC_SUPABASE_URL = https://ckrvayovabyojkogklvr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_vbYH5Wb7iLshSzAHdQ67dg_yqhJsatC
NEXT_PUBLIC_YOUTUBE_API_KEY = AIzaSyC2JJqbZUDOkjBOzyU3xE6yJFoCJh1a6JY
```

### 📋 PASO 5: Build settings

```
Build Command: npm run build
Build output directory: .next
```

### 📋 PASO 6: Deploy

1. Click en **"Save and Deploy"**
2. Espera el build (puede tomar 3-5 minutos la primera vez)
3. Tu URL será: `https://mi-rockola-bar.pages.dev`

---

## 🔷 SOLUCIÓN #3: NETLIFY

### 📋 PASO 1: Crear cuenta

1. Ve a [app.netlify.com/signup](https://app.netlify.com/signup)
2. Regístrate con GitHub (más fácil)

### 📋 PASO 2: Importar repositorio

1. Click en **"Add new site"** → **"Import an existing project"**
2. Selecciona **GitHub**
3. Autoriza y selecciona `mi-rockola-bar`

### 📋 PASO 3: Configuración

```
Build command: npm run build
Publish directory: .next
```

### 📋 PASO 4: Variables de entorno

Ve a **Site settings** → **Environment variables** y agrega:

```
NEXT_PUBLIC_SUPABASE_URL = https://ckrvayovabyojkogklvr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_vbYH5Wb7iLshSzAHdQ67dg_yqhJsatC
NEXT_PUBLIC_YOUTUBE_API_KEY = AIzaSyC2JJqbZUDOkjBOzyU3xE6yJFoCJh1a6JY
```

### 📋 PASO 5: Deploy

1. Click en **"Deploy site"**
2. Tu URL será: `https://mi-rockola-bar.netlify.app`

---

## 🔗 URLs FINALES SEGÚN PLATAFORMA

### Si usas Vercel:
- **Super Admin:** `https://tu-proyecto.vercel.app/?modo=superadmin`
- **Admin Bar:** `https://tu-proyecto.vercel.app/?modo=admin`
- **TV:** `https://tu-proyecto.vercel.app/?modo=tv`
- **Cliente:** `https://tu-proyecto.vercel.app/?modo=cliente`

### Si usas Cloudflare:
- **Super Admin:** `https://mi-rockola-bar.pages.dev/?modo=superadmin`
- **Admin Bar:** `https://mi-rockola-bar.pages.dev/?modo=admin`
- **TV:** `https://mi-rockola-bar.pages.dev/?modo=tv`
- **Cliente:** `https://mi-rockola-bar.pages.dev/?modo=cliente`

### Si usas Netlify:
- **Super Admin:** `https://mi-rockola-bar.netlify.app/?modo=superadmin`
- **Admin Bar:** `https://mi-rockola-bar.netlify.app/?modo=admin`
- **TV:** `https://mi-rockola-bar.netlify.app/?modo=tv`
- **Cliente:** `https://mi-rockola-bar.netlify.app/?modo=cliente`

---

## 📱 CREDENCIALES DE ACCESO

| Modo | URL | Clave |
|------|-----|-------|
| Super Admin | `?modo=superadmin` | `rockola2024` |
| Admin Bar | `?modo=admin` | `1234` |
| TV | `?modo=tv` | Sin clave |
| Cliente | `?modo=cliente` | Sin clave |

---

## ❓ PROBLEMAS COMUNES

### "La página queda en blanco"
- Verifica que las 3 variables de entorno estén configuradas correctamente
- Revisa la consola del navegador (F12) para ver errores

### "Error de conexión a Supabase"
- Verifica que la URL de Supabase termine en `.supabase.co`
- Verifica que la API key sea correcta

### "Videos de YouTube no cargan"
- Verifica que la YouTube API Key esté configurada
- La API tiene límites diarios (10,000 consultas/día gratis)

### "Vercel todavía pide login"
1. Ve a tu proyecto en Vercel
2. Settings → Deployment Protection
3. Selecciona **"Off"**
4. Redeploy el proyecto

---

## 🎯 RECOMENDACIÓN FINAL

**Usa la SOLUCIÓN #1 (Nuevo proyecto Vercel)** porque:
- ✅ Es la más fácil
- ✅ Next.js está optimizado para Vercel
- ✅ Hot reloading en PRs
- ✅ Analytics gratis
- ✅ Solo necesitas asegurarte de desactivar Deployment Protection

**Si Vercel no funciona**, usa **Cloudflare Pages** como alternativa.
