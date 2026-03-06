# 🎵 ROCKOLA SaaS - Guía de Instalación Profesional

## 📋 PASO 1: Configurar Tablas en Supabase

1. Abre tu cuenta de Supabase: https://supabase.com
2. Ve a tu proyecto: `ckrvayovabyojkogklvr`
3. Click en **SQL Editor** en el menú izquierdo
4. Click en **New Query**
5. Copia y pega TODO el contenido del archivo `supabase_setup.sql`
6. Click en **Run** (botón verde)

---

## 📋 PASO 2: Habilitar Realtime

1. En Supabase, ve a **Database** → **Replication**
2. Busca la sección **Supabase Realtime**
3. Agrega estas tablas:
   - ✅ bares
   - ✅ instancias_rockola
   - ✅ canciones_cola
   - ✅ transacciones

---

## 📋 PASO 3: Verificar Variables de Entorno

Tu archivo `.env.local` ya tiene:

```
NEXT_PUBLIC_SUPABASE_URL=https://ckrvayovabyojkogklvr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_vbYH5Wb7iLshSzAHdQ67dg_yqhJsatC
NEXT_PUBLIC_YOUTUBE_API_KEY=AIzaSyC2JJqbZUDOkjBOzyU3xE6yJFoCJh1a6JY
```

---

## 📋 PASO 4: Reiniciar el Servidor

El servidor se reiniciará automáticamente para cargar los cambios.

---

## 🌐 PASO 5: Publicar en Internet (Vercel)

### Opción A: Desde Vercel CLI
```bash
npm i -g vercel
vercel
```

### Opción B: Desde GitHub
1. Sube el código a GitHub
2. Ve a vercel.com
3. Click en "New Project"
4. Conecta tu repositorio
5. Agrega las variables de entorno
6. Click en "Deploy"

---

## 📱 CÓMO USAR LA ROCKOLA

### 1. Super Admin (TÚ - Dueño del Software)
- URL: `tu-app.vercel.app/?modo=superadmin`
- Clave: `rockola2024`
- Funciones:
  - Vender créditos a los bares
  - Configurar precios
  - Ver ingresos totales

### 2. Admin Bar (Dueño del Bar)
- URL: `tu-app.vercel.app/?modo=admin`
- Clave: `1234`
- Funciones:
  - Vender créditos a clientes
  - Aprobar canciones
  - Ver reportes

### 3. TV (Pantalla del Bar)
- URL: `tu-app.vercel.app/?modo=tv`
- Sin clave
- Funciones:
  - Reproduce las canciones
  - Muestra QR para clientes

### 4. Cliente (Personas en el Bar)
- URL: `tu-app.vercel.app/?modo=cliente`
- Sin clave
- Funciones:
  - Buscar canciones
  - Pedir música con créditos

---

## 💰 FLUJO DE CRÉDITOS

```
Super Admin                    Admin Bar                    Cliente
    │                             │                            │
    │  Vende 100 créditos         │                            │
    │  a $1 c/u = $100            │                            │
    ├────────────────────────────►│                            │
    │                             │                            │
    │                             │  Vende 5 créditos          │
    │                             │  a $2 c/u = $10            │
    │                             ├───────────────────────────►│
    │                             │                            │
    │                             │                            │ Pide canción
    │                             │                            │ (-2 créditos)
    │                             │                            │
    ▼                             ▼                            ▼
$100 ingreso                  $10 venta                   $2 por canción
                              $5 costo real                (costo: $1)
                              $5 ganancia                  (ganancia: $1)
```

---

## 📊 REPORTES DISPONIBLES

El Excel generado contiene 4 hojas:

1. **Resumen**
   - Compras totales
   - Ventas totales
   - Ganancia neta
   - Precios configurados

2. **Transacciones**
   - Fecha y hora
   - Tipo (compra/venta/consumo)
   - Cantidad y total
   - Cliente

3. **Análisis**
   - Desglose por tipo
   - Totales agrupados

4. **Top Clientes**
   - Ranking de los 20 mejores clientes
   - Total gastado por cada uno

---

## ❓ SOPORTE

Si tienes problemas:
1. Verifica que las tablas estén creadas en Supabase
2. Verifica que Realtime esté habilitado
3. Verifica las variables de entorno en Vercel
4. Revisa la consola del navegador para errores
