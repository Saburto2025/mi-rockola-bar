-- =============================================
-- SCRIPT PARA CORREGIR RLS Y VERIFICAR DATOS
-- Ejecuta esto en Supabase SQL Editor
-- =============================================

-- 1. Verificar si las tablas existen y tienen datos
SELECT 'bares' as tabla, COUNT(*) as registros FROM bares
UNION ALL
SELECT 'canciones_cola', COUNT(*) FROM canciones_cola
UNION ALL
SELECT 'transacciones', COUNT(*) FROM transacciones;

-- 2. Ver el bar que debería existir
SELECT * FROM bares WHERE id = '7b2fc122-93fa-4311-aaf9-184f0c111de1';

-- 3. Si el bar NO existe, créalo:
INSERT INTO bares (id, nombre, creditos_disponibles, precio_compra, precio_venta, activo)
VALUES (
    '7b2fc122-93fa-4311-aaf9-184f0c111de1',
    'Bar 2 de Enero',
    100,
    1.00,
    2.00,
    true
) ON CONFLICT (id) DO UPDATE SET 
    nombre = 'Bar 2 de Enero',
    creditos_disponibles = 100,
    precio_compra = 1.00,
    precio_venta = 2.00,
    activo = true;

-- 4. ELIMINAR Y RECREAR POLÍTICAS RLS (para asegurar que funcionen)
-- Primero eliminar las políticas existentes
DROP POLICY IF EXISTS "Permitir lectura bares" ON bares;
DROP POLICY IF EXISTS "Permitir escritura bares" ON bares;
DROP POLICY IF EXISTS "Permitir lectura instancias" ON instancias_rockola;
DROP POLICY IF EXISTS "Permitir escritura instancias" ON instancias_rockola;
DROP POLICY IF EXISTS "Permitir lectura canciones" ON canciones_cola;
DROP POLICY IF EXISTS "Permitir escritura canciones" ON canciones_cola;
DROP POLICY IF EXISTS "Permitir lectura transacciones" ON transacciones;
DROP POLICY IF EXISTS "Permitir escritura transacciones" ON transacciones;
DROP POLICY IF EXISTS "Permitir lectura clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir escritura clientes" ON clientes;

-- Crear políticas PERMITIR TODO para anon y authenticated
CREATE POLICY "Allow all for anon" ON bares FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON bares FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON canciones_cola FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON canciones_cola FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON transacciones FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON transacciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON instancias_rockola FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON instancias_rockola FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON clientes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Verificar que RLS está habilitado pero permite acceso
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('bares', 'canciones_cola', 'transacciones', 'clientes', 'instancias_rockola');

-- 6. Verificar las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('bares', 'canciones_cola', 'transacciones', 'clientes', 'instancias_rockola');
