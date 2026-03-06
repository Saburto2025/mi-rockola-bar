-- =============================================
-- ROCKOLA SaaS - SCRIPT DE BASE DE DATOS
-- Ejecuta esto en Supabase SQL Editor
-- =============================================

-- 1. TABLA DE BARES
CREATE TABLE IF NOT EXISTS bares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    creditos_disponibles INTEGER DEFAULT 0,
    precio_compra DECIMAL(10,2) DEFAULT 1.00,
    precio_venta DECIMAL(10,2) DEFAULT 2.00,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE INSTANCIAS ROCKOLA (estado de cada bar)
CREATE TABLE IF NOT EXISTS instancias_rockola (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bar_id UUID REFERENCES bares(id) ON DELETE CASCADE UNIQUE,
    creditos_pantalla INTEGER DEFAULT 0,
    volumen INTEGER DEFAULT 50,
    pausado BOOLEAN DEFAULT false,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE CANCIONES EN COLA
CREATE TABLE IF NOT EXISTS canciones_cola (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bar_id UUID REFERENCES bares(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    titulo TEXT NOT NULL,
    thumbnail TEXT,
    canal TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'reproduciendo', 'completada')),
    costo_creditos DECIMAL(10,2) DEFAULT 0,
    precio_venta DECIMAL(10,2) DEFAULT 0,
    solicitado_por TEXT DEFAULT 'Admin',
    posicion INTEGER DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA DE TRANSACCIONES
CREATE TABLE IF NOT EXISTS transacciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bar_id UUID REFERENCES bares(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('compra_software', 'venta_cliente', 'consumo', 'recarga')),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    cliente_nombre TEXT,
    cancion_titulo TEXT,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bar_id UUID REFERENCES bares(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    creditos INTEGER DEFAULT 0,
    total_gastado DECIMAL(10,2) DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- =============================================
CREATE INDEX IF NOT EXISTS idx_canciones_bar ON canciones_cola(bar_id);
CREATE INDEX IF NOT EXISTS idx_canciones_estado ON canciones_cola(estado);
CREATE INDEX IF NOT EXISTS idx_transacciones_bar ON transacciones(bar_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX IF NOT EXISTS idx_clientes_bar ON clientes(bar_id);

-- =============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE bares ENABLE ROW LEVEL SECURITY;
ALTER TABLE instancias_rockola ENABLE ROW LEVEL SECURITY;
ALTER TABLE canciones_cola ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS DE ACCESO (Lectura pública para la app)
-- =============================================
CREATE POLICY "Permitir lectura bares" ON bares FOR SELECT USING (true);
CREATE POLICY "Permitir escritura bares" ON bares FOR ALL USING (true);

CREATE POLICY "Permitir lectura instancias" ON instancias_rockola FOR SELECT USING (true);
CREATE POLICY "Permitir escritura instancias" ON instancias_rockola FOR ALL USING (true);

CREATE POLICY "Permitir lectura canciones" ON canciones_cola FOR SELECT USING (true);
CREATE POLICY "Permitir escritura canciones" ON canciones_cola FOR ALL USING (true);

CREATE POLICY "Permitir lectura transacciones" ON transacciones FOR SELECT USING (true);
CREATE POLICY "Permitir escritura transacciones" ON transacciones FOR ALL USING (true);

CREATE POLICY "Permitir lectura clientes" ON clientes FOR SELECT USING (true);
CREATE POLICY "Permitir escritura clientes" ON clientes FOR ALL USING (true);

-- =============================================
-- INSERTAR DATOS DE PRUEBA (Tu bar)
-- =============================================
INSERT INTO bares (id, nombre, creditos_disponibles, precio_compra, precio_venta)
VALUES (
    '7b2fc122-93fa-4311-aaf9-184f0c111de1',
    'Bar 2 de Enero',
    100,
    1.00,
    2.00
) ON CONFLICT (id) DO NOTHING;

INSERT INTO instancias_rockola (bar_id, creditos_pantalla)
VALUES (
    '7b2fc122-93fa-4311-aaf9-184f0c111de1',
    100
) ON CONFLICT (bar_id) DO NOTHING;

-- =============================================
-- FUNCIONES ÚTILES
-- =============================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar timestamp en bares
DROP TRIGGER IF EXISTS update_bares_updated_at ON bares;
CREATE TRIGGER update_bares_updated_at
    BEFORE UPDATE ON bares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VISTAS ÚTILES PARA REPORTES
-- =============================================

-- Vista de resumen por bar
CREATE OR REPLACE VIEW resumen_bar AS
SELECT 
    b.id,
    b.nombre,
    b.creditos_disponibles,
    b.precio_compra,
    b.precio_venta,
    ir.creditos_pantalla,
    (SELECT COUNT(*) FROM canciones_cola WHERE bar_id = b.id AND estado = 'aprobada') as canciones_en_cola,
    (SELECT COALESCE(SUM(total), 0) FROM transacciones WHERE bar_id = b.id AND tipo = 'compra_software') as total_compras,
    (SELECT COALESCE(SUM(total), 0) FROM transacciones WHERE bar_id = b.id AND tipo = 'venta_cliente') as total_ventas,
    (SELECT COUNT(*) FROM transacciones WHERE bar_id = b.id AND tipo = 'consumo') as total_canciones_reproducidas
FROM bares b
LEFT JOIN instancias_rockola ir ON ir.bar_id = b.id;

-- =============================================
-- HABILITAR REALTIME PARA SINCRONIZACIÓN
-- =============================================
-- Ejecuta esto en la consola de Supabase o desde el dashboard:
-- Publication > realtime > Add tables: bares, instancias_rockola, canciones_cola, transacciones

COMMENT ON TABLE bares IS 'Configuración de cada bar cliente';
COMMENT ON TABLE instancias_rockola IS 'Estado actual de cada rockola';
COMMENT ON TABLE canciones_cola IS 'Cola de canciones pendientes y aprobadas';
COMMENT ON TABLE transacciones IS 'Historial de todas las transacciones';
COMMENT ON TABLE clientes IS 'Clientes que compran créditos en cada bar';
