import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const resultados: string[] = []

    // 1. Verificar columna creditos_pantalla en bares
    try {
      const { error: errorBares } = await supabase
        .from('bares')
        .select('id, creditos_pantalla')
        .limit(1)
      
      if (errorBares && errorBares.message.includes('column')) {
        resultados.push('⚠️ Columna creditos_pantalla NO existe en bares')
      } else {
        resultados.push('✅ Columna creditos_pantalla OK en bares')
      }
    } catch (e) {
      resultados.push('⚠️ Error verificando bares')
    }

    // 2. Verificar columna whatsapp en bares
    try {
      const { error: errorWhatsapp } = await supabase
        .from('bares')
        .select('id, whatsapp')
        .limit(1)
      
      if (errorWhatsapp && errorWhatsapp.message.includes('column')) {
        resultados.push('⚠️ Columna whatsapp NO existe en bares')
      } else {
        resultados.push('✅ Columna whatsapp OK')
      }
    } catch (e) {
      resultados.push('⚠️ Error verificando whatsapp')
    }

    // 3. Verificar columna correo en bares
    try {
      const { error: errorCorreo } = await supabase
        .from('bares')
        .select('id, correo')
        .limit(1)
      
      if (errorCorreo && errorCorreo.message.includes('column')) {
        resultados.push('⚠️ Columna correo NO existe en bares')
      } else {
        resultados.push('✅ Columna correo OK')
      }
    } catch (e) {
      resultados.push('⚠️ Error verificando correo')
    }

    // 4. Verificar tabla instancias_rockola
    try {
      const { error: errorInstancias } = await supabase
        .from('instancias_rockola')
        .select('id, bar_id, volumen, pausado, skip_requested')
        .limit(1)
      
      if (errorInstancias) {
        if (errorInstancias.message.includes('relation') || errorInstancias.message.includes('does not exist')) {
          resultados.push('⚠️ Tabla instancias_rockola NO existe')
        } else if (errorInstancias.message.includes('column')) {
          resultados.push('⚠️ Falta columna skip_requested en instancias_rockola')
        } else {
          resultados.push('✅ Tabla instancias_rockola OK')
        }
      } else {
        resultados.push('✅ Tabla instancias_rockola OK')
      }
    } catch (e) {
      resultados.push('⚠️ Error verificando instancias_rockola')
    }

    // Obtener bares para mostrar
    const { data: bares } = await supabase
      .from('bares')
      .select('id, nombre, creditos_disponibles, creditos_pantalla')
      .limit(5)

    return NextResponse.json({ 
      success: true, 
      message: 'Verificación completada',
      resultados,
      bares,
      instrucciones: {
        tablas: 'Si faltan columnas, ejecuta en Supabase SQL Editor:',
        sql_bares: `
-- Agregar columnas faltantes a bares
ALTER TABLE bares ADD COLUMN IF NOT EXISTS creditos_pantalla INTEGER DEFAULT 0;
ALTER TABLE bares ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE bares ADD COLUMN IF NOT EXISTS correo TEXT;
`,
        sql_instancias: `
-- Crear tabla instancias_rockola si no existe
CREATE TABLE IF NOT EXISTS instancias_rockola (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id UUID REFERENCES bares(id) ON DELETE CASCADE,
  creditos_pantalla INTEGER DEFAULT 0,
  volumen INTEGER DEFAULT 50,
  pausado BOOLEAN DEFAULT FALSE,
  skip_requested BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE(bar_id)
);

-- Habilitar RLS
ALTER TABLE instancias_rockola ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo" ON instancias_rockola FOR ALL USING (true);
`
      }
    })

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message
    })
  }
}
