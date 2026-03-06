import { NextRequest, NextResponse } from 'next/server'

// Configuración de Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Helper para hacer peticiones a Supabase
async function supabaseFetch(table: string, options: {
  method?: string
  body?: Record<string, unknown>
  query?: Record<string, string>
} = {}) {
  const { method = 'GET', body, query = {} } = options
  
  const queryParams = new URLSearchParams({
    ...query,
    select: '*'
  }).toString()

  const url = `${SUPABASE_URL}/rest/v1/${table}?${queryParams}`

  const headers: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    throw new Error(`Supabase error: ${response.statusText}`)
  }

  return response.json()
}

// GET - Obtener datos del bar y rockola
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const barId = searchParams.get('bar_id')

  if (!barId) {
    return NextResponse.json({ error: 'bar_id es requerido' }, { status: 400 })
  }

  try {
    // Obtener datos del bar
    const barData = await supabaseFetch('2 de enero', {
      query: { id: `eq.${barId}` }
    })

    // Obtener instancia de rockola
    const rockolaData = await supabaseFetch('instancias_rockola', {
      query: { bar_id: `eq.${barId}` }
    })

    return NextResponse.json({
      bar: barData[0] || null,
      rockola: rockolaData[0] || null
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching data:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST - Transferir créditos de bolsa SaaS a TV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bar_id, cantidad, clave } = body as { bar_id: string; cantidad: number; clave: string }

    // Verificar clave de administrador
    if (clave !== '1234') {
      return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 })
    }

    if (!bar_id || !cantidad || cantidad <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Obtener datos actuales del bar
    const barData = await supabaseFetch('2 de enero', {
      query: { id: `eq.${bar_id}` }
    })

    if (!barData[0]) {
      return NextResponse.json({ error: 'Bar no encontrado' }, { status: 404 })
    }

    const saldoActual = (barData[0] as { saldo_saas?: number }).saldo_saas || 0

    if (cantidad > saldoActual) {
      return NextResponse.json({ error: 'Saldo insuficiente en bolsa SaaS' }, { status: 400 })
    }

    // Actualizar saldo del bar (descontar)
    const updateBarUrl = `${SUPABASE_URL}/rest/v1/2 de enero?id=eq.${bar_id}`
    await fetch(updateBarUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ saldo_saas: saldoActual - cantidad })
    })

    // Obtener créditos actuales de la TV
    const rockolaData = await supabaseFetch('instancias_rockola', {
      query: { bar_id: `eq.${bar_id}` }
    })

    const creditosActuales = (rockolaData[0] as { creditos_pantalla?: number })?.creditos_pantalla || 0

    // Actualizar créditos de la TV (sumar)
    const updateRockolaUrl = `${SUPABASE_URL}/rest/v1/instancias_rockola?bar_id=eq.${bar_id}`
    await fetch(updateRockolaUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ creditos_pantalla: creditosActuales + cantidad })
    })

    return NextResponse.json({
      success: true,
      message: `Se transfirieron ${cantidad} créditos exitosamente`,
      nuevo_saldo: saldoActual - cantidad,
      nuevos_creditos_tv: creditosActuales + cantidad
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error transferring credits:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
