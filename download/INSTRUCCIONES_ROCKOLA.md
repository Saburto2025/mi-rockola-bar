# 🎵 ROCKOLA - Instrucciones de Actualización

## Problemas Corregidos

1. **Error "invalid input syntax for type uuid: 'ID'"**: Ahora el código valida que el ID sea un UUID válido antes de consultar la base de datos. Si el ID no es válido, muestra un mensaje de error claro.

2. **Pantalla TV sin QR**: La pantalla de TV ya no muestra código QR, solo el logo y "Esperando canciones..."

3. **Botón Agregar Verde**: La pantalla del cliente tiene botones verdes "Agregar" en lugar de check marks.

4. **Búsqueda persistente**: Los resultados de búsqueda no se borran después de agregar una canción.

5. **Sin parpadeo en Admin**: Usar `isRefresh` para evitar parpadeo al recargar datos.

## Archivos para Actualizar

1. **page.tsx** → Copiar a `/src/app/page.tsx`
2. **supabase.ts** → Copiar a `/src/lib/supabase.ts`

## URLs Correctas

Tu aplicación está desplegada en: **https://rockola-hhag.onrender.com**

### URLS por Modo:

| Modo | URL |
|------|-----|
| Super Admin | `https://rockola-hhag.onrender.com/?modo=superadmin` |
| Admin Bar | `https://rockola-hhag.onrender.com/?bar=UUID_DEL_BAR&modo=admin` |
| Cliente | `https://rockola-hhag.onrender.com/?bar=UUID_DEL_BAR&modo=cliente` |
| TV | `https://rockola-hhag.onrender.com/?bar=UUID_DEL_BAR` |

**IMPORTANTE**: Reemplaza `UUID_DEL_BAR` con el ID real del bar (ej: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

## Claves de Acceso

- **Clave Admin de Bar**: `1234`
- **Clave Super Admin**: `rockola2024`

## SQL para Supabase (si no lo has ejecutado)

```sql
ALTER TABLE bares ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE bares ADD COLUMN IF NOT EXISTS correo TEXT;
ALTER TABLE bares ADD COLUMN IF NOT EXISTS clave_admin TEXT DEFAULT '1234';
```

## Pasos para Actualizar en Render

1. Ve a tu repositorio de GitHub donde está el código de Rockola
2. Actualiza los archivos `src/app/page.tsx` y `src/lib/supabase.ts`
3. Render detectará los cambios y redesplegará automáticamente
4. Espera 2-3 minutos a que termine el deploy

## Cómo Obtener el UUID de un Bar

1. Entra a Super Admin: `https://rockola-hhag.onrender.com/?modo=superadmin`
2. Crea un nuevo bar o usa uno existente
3. Al crear un bar, se mostrará un modal con los links completos (incluyendo el UUID)
4. Copia esos links para usar en cada pantalla

## Troubleshooting

### Error "invalid input syntax for type uuid: 'ID'"
- Significa que estás usando una URL con "ID" como placeholder
- Usa el link real que se genera al crear el bar en Super Admin

### Pantalla de carga infinita
- Verifica que las variables de entorno en Render estén configuradas:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_YOUTUBE_API_KEY`

### La TV no reproduce videos
- Asegúrate de que el modo TV tenga el parámetro `?bar=UUID` en la URL
- Los videos deben estar "aprobados" desde el panel Admin
