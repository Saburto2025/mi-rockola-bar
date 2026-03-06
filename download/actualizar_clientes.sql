-- =============================================
-- ACTUALIZAR TABLA CLIENTES Y POLÍTICAS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Agregar políticas RLS para la tabla clientes
CREATE POLICY "Allow all for anon" ON clientes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Verificar estructura
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clientes';
