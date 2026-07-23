import { NextResponse } from 'next/server'
import { client, initDatabase } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await initDatabase()
    const baresRes = await client.execute("SELECT * FROM bares")
    const instanciasRes = await client.execute("SELECT * FROM instancias_rockola")
    const transaccionesRes = await client.execute("SELECT * FROM transacciones ORDER BY creado_en DESC LIMIT 20")

    const diagnostico = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      bares: baresRes.rows,
      instancias: instanciasRes.rows,
      transacciones: transaccionesRes.rows,
      variables: {
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? {
          configured: true,
          value: process.env.TURSO_DATABASE_URL.substring(0, 30) + '...',
          length: process.env.TURSO_DATABASE_URL.length
        } : { configured: false },
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? {
          configured: true,
          prefix: process.env.TURSO_AUTH_TOKEN.substring(0, 20) + '...',
          length: process.env.TURSO_AUTH_TOKEN.length
        } : { configured: false },
        NEXT_PUBLIC_YOUTUBE_API_KEY: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ? {
          configured: true,
          length: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY.length
        } : { configured: false }
      }
    }
    return NextResponse.json(diagnostico)
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}

