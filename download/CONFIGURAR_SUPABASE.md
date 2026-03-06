# 🚀 ROCKOLA SaaS - Guía de Configuración Supabase

## Tu aplicación ya está conectada a Supabase, pero necesitas crear las tablas.

### PASO 1: Ir a Supabase
1. Abre tu navegador y ve a: **https://supabase.com/dashboard**
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto: **ckrvayovabyojkogklvr**

### PASO 2: Abrir el Editor SQL
1. En el menú lateral izquierdo, haz clic en **"SQL Editor"**
2. Haz clic en **"New query"** para crear una nueva consulta

### PASO 3: Ejecutar el Script de Configuración
1. Abre el archivo `supabase_setup.sql` que está en la carpeta `download`
2. **Copia TODO el contenido** del archivo
3. **Pégalo** en el editor SQL de Supabase
4. Haz clic en **"Run"** o presiona `Ctrl + Enter`

### PASO 4: Habilitar Realtime (Importante para sincronización)
1. Ve a **"Database"** → **"Replication"** en el menú lateral
2. Busca la sección **"Supabase Realtime"**
3. Haz clic en **"Add tables"**
4. Agrega estas tablas:
   - `bares`
   - `instancias_rockola`
   - `canciones_cola`
   - `transacciones`
   - `clientes`

### PASO 5: Verificar que Funciona
1. Abre la aplicación en tu navegador
2. Deberías ver el indicador **"Supabase Conectado"** en verde
3. Si ves un error, revisa que las tablas se crearon correctamente

---

## 🎯 Modos de Uso

### 📺 MODO TV
- Para la pantalla principal del bar
- Muestra el reproductor de YouTube
- Reproduce las canciones aprobadas

### 👑 ADMIN BAR (Clave: 1234)
- Para el dueño del bar
- Vender créditos a clientes
- Aprobar/rechazar canciones
- Ver reportes

### 🍻 CLIENTE
- Para los clientes del bar
- Comprar créditos
- Solicitar canciones

### 🏢 SUPER ADMIN (Clave: rockola2024)
- Para el dueño del software SaaS
- Vender créditos a los bares
- Configurar precios
- Ver todas las transacciones

---

## 📱 Cómo usar el QR

1. En el Modo TV, verás un código QR
2. Los clientes escanean el QR con su celular
3. Se abre automáticamente el Modo Cliente
4. Pueden buscar y solicitar canciones

---

## 🔧 Datos de tu Bar

- **ID del Bar:** `7b2fc122-93fa-4311-aaf9-184f0c111de1`
- **Nombre:** Bar 2 de Enero
- **Créditos iniciales:** 100

---

## ❓ Problemas Comunes

### "Error de Conexión"
- Verifica que las tablas se crearon en Supabase
- Asegúrate de que las políticas RLS estén activadas

### "No se guardan las canciones"
- Verifica que la tabla `canciones_cola` existe
- Revisa la consola del navegador para ver errores

### "El QR no funciona"
- Asegúrate de que el servidor esté corriendo
- El QR apunta a la URL actual del servidor

---

## 📞 Soporte

Si tienes problemas, revisa:
1. La consola del navegador (F12 → Console)
2. Los logs de Supabase (Logs → API logs)
3. Que las credenciales en `.env.local` sean correctas
