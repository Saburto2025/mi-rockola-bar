import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

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

    // Obtener datos actuales del bar
    const barRes = await fetch(`${SUPABASE_URL}/rest/v1/bares?id=eq.${bar_id}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    const barData = await barRes.json()
    const bar = barData[0]

    if (!bar) {
      return NextResponse.json({ error: 'Bar no encontrado' }, { status: 404 })
    }

    // Obtener instancia rockola
    const instanciaRes = await fetch(`${SUPABASE_URL}/rest/v1/instancias_rockola?bar_id=eq.${bar_id}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    const instanciaData = await instanciaRes.json()
    const instancia = instanciaData[0]

    // Crear transacción
    await fetch(`${SUPABASE_URL}/rest/v1/transacciones`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        bar_id,
        tipo: 'compra_software',
        cantidad,
        precio_unitario: bar.precio_compra,
        total: cantidad * bar.precio_compra,
        descripcion: `Transferencia de ${cantidad} créditos a pantalla`
      })
    })

    // Actualizar créditos del bar (descontar)
    await fetch(`${SUPABASE_URL}/rest/v1/bares?id=eq.${bar_id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        creditos_disponibles: (bar.creditos_disponibles || 0) - cantidad
      })
    })

    // Actualizar créditos de la instancia rockola (sumar)
    const nuevosCreditosPantalla = (instancia?.creditos_pantalla || 0) + cantidad
    
    if (instancia) {
      await fetch(`${SUPABASE_URL}/rest/v1/instancias_rockola?bar_id=eq.${bar_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          creditos_pantalla: nuevosCreditosPantalla
        })
      })
    } else {
      // Crear instancia si no existe
      await fetch(`${SUPABASE_URL}/rest/v1/instancias_rockola`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          bar_id,
          creditos_pantalla: cantidad
        })
      })
    }

    return NextResponse.json({
      success: true,
      message: `Transferidos ${cantidad} créditos exitosamente`,
      creditos_bar: (bar.creditos_disponibles || 0) - cantidad,
      creditos_pantalla: nuevosCreditosPantalla
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
