-- =============================================
-- MIGRACIÓN: Agregar columna creditos_pantalla a tabla bares
-- Fecha: 2025-01-01
-- Descripción: La tabla bares necesita creditos_pantalla para 
--              gestionar el pool público de créditos directamente
--              en el bar, sin depender de instancias_rockola
-- =============================================

-- Agregar columna creditos_pantalla a la tabla bares
ALTER TABLE bares ADD COLUMN IF NOT EXISTS creditos_pantalla INTEGER DEFAULT 0;

-- Actualizar registros existentes que tengan NULL
UPDATE bares SET creditos_pantalla = 0 WHERE creditos_pantalla IS NULL;

-- Verificar la estructura actualizada
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'bares' AND column_name = 'creditos_pantalla';

-- Comentario descriptivo
COMMENT ON COLUMN bares.creditos_pantalla IS 'Pool público de créditos disponibles para clientes en la pantalla del bar';
