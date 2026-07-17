import {
  verificarConexion,
  obtenerBar,
  obtenerInstancia,
  obtenerCola,
  agregarCancionYConsumir,
  agregarCancion,
  actualizarEstadoCancion,
  eliminarCancion,
  comprarCreditosProveedor,
  acreditarCreditosPantalla,
  venderCreditosCliente,
  obtenerTransacciones,
  actualizarPrecios,
  obtenerTodosLosBares,
  crearBar,
  actualizarEstadoBar,
  eliminarBar,
  obtenerInstanciaControl,
  crearInstanciaControl,
  togglePausa,
  solicitarSkip,
  limpiarSkip,
  actualizarVolumen,
  obtenerTodasTransacciones,
  obtenerOcrearCliente,
  obtenerCliente,
  obtenerClientesBar,
  actualizarCreditosCliente,
  recargarCreditosCliente,
  descontarCreditoCliente,
  eliminarCliente,
  crearTransaccion,
  crearSolicitudRecarga,
  obtenerSolicitudesPendientes,
  aprobarSolicitudRecarga,
  rechazarSolicitudRecarga,
  type Bar,
  type InstanciaRockola,
  type CancionCola,
  type Transaccion,
  type Cliente
} from './actions'

export {
  verificarConexion,
  obtenerBar,
  obtenerInstancia,
  obtenerCola,
  agregarCancionYConsumir,
  agregarCancion,
  actualizarEstadoCancion,
  eliminarCancion,
  comprarCreditosProveedor,
  acreditarCreditosPantalla,
  venderCreditosCliente,
  obtenerTransacciones,
  actualizarPrecios,
  obtenerTodosLosBares,
  crearBar,
  actualizarEstadoBar,
  eliminarBar,
  obtenerInstanciaControl,
  crearInstanciaControl,
  togglePausa,
  solicitarSkip,
  limpiarSkip,
  actualizarVolumen,
  obtenerTodasTransacciones,
  obtenerOcrearCliente,
  obtenerCliente,
  obtenerClientesBar,
  actualizarCreditosCliente,
  recargarCreditosCliente,
  descontarCreditoCliente,
  eliminarCliente,
  crearSolicitudRecarga,
  obtenerSolicitudesPendientes,
  aprobarSolicitudRecarga,
  rechazarSolicitudRecarga
}

export type {
  Bar,
  InstanciaRockola,
  CancionCola,
  Transaccion,
  Cliente
}

export const supabaseConfigured = true;

// Mock supabase client to support page.tsx direct calls (e.g. inserting transaction on line 279)
export const supabase = {
  from: (tableName: string) => {
    return {
      insert: async (rows: any[]) => {
        if (tableName === 'transacciones') {
          try {
            for (const row of rows) {
              await crearTransaccion(row);
            }
            return { data: null, error: null };
          } catch (err: any) {
            console.error('Error inserting transaction through mock supabase:', err);
            return { data: null, error: err };
          }
        }
        console.warn(`Attempted insert to unsupported table "${tableName}" via mock Supabase client.`);
        return { data: null, error: new Error(`Mock table "${tableName}" not implemented`) };
      }
    };
  }
};

// Polling fallback replacement for Supabase Realtime channel subscription
export function suscribirseACambios(barId: string, callbacks: {
  onBarCambio?: (bar: Bar) => void;
  onColaCambio?: (cola: CancionCola[]) => void;
  onTransaccionCambio?: () => void;
  onControlCambio?: (instancia: InstanciaRockola) => void;
  onSolicitudesCambio?: (solicitudes: any[]) => void;
}) {
  let active = true;
  let timerId: any = null;

  // Track old states to avoid unnecessary state triggers in the React app if there are no changes
  let lastBarJson = '';
  let lastColaJson = '';
  let lastControlJson = '';
  let lastSolicitudesJson = '';

  const poll = async () => {
    if (!active) return;
    try {
      if (callbacks.onBarCambio) {
        const bar = await obtenerBar(barId);
        const barJson = JSON.stringify(bar);
        if (active && barJson !== lastBarJson) {
          lastBarJson = barJson;
          callbacks.onBarCambio(bar);
        }
      }
      if (callbacks.onColaCambio) {
        const cola = await obtenerCola(barId);
        const colaJson = JSON.stringify(cola);
        if (active && colaJson !== lastColaJson) {
          lastColaJson = colaJson;
          callbacks.onColaCambio(cola);
        }
      }
      if (callbacks.onSolicitudesCambio) {
        const { obtenerSolicitudesPendientes } = await import('./actions');
        const pends = await obtenerSolicitudesPendientes(barId);
        const pendsJson = JSON.stringify(pends);
        if (active && pendsJson !== lastSolicitudesJson) {
          lastSolicitudesJson = pendsJson;
          callbacks.onSolicitudesCambio(pends);
        }
      }
      if (callbacks.onControlCambio) {
        const ctrl = await obtenerInstanciaControl(barId);
        if (active) {
          if (ctrl) {
            const ctrlJson = JSON.stringify(ctrl);
            if (ctrlJson !== lastControlJson) {
              lastControlJson = ctrlJson;
              callbacks.onControlCambio(ctrl);
            }
          } else {
            if (lastControlJson !== 'null') {
              lastControlJson = 'null';
              // Instancia no existe o eliminada
            }
          }
        }
      }
    } catch (e) {
      console.error("Error in suscribirseACambios polling loop:", e);
    }

    if (active) {
      timerId = setTimeout(poll, 2500); // Poll every 2.5 seconds
    }
  };

  poll();

  return () => {
    active = false;
    if (timerId) clearTimeout(timerId);
  };
}
