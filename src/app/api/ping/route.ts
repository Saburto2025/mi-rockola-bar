import { NextResponse } from 'next/server'

// Endpoint para mantener el servicio activo (self-ping)
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Rockola is alive!' 
  }, { status: 200 })
}
