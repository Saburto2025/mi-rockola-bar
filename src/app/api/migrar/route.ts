import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Verificar si la columna ya existe
    const { data, error: selectError } = await supabase
      .from('bares')
      .select('id, nombre, creditos_disponibles, creditos_pantalla')
      .limit(1)
    
    if (selectError) {
      // Si hay error, probablemente la columna no existe
      if (selectError.message.includes('column') || selectError.message.includes('does not exist')) {
        return NextResponse.json({ 
          success: false, 
          message: '⚠️ La columna creditos_pantalla NO existe en la tabla bares',
          instructions: 'Ve a Supabase Dashboard → SQL Editor y ejecuta:',
          sql: 'ALTER TABLE bares ADD COLUMN creditos_pantalla INTEGER DEFAULT 0;'
        })
      }
      throw selectError
    }
    
    // Si llegó aquí, la columna existe
    // Actualizar registros NULL a 0
    await supabase
      .from('bares')
      .update({ creditos_pantalla: 0 })
      .is('creditos_pantalla', null)

    return NextResponse.json({ 
      success: true, 
      message: '✅ Todo listo! La columna creditos_pantalla ya existe',
      bares: data
    })

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      instructions: 'Ejecuta en Supabase SQL Editor:',
      sql: 'ALTER TABLE bares ADD COLUMN creditos_pantalla INTEGER DEFAULT 0;'
    })
  }
}
