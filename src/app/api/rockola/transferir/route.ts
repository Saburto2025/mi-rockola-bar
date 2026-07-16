import { NextRequest, NextResponse } from 'next/server'
import { client, initDatabase } from '@/lib/turso'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bar_id, cantidad, clave } = body

    // Verificar clave de administrador
    if (clave !== 'rockola2024') {
      return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })
    }

    if (!bar_id || !cantidad || cantidad <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    await initDatabase()

    // Obtener datos actuales del bar
    const barRes = await client.execute({
      sql: "SELECT creditos_disponibles, precio_compra FROM bares WHERE id = ?",
      args: [bar_id]
    })

    if (barRes.rows.length === 0) {
      return NextResponse.json({ error: 'Bar no encontrado' }, { status: 404 })
    }

    const bar = barRes.rows[0]
    const creditosDisponibles = Number(bar.creditos_disponibles || 0)

    // Obtener instancia rockola
    const instanciaRes = await client.execute({
      sql: "SELECT creditos_pantalla FROM instancias_rockola WHERE bar_id = ?",
      args: [bar_id]
    })

    const creditosPantallaActual = instanciaRes.rows.length > 0 ? Number(instanciaRes.rows[0].creditos_pantalla || 0) : 0

    // Crear transacción
    const transId = crypto.randomUUID()
    const precioCompra = Number(bar.precio_compra || 40)
    await client.execute({
      sql: `INSERT INTO transacciones (id, bar_id, tipo, cantidad, precio_unitario, total, descripcion, creado_en)
            VALUES (?, ?, 'compra_software', ?, ?, ?, ?, ?)`,
      args: [
        transId,
        bar_id,
        cantidad,
        precioCompra,
        cantidad * precioCompra,
        `Transferencia de ${cantidad} créditos a pantalla`,
        new Date().toISOString()
      ]
    })

    // Actualizar créditos del bar (descontar)
    const nuevosCreditosDisponibles = creditosDisponibles - cantidad
    await client.execute({
      sql: "UPDATE bares SET creditos_disponibles = ? WHERE id = ?",
      args: [nuevosCreditosDisponibles, bar_id]
    })

    // Actualizar créditos de la instancia rockola (sumar)
    const nuevosCreditosPantalla = creditosPantallaActual + cantidad
    
    if (instanciaRes.rows.length > 0) {
      await client.execute({
        sql: "UPDATE instancias_rockola SET creditos_pantalla = ? WHERE bar_id = ?",
        args: [nuevosCreditosPantalla, bar_id]
      })
    } else {
      // Crear instancia si no existe
      await client.execute({
        sql: "INSERT INTO instancias_rockola (id, bar_id, creditos_pantalla, volumen, pausado, skip_requested) VALUES (?, ?, ?, 50, 0, 0)",
        args: [crypto.randomUUID(), bar_id, nuevosCreditosPantalla]
      })
    }

    return NextResponse.json({
      success: true,
      message: `Transferidos ${cantidad} créditos exitosamente`,
      creditos_bar: nuevosCreditosDisponibles,
      creditos_pantalla: nuevosCreditosPantalla
    })

  } catch (error: any) {
    console.error('Error in transferir route:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
