import { NextResponse } from 'next/server'
import { client, initDatabase } from '@/lib/turso'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const resultados: string[] = []

    // 1. Probar conexión e inicialización
    try {
      await initDatabase()
      resultados.push('✅ Conexión con Turso inicializada y establecida')
    } catch (e: any) {
      resultados.push(`❌ Error al conectar a Turso: ${e.message}`)
    }

    // 2. Verificar tablas
    const tablas = ['bares', 'instancias_rockola', 'canciones_cola', 'transacciones', 'clientes']
    for (const tabla of tablas) {
      try {
        const res = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tabla}'`)
        if (res.rows.length > 0) {
          resultados.push(`✅ Tabla "${tabla}" existe en Turso`)
          
          // Contar filas de prueba
          const countRes = await client.execute(`SELECT COUNT(*) as count FROM ${tabla}`)
          resultados.push(`   -> Filas en "${tabla}": ${countRes.rows[0].count}`)
        } else {
          resultados.push(`❌ Tabla "${tabla}" NO existe en Turso`)
        }
      } catch (e: any) {
        resultados.push(`❌ Error verificando tabla "${tabla}": ${e.message}`)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Diagnóstico de Turso completado',
      resultados,
      database_type: 'Turso (libSQL/SQLite)'
    })

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message
    })
  }
}
