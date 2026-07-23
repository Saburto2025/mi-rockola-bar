import { NextResponse } from 'next/server'
import { client, initDatabase } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await initDatabase()

    // Ejecutar actualización para corregir el bar de prueba
    await client.execute("UPDATE bares SET creditos_pantalla = 20 WHERE id = 'effe4d7e-6fb0-42bc-8252-86b6f183e66f'")
    await client.execute("UPDATE instancias_rockola SET creditos_pantalla = 20 WHERE bar_id = 'effe4d7e-6fb0-42bc-8252-86b6f183e66f'")

    const baresRes = await client.execute("SELECT * FROM bares")
    const instanciasRes = await client.execute("SELECT * FROM instancias_rockola")

    const diagnostico = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      bares: baresRes.rows,
      instancias: instanciasRes.rows,
      status: "Corrected creditos_pantalla to 20 successfully!"
    }
    return NextResponse.json(diagnostico)
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}

