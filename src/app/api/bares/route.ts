import { NextResponse } from 'next/server'
import { obtenerTodosLosBares } from '@/lib/turso'

export const dynamic = 'force-dynamic'

// Endpoint para listar todos los bares (para obtener URLs)
export async function GET() {
  try {
    const bares = await obtenerTodosLosBares()
    return NextResponse.json({ bares })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
