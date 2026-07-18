"use server";

import * as db from './turso'

export async function verificarConexion() { 
  return db.verificarConexion() 
}

export async function obtenerBar(barId: string) { 
  return db.obtenerBar(barId) 
}

export async function obtenerInstancia(barId: string) { 
  return db.obtenerInstancia(barId) 
}

export async function obtenerCola(barId: string) { 
  return db.obtenerCola(barId) 
}

export async function agregarCancionYConsumir(barId: string, cancion: any) { 
  return db.agregarCancionYConsumir(barId, cancion) 
}

export async function agregarCancion(cancion: any) { 
  return db.agregarCancion(cancion) 
}

export async function actualizarEstadoCancion(cancionId: string, estado: any) { 
  return db.actualizarEstadoCancion(cancionId, estado) 
}

export async function eliminarCancion(cancionId: string) { 
  return db.eliminarCancion(cancionId) 
}

export async function comprarCreditosProveedor(barId: string, cantidad: number, precioUnitario: number) { 
  try {
    const res = await db.comprarCreditosProveedor(barId, cantidad, precioUnitario) 
    return { success: true, data: res }
  } catch (err: any) {
    console.error("Error in comprarCreditosProveedor action:", err)
    return { success: false, error: err.message || "Error desconocido" }
  }
}

export async function acreditarCreditosPantalla(barId: string, cantidad: number) { 
  return db.acreditarCreditosPantalla(barId, cantidad) 
}

export async function venderCreditosCliente(barId: string, clienteNombre: string, cantidad: number) { 
  try {
    const res = await db.venderCreditosCliente(barId, clienteNombre, cantidad) 
    return { success: true, data: res }
  } catch (err: any) {
    console.error("Error in venderCreditosCliente action:", err)
    return { success: false, error: err.message || "Error desconocido" }
  }
}

export async function obtenerTransacciones(barId: string, filtros?: any) { 
  return db.obtenerTransacciones(barId, filtros) 
}

export async function actualizarPrecios(barId: string, precioCompra: number, precioVenta: number) { 
  return db.actualizarPrecios(barId, precioCompra, precioVenta) 
}

export async function obtenerTodosLosBares() { 
  return db.obtenerTodosLosBares() 
}

export async function crearBar(nombre: string, whatsapp?: string, correo?: string, claveAdmin?: string) { 
  return db.crearBar(nombre, whatsapp, correo, claveAdmin) 
}

export async function actualizarEstadoBar(barId: string, activo: boolean) { 
  return db.actualizarEstadoBar(barId, activo) 
}

export async function eliminarBar(barId: string) { 
  return db.eliminarBar(barId) 
}

export async function obtenerInstanciaControl(barId: string) { 
  return db.obtenerInstanciaControl(barId) 
}

export async function crearInstanciaControl(barId: string) { 
  return db.crearInstanciaControl(barId) 
}

export async function togglePausa(barId: string, pausado: boolean) { 
  return db.togglePausa(barId, pausado) 
}

export async function solicitarSkip(barId: string) { 
  return db.solicitarSkip(barId) 
}

export async function limpiarSkip(barId: string) { 
  return db.limpiarSkip(barId) 
}

export async function actualizarVolumen(barId: string, volumen: number) { 
  return db.actualizarVolumen(barId, volumen) 
}

export async function obtenerTodasTransacciones() { 
  return db.obtenerTodasTransacciones() 
}

export async function obtenerOcrearCliente(barId: string, nombre: string) { 
  return db.obtenerOcrearCliente(barId, nombre) 
}

export async function obtenerCliente(clienteId: string) { 
  return db.obtenerCliente(clienteId) 
}

export async function obtenerClientesBar(barId: string) { 
  return db.obtenerClientesBar(barId) 
}

export async function actualizarCreditosCliente(clienteId: string, creditos: number) { 
  return db.actualizarCreditosCliente(clienteId, creditos) 
}

export async function recargarCreditosCliente(clienteId: string, cantidad: number) { 
  return db.recargarCreditosCliente(clienteId, cantidad) 
}

export async function descontarCreditoCliente(clienteId: string) { 
  return db.descontarCreditoCliente(clienteId) 
}

export async function eliminarCliente(clienteId: string) { 
  return db.eliminarCliente(clienteId) 
}

export async function crearTransaccion(trans: any) { 
  return db.crearTransaccion(trans) 
}

export async function crearSolicitudRecarga(barId: string, clienteNombre: string, monto: number) {
  try {
    const res = await db.crearSolicitudRecarga(barId, clienteNombre, monto)
    return { success: true, data: res }
  } catch (err: any) {
    console.error("Error in crearSolicitudRecarga action:", err)
    return { success: false, error: err.message || "Error desconocido" }
  }
}

export async function obtenerSolicitudesPendientes(barId: string) {
  return db.obtenerSolicitudesPendientes(barId)
}

export async function aprobarSolicitudRecarga(solicitudId: string) {
  try {
    await db.aprobarSolicitudRecarga(solicitudId)
    return { success: true }
  } catch (err: any) {
    console.error("Error in aprobarSolicitudRecarga action:", err)
    return { success: false, error: err.message || "Error desconocido" }
  }
}

export async function rechazarSolicitudRecarga(solicitudId: string) {
  try {
    await db.rechazarSolicitudRecarga(solicitudId)
    return { success: true }
  } catch (err: any) {
    console.error("Error in rechazarSolicitudRecarga action:", err)
    return { success: false, error: err.message || "Error desconocido" }
  }
}
