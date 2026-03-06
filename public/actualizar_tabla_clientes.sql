-- ================================================================
-- ACTUALIZAR TABLA CLIENTES (La tabla ya existe)
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- Verificar estructura de la tabla clientes (opcional, solo consulta)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clientes';

-- Agregar columna cliente_id a canciones_cola si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'canciones_cola' AND column_name = 'cliente_id'
  ) THEN
    ALTER TABLE canciones_cola ADD COLUMN cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_canciones_cliente_id ON canciones_cola(cliente_id);
  END IF;
END $$;

-- Verificar que RLS está habilitado (si falla, ignorar)
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Crear política si no existe (si falla, ignorar)
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes') THEN
--     CREATE POLICY "Public access" ON clientes FOR ALL USING (true);
--   END IF;
-- END $$;

-- Habilitar Realtime para clientes (importante para actualización en vivo)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS clientes;

-- Verificar que todo está correcto
SELECT 'clientes' as tabla, COUNT(*) as registros FROM clientes
UNION ALL
SELECT 'canciones_cola', COUNT(*) FROM canciones_cola;

-- Ver los clientes existentes
SELECT id, bar_id, nombre, creditos, activo, creado_en FROM clientes ORDER BY creado_en DESC LIMIT 10;
