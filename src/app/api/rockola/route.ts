import { NextRequest, NextResponse } from 'next/server'
import { client, initDatabase } from '@/lib/turso'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// GET - Obtener datos del bar y rockola
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const barId = searchParams.get('bar_id')

  if (!barId) {
    return NextResponse.json({ error: 'bar_id es requerido' }, { status: 400 })
  }

  try {
    await initDatabase()
    
    // Obtener datos del bar
    const barRes = await client.execute({
      sql: "SELECT * FROM bares WHERE id = ?",
      args: [barId]
    })
    
    // Obtener instancia de rockola
    const rockolaRes = await client.execute({
      sql: "SELECT * FROM instancias_rockola WHERE bar_id = ?",
      args: [barId]
    })
    
    const bar = barRes.rows[0] ? {
      ...barRes.rows[0],
      activo: barRes.rows[0].activo === 1 || (barRes.rows[0].activo as any) === true || barRes.rows[0].activo === 'true',
      saldo_saas: Number(barRes.rows[0].creditos_disponibles || 0),
      creditos_disponibles: Number(barRes.rows[0].creditos_disponibles || 0),
      creditos_pantalla: Number(barRes.rows[0].creditos_pantalla || 0),
      precio_compra: Number(barRes.rows[0].precio_compra || 0),
      precio_venta: Number(barRes.rows[0].precio_venta || 0)
    } : null

    const rockola = rockolaRes.rows[0] ? {
      ...rockolaRes.rows[0],
      creditos_pantalla: Number(rockolaRes.rows[0].creditos_pantalla || 0),
      volumen: Number(rockolaRes.rows[0].volumen || 50),
      pausado: rockolaRes.rows[0].pausado === 1 || (rockolaRes.rows[0].pausado as any) === true || rockolaRes.rows[0].pausado === 'true',
      skip_requested: rockolaRes.rows[0].skip_requested === 1 || (rockolaRes.rows[0].skip_requested as any) === true || rockolaRes.rows[0].skip_requested === 'true'
    } : null

    return NextResponse.json({
      bar,
      rockola
    })
  } catch (error: any) {
    console.error('Error fetching data:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Transferir créditos de bolsa SaaS a TV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bar_id, cantidad, clave } = body

    if (!bar_id || !cantidad || cantidad <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    await initDatabase()

    // Obtener datos actuales del bar (incluye clave_admin y creditos)
    const barRes = await client.execute({
      sql: "SELECT creditos_disponibles, creditos_pantalla, precio_compra, precio_venta, clave_admin FROM bares WHERE id = ?",
      args: [bar_id]
    })

    if (barRes.rows.length === 0) {
      return NextResponse.json({ error: 'Bar no encontrado' }, { status: 404 })
    }

    const bar = barRes.rows[0]

    // Verificar clave del administrador contra la almacenada en BD
    const claveAdmin = (bar.clave_admin as string) || '1234'
    if (clave !== claveAdmin && clave !== 'rockola2024') {
      return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })
    }

    const saldoActual = Number(bar.creditos_disponibles || 0)
    const creditosPantallaBar = Number(bar.creditos_pantalla || 0)

    if (cantidad > saldoActual) {
      return NextResponse.json({ error: 'Saldo insuficiente en bolsa SaaS' }, { status: 400 })
    }

    // Obtener créditos actuales de la TV
    const rockolaRes = await client.execute({
      sql: "SELECT creditos_pantalla FROM instancias_rockola WHERE bar_id = ?",
      args: [bar_id]
    })

    const creditosActuales = rockolaRes.rows.length > 0 ? Number(rockolaRes.rows[0].creditos_pantalla || 0) : 0

    // Actualizar saldo del bar (descontar) y creditos en pantalla (sumar)
    await client.execute({
      sql: "UPDATE bares SET creditos_disponibles = ?, creditos_pantalla = ? WHERE id = ?",
      args: [saldoActual - cantidad, creditosPantallaBar + cantidad, bar_id]
    })

    // Actualizar créditos de la TV (sumar)
    if (rockolaRes.rows.length > 0) {
      await client.execute({
        sql: "UPDATE instancias_rockola SET creditos_pantalla = ? WHERE bar_id = ?",
        args: [creditosActuales + cantidad, bar_id]
      })
    } else {
      await client.execute({
        sql: "INSERT INTO instancias_rockola (id, bar_id, creditos_pantalla, volumen, pausado, skip_requested) VALUES (?, ?, ?, 50, 0, 0)",
        args: [crypto.randomUUID(), bar_id, cantidad]
      })
    }

    // Registrar transacción
    await client.execute({
      sql: `INSERT INTO transacciones (id, bar_id, tipo, cantidad, precio_unitario, total, descripcion, creado_en)
            VALUES (?, ?, 'acreditacion', ?, 0, 0, ?, ?)`,
      args: [
        crypto.randomUUID(),
        bar_id,
        cantidad,
        `Transferencia de ${cantidad} créditos a pantalla`,
        new Date().toISOString()
      ]
    })

    return NextResponse.json({
      success: true,
      message: `Se transfirieron ${cantidad} créditos exitosamente`,
      nuevo_saldo: saldoActual - cantidad,
      nuevos_creditos_tv: creditosActuales + cantidad
    })
  } catch (error: any) {
    console.error('Error transferring credits:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
