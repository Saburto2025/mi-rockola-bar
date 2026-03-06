-- ================================================================
-- TABLA DE CLIENTES CON SALDO INDIVIDUAL
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bar_id UUID REFERENCES bares(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  creditos INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bar_id, nombre)
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_bar_id ON clientes(bar_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);

-- Habilitar RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (ajustar según necesidades de seguridad)
CREATE POLICY "Public access" ON clientes FOR ALL USING (true);

-- Agregar columna cliente_id a canciones_cola (para rastrear quién pidió la canción)
ALTER TABLE canciones_cola ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;

-- Crear índice para cliente_id
CREATE INDEX IF NOT EXISTS idx_canciones_cliente_id ON canciones_cola(cliente_id);

-- Habilitar Realtime para la tabla clientes
ALTER PUBLICATION supabase_realtime ADD TABLE clientes;

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION actualizar_timestamp_cliente()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp
DROP TRIGGER IF EXISTS trigger_actualizar_timestamp_cliente ON clientes;
CREATE TRIGGER trigger_actualizar_timestamp_cliente
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp_cliente();
