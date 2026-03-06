-- =============================================
-- ACTUALIZAR PRECIOS Y VERIFICAR DATOS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Actualizar precios del bar (40 colones compra, 100 colones venta)
UPDATE bares 
SET 
    precio_compra = 40,
    precio_venta = 100
WHERE id = '7b2fc122-93fa-4311-aaf9-184f0c111de1';

-- Verificar que el bar está correcto
SELECT id, nombre, creditos_disponibles, precio_compra, precio_venta, activo 
FROM bares 
WHERE id = '7b2fc122-93fa-4311-aaf9-184f0c111de1';
