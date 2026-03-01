import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Debug: Log para verificar que las variables están disponibles
console.log('🔧 Supabase Config:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'
})

// Solo crear cliente si hay credenciales
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any

// Exportar función para verificar conexión
export const verificarConexion = async () => {
  if (!supabase) {
    throw new Error('Cliente Supabase no inicializado. Verifica las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  const { data, error } = await supabase.from('bares').select('count').limit(1)
  if (error) {
    throw new Error(`Error de conexión Supabase: ${error.message}`)
  }
  return true
}

// Tipos
export interface Bar {
  id: string
  nombre: string
  creditos_disponibles: number      // Stock del bar (lo que compró al SaaS)
  creditos_pantalla: number          // Pool público para clientes
  precio_compra: number
  precio_venta: number
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export interface InstanciaRockola {
  id: string
  bar_id: string
  creditos_pantalla: number
  volumen: number
  pausado: boolean
}

export interface CancionCola {
  id: string
  bar_id: string
  video_id: string
  titulo: string
  thumbnail: string
  canal?: string
  estado: 'pendiente' | 'aprobada' | 'reproduciendo' | 'completada'
  costo_creditos: number
  solicitado_por: string
  posicion: number
  creado_en: string
}

export interface Transaccion {
  id: string
  bar_id: string
  tipo: 'compra_software' | 'venta_cliente' | 'consumo' | 'acreditacion'
  cantidad: number
  precio_unitario: number
  total: number
  cliente_nombre?: string
  cancion_titulo?: string
  descripcion?: string
  creado_en: string
}

export interface Cliente {
  id: string
  bar_id: string
  nombre: string
  creditos: number
  total_gastado: number
  activo: boolean
}

// ============= FUNCIONES API =============

// Obtener datos del bar
export async function obtenerBar(barId: string) {
  console.log('📊 obtenerBar llamado con ID:', barId)
  
  if (!supabase) {
    throw new Error('Cliente Supabase no inicializado')
  }
  
  const { data, error } = await supabase
    .from('bares')
    .select('*')
    .eq('id', barId)
    .single()
  
  if (error) {
    console.error('❌ Error en obtenerBar:', error)
    throw error
  }
  
  console.log('✅ Bar obtenido:', data?.nombre)
  // Asegurar que creditos_pantalla existe
  return { 
    ...data, 
    creditos_pantalla: data.creditos_pantalla ?? 0 
  } as Bar
}

// Obtener instancia rockola
export async function obtenerInstancia(barId: string) {
  const { data, error } = await supabase
    .from('instancias_rockola')
    .select('*')
    .eq('bar_id', barId)
    .single()
  
  if (error) throw error
  return data as InstanciaRockola
}

// Obtener cola de canciones
export async function obtenerCola(barId: string) {
  console.log('📊 obtenerCola llamado con barId:', barId)
  
  if (!supabase) {
    throw new Error('Cliente Supabase no inicializado')
  }
  
  const { data, error } = await supabase
    .from('canciones_cola')
    .select('*')
    .eq('bar_id', barId)
    .in('estado', ['pendiente', 'aprobada', 'reproduciendo'])
    .order('posicion', { ascending: true })
    .order('creado_en', { ascending: true })
  
  if (error) {
    console.error('❌ Error en obtenerCola:', error)
    throw error
  }
  
  console.log('✅ Cola obtenida:', data?.length, 'canciones')
  return data as CancionCola[]
}

// Agregar canción a la cola Y DESCONTAR CRÉDITO
export async function agregarCancionYConsumir(barId: string, cancion: Omit<CancionCola, 'id' | 'creado_en' | 'bar_id'>) {
  if (!supabase) throw new Error('Supabase no inicializado')
  
  // Obtener estado actual del bar
  const { data: bar, error: barError } = await supabase
    .from('bares')
    .select('creditos_pantalla')
    .eq('id', barId)
    .single()
  
  if (barError) throw barError
  if (!bar || bar.creditos_pantalla < 1) {
    throw new Error('No hay créditos disponibles en la pantalla')
  }
  
  // Agregar canción
  const { data: nuevaCancion, error: cancionError } = await supabase
    .from('canciones_cola')
    .insert([{
      bar_id: barId,
      ...cancion
    }])
    .select()
    .single()
  
  if (cancionError) throw cancionError
  
  // Descontar crédito de la pantalla
  const { error: updateError } = await supabase
    .from('bares')
    .update({ creditos_pantalla: bar.creditos_pantalla - 1 })
    .eq('id', barId)
  
  if (updateError) throw updateError
  
  // Registrar transacción de consumo
  await supabase
    .from('transacciones')
    .insert([{
      bar_id: barId,
      tipo: 'consumo',
      cantidad: 1,
      precio_unitario: 0,
      total: 0,
      cancion_titulo: cancion.titulo,
      descripcion: `Consumo: ${cancion.titulo}`
    }])
  
  return nuevaCancion as CancionCola
}

// Agregar canción simple (sin consumir)
export async function agregarCancion(cancion: Omit<CancionCola, 'id' | 'creado_en'>) {
  const { data, error } = await supabase
    .from('canciones_cola')
    .insert([cancion])
    .select()
    .single()
  
  if (error) throw error
  return data as CancionCola
}

// Actualizar estado de canción
export async function actualizarEstadoCancion(cancionId: string, estado: CancionCola['estado']) {
  const { error } = await supabase
    .from('canciones_cola')
    .update({ estado })
    .eq('id', cancionId)
  
  if (error) throw error
}

// Eliminar canción
export async function eliminarCancion(cancionId: string) {
  const { error } = await supabase
    .from('canciones_cola')
    .delete()
    .eq('id', cancionId)
  
  if (error) throw error
}

// ============= NUEVA LÓGICA DE CRÉDITOS =============

// Super Admin: Comprar créditos para el bar (stock)
export async function comprarCreditosProveedor(barId: string, cantidad: number, precioUnitario: number) {
  const total = cantidad * precioUnitario
  
  // Crear transacción
  await supabase
    .from('transacciones')
    .insert([{
      bar_id: barId,
      tipo: 'compra_software',
      cantidad,
      precio_unitario: precioUnitario,
      total,
      descripcion: `Compra de ${cantidad} créditos al proveedor`
    }])
  
  // Sumar al stock del bar (creditos_disponibles)
  const { data: bar } = await supabase
    .from('bares')
    .select('creditos_disponibles')
    .eq('id', barId)
    .single()
  
  if (bar) {
    await supabase
      .from('bares')
      .update({ creditos_disponibles: bar.creditos_disponibles + cantidad })
      .eq('id', barId)
  }
  
  return { cantidad, precioUnitario, total }
}

// Admin Bar: Acreditar créditos a la pantalla pública
export async function acreditarCreditosPantalla(barId: string, cantidad: number) {
  if (!supabase) throw new Error('Supabase no inicializado')
  
  // Obtener estado actual
  const { data: bar, error: barError } = await supabase
    .from('bares')
    .select('creditos_disponibles, creditos_pantalla, precio_venta')
    .eq('id', barId)
    .single()
  
  if (barError) throw barError
  if (!bar) throw new Error('Bar no encontrado')
  if (bar.creditos_disponibles < cantidad) throw new Error('Stock insuficiente')
  
  // Transferir de stock a pantalla
  const nuevoStock = bar.creditos_disponibles - cantidad
  const nuevoPantalla = (bar.creditos_pantalla || 0) + cantidad
  
  await supabase
    .from('bares')
    .update({ 
      creditos_disponibles: nuevoStock,
      creditos_pantalla: nuevoPantalla
    })
    .eq('id', barId)
  
  // Registrar transacción
  await supabase
    .from('transacciones')
    .insert([{
      bar_id: barId,
      tipo: 'acreditacion',
      cantidad,
      precio_unitario: bar.precio_venta,
      total: cantidad * bar.precio_venta,
      descripcion: `Acreditación de ${cantidad} créditos a pantalla`
    }])
  
  return { cantidad, nuevoStock, nuevoPantalla }
}

// Función antigua mantenida para compatibilidad
export async function venderCreditosCliente(barId: string, clienteNombre: string, cantidad: number) {
  // Usar la nueva lógica: acreditar a pantalla
  return acreditarCreditosPantalla(barId, cantidad)
}

// Transferir créditos del SaaS a la pantalla (endpoint alternativo)
export async function transferirCreditos(barId: string, cantidad: number, clave: string) {
  const response = await fetch('/api/rockola/transferir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bar_id: barId, cantidad, clave })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al transferir créditos')
  }
  
  return response.json()
}

// Obtener transacciones
export async function obtenerTransacciones(barId: string, filtros?: {
  fechaInicio?: string
  fechaFin?: string
  tipo?: string
}) {
  let query = supabase
    .from('transacciones')
    .select('*')
    .eq('bar_id', barId)
    .order('creado_en', { ascending: false })
  
  if (filtros?.tipo && filtros.tipo !== 'todos') {
    query = query.eq('tipo', filtros.tipo)
  }
  
  if (filtros?.fechaInicio) {
    query = query.gte('creado_en', filtros.fechaInicio)
  }
  
  if (filtros?.fechaFin) {
    const fechaFin = new Date(filtros.fechaFin)
    fechaFin.setHours(23, 59, 59)
    query = query.lte('creado_en', fechaFin.toISOString())
  }
  
  const { data, error } = await query
  if (error) throw error
  return data as Transaccion[]
}

// Actualizar precios del bar
export async function actualizarPrecios(barId: string, precioCompra: number, precioVenta: number) {
  const { error } = await supabase
    .from('bares')
    .update({ precio_compra: precioCompra, precio_venta: precioVenta })
    .eq('id', barId)
  
  if (error) throw error
}

// Obtener todos los bares (Super Admin)
export async function obtenerTodosLosBares() {
  console.log('📊 obtenerTodosLosBares llamado')
  
  if (!supabase) {
    throw new Error('Cliente Supabase no inicializado')
  }
  
  const { data, error } = await supabase
    .from('bares')
    .select('*')
    .order('creado_en', { ascending: false })
  
  if (error) {
    console.error('❌ Error en obtenerTodosLosBares:', error)
    throw error
  }
  
  console.log('✅ Bares obtenidos:', data?.length)
  // Asegurar creditos_pantalla en todos
  return data?.map(b => ({ ...b, creditos_pantalla: b.creditos_pantalla ?? 0 })) as Bar[]
}

// Crear nuevo bar (Super Admin)
export async function crearBar(nombre: string) {
  const { data, error } = await supabase
    .from('bares')
    .insert([{
      nombre,
      creditos_disponibles: 0,
      creditos_pantalla: 0,
      precio_compra: 40,
      precio_venta: 100,
      activo: true
    }])
    .select()
    .single()
  
  if (error) throw error
  return data as Bar
}

// Obtener todas las transacciones (Super Admin)
export async function obtenerTodasTransacciones() {
  console.log('📊 obtenerTodasTransacciones llamado')
  
  if (!supabase) {
    throw new Error('Cliente Supabase no inicializado')
  }
  
  const { data, error } = await supabase
    .from('transacciones')
    .select('*')
    .order('creado_en', { ascending: false })
  
  if (error) {
    console.error('❌ Error en obtenerTodasTransacciones:', error)
    throw error
  }
  
  console.log('✅ Transacciones obtenidas:', data?.length)
  return data as Transaccion[]
}

// Suscribirse a cambios en tiempo real
export function suscribirseACambios(barId: string, callbacks: {
  onBarCambio?: (bar: Bar) => void
  onColaCambio?: (cola: CancionCola[]) => void
  onTransaccionCambio?: () => void
}) {
  const canal = supabase.channel(`rockola-${barId}`)
  
  if (callbacks.onBarCambio) {
    canal.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bares',
      filter: `id=eq.${barId}`
    }, (payload) => {
      if (payload.new) {
        callbacks.onBarCambio!({ 
          ...payload.new as Bar,
          creditos_pantalla: (payload.new as any).creditos_pantalla ?? 0 
        })
      }
    })
  }
  
  if (callbacks.onColaCambio) {
    canal.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'canciones_cola',
      filter: `bar_id=eq.${barId}`
    }, async () => {
      const cola = await obtenerCola(barId)
      callbacks.onColaCambio!(cola)
    })
  }
  
  canal.subscribe()
  
  return () => {
    supabase.removeChannel(canal)
  }
}
