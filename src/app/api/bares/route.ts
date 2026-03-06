import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Endpoint para listar todos los bares (para obtener URLs)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('bares')
      .select('id, nombre, activo, creado_en')
      .order('creado_en', { ascending: false })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ bares: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
