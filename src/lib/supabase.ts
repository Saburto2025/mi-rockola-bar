import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Solo crear cliente si hay credenciales
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any

// Tipos
export interface Bar {
  id: string
  nombre: string
  creditos_disponibles: number
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
  tipo: 'compra_software' | 'venta_cliente' | 'consumo'
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

// Funciones de la API

// Obtener datos del bar
export async function obtenerBar(barId: string) {
  const { data, error } = await supabase
    .from('bares')
    .select('*')
    .eq('id', barId)
    .single()
  
  if (error) throw error
  return data as Bar
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
  const { data, error } = await supabase
    .from('canciones_cola')
    .select('*')
    .eq('bar_id', barId)
    .in('estado', ['pendiente', 'aprobada', 'reproduciendo'])
    .order('posicion', { ascending: true })
    .order('creado_en', { ascending: true })
  
  if (error) throw error
  return data as CancionCola[]
}

// Agregar canción a la cola
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

// Transferir créditos del SaaS a la pantalla
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

// Vender créditos a cliente
export async function venderCreditosCliente(barId: string, clienteNombre: string, cantidad: number) {
  // Crear transacción
  const { data: bar } = await supabase
    .from('bares')
    .select('precio_venta, creditos_disponibles')
    .eq('id', barId)
    .single()
  
  if (!bar) throw new Error('Bar no encontrado')
  if (bar.creditos_disponibles < cantidad) throw new Error('Créditos insuficientes')
  
  const precioUnitario = bar.precio_venta
  const total = cantidad * precioUnitario
  
  // Crear transacción
  await supabase
    .from('transacciones')
    .insert([{
      bar_id: barId,
      tipo: 'venta_cliente',
      cantidad,
      precio_unitario: precioUnitario,
      total,
      cliente_nombre: clienteNombre,
      descripcion: `Venta de ${cantidad} créditos a ${clienteNombre}`
    }])
  
  // Actualizar créditos del bar
  await supabase
    .from('bares')
    .update({ creditos_disponibles: bar.creditos_disponibles - cantidad })
    .eq('id', barId)
  
  return { cantidad, precioUnitario, total }
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

// Comprar créditos del proveedor (Super Admin)
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
  
  // Actualizar créditos del bar
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
  const { data, error } = await supabase
    .from('bares')
    .select('*')
    .order('creado_en', { ascending: false })
  
  if (error) throw error
  return data as Bar[]
}

// Crear nuevo bar (Super Admin)
export async function crearBar(nombre: string) {
  const { data, error } = await supabase
    .from('bares')
    .insert([{
      nombre,
      creditos_disponibles: 0,
      precio_compra: 3,
      precio_venta: 5,
      activo: true
    }])
    .select()
    .single()
  
  if (error) throw error
  return data as Bar
}

// Obtener todas las transacciones (Super Admin)
export async function obtenerTodasTransacciones() {
  const { data, error } = await supabase
    .from('transacciones')
    .select('*')
    .order('creado_en', { ascending: false })
  
  if (error) throw error
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
        callbacks.onBarCambio!(payload.new as Bar)
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
