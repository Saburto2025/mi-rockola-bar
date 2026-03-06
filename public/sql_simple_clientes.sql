-- ================================================================
-- SQL SIMPLIFICADO PARA SUPABASE
-- ================================================================

-- Agregar columna cliente_id a canciones_cola si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'canciones_cola' AND column_name = 'cliente_id'
  ) THEN
    ALTER TABLE canciones_cola ADD COLUMN cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_canciones_cliente_id ON canciones_cola(cliente_id);

-- Verificar clientes existentes
SELECT id, bar_id, nombre, creditos, activo FROM clientes ORDER BY creado_en DESC LIMIT 10;
