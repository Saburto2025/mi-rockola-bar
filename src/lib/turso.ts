import { createClient } from "@libsql/client";
import crypto from "crypto";

const databaseUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "libsql://dummy-url.turso.io";
const authToken = process.env.TURSO_AUTH_TOKEN || "";

// Crear cliente de Turso
export const client = createClient({
  url: databaseUrl,
  authToken: authToken,
});

// Interfaces de datos (compatibles con la estructura original)
export interface Bar {
  id: string;
  nombre: string;
  creditos_disponibles: number;
  creditos_pantalla: number;
  precio_compra: number;
  precio_venta: number;
  activo: boolean;
  whatsapp?: string;
  correo?: string;
  clave_admin?: string;
  creado_en: string;
  actualizado_en: string;
}

export interface InstanciaRockola {
  id: string;
  bar_id: string;
  creditos_pantalla: number;
  volumen: number;
  pausado: boolean;
  skip_requested: boolean;
}

export interface CancionCola {
  id: string;
  bar_id: string;
  video_id: string;
  titulo: string;
  thumbnail: string;
  canal?: string;
  estado: 'pendiente' | 'aprobada' | 'reproduciendo' | 'completada';
  costo_creditos: number;
  solicitado_por: string;
  posicion: number;
  creado_en: string;
}

export interface Transaccion {
  id: string;
  bar_id: string;
  tipo: 'compra_software' | 'venta_cliente' | 'consumo' | 'acreditacion';
  cantidad: number;
  precio_unitario: number;
  total: number;
  cliente_nombre?: string;
  cancion_titulo?: string;
  descripcion?: string;
  creado_en: string;
}

export interface Cliente {
  id: string;
  bar_id: string;
  nombre: string;
  creditos: number;
  total_gastado: number;
  activo: boolean;
}

// Inicialización automática de la base de datos
export async function initDatabase() {
  try {
    // 1. Tabla bares
    await client.execute(`
      CREATE TABLE IF NOT EXISTS bares (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        creditos_disponibles INTEGER DEFAULT 0,
        creditos_pantalla INTEGER DEFAULT 0,
        precio_compra REAL DEFAULT 40,
        precio_venta REAL DEFAULT 100,
        activo INTEGER DEFAULT 1,
        whatsapp TEXT,
        correo TEXT,
        clave_admin TEXT DEFAULT '1234',
        creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Tabla instancias_rockola
    await client.execute(`
      CREATE TABLE IF NOT EXISTS instancias_rockola (
        id TEXT PRIMARY KEY,
        bar_id TEXT NOT NULL UNIQUE,
        creditos_pantalla INTEGER DEFAULT 0,
        volumen INTEGER DEFAULT 50,
        pausado INTEGER DEFAULT 0,
        skip_requested INTEGER DEFAULT 0,
        creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bar_id) REFERENCES bares(id) ON DELETE CASCADE
      )
    `);

    // 3. Tabla canciones_cola
    await client.execute(`
      CREATE TABLE IF NOT EXISTS canciones_cola (
        id TEXT PRIMARY KEY,
        bar_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        titulo TEXT NOT NULL,
        thumbnail TEXT NOT NULL,
        canal TEXT,
        estado TEXT CHECK(estado IN ('pendiente', 'aprobada', 'reproduciendo', 'completada')),
        costo_creditos INTEGER DEFAULT 1,
        solicitado_por TEXT,
        posicion INTEGER NOT NULL,
        creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bar_id) REFERENCES bares(id) ON DELETE CASCADE
      )
    `);

    // 4. Tabla transacciones
    await client.execute(`
      CREATE TABLE IF NOT EXISTS transacciones (
        id TEXT PRIMARY KEY,
        bar_id TEXT NOT NULL,
        tipo TEXT CHECK(tipo IN ('compra_software', 'venta_cliente', 'consumo', 'acreditacion')),
        cantidad INTEGER NOT NULL,
        precio_unitario REAL NOT NULL,
        total REAL NOT NULL,
        cliente_nombre TEXT,
        cancion_titulo TEXT,
        descripcion TEXT,
        creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bar_id) REFERENCES bares(id) ON DELETE CASCADE
      )
    `);

    // 5. Tabla clientes
    await client.execute(`
      CREATE TABLE IF NOT EXISTS clientes (
        id TEXT PRIMARY KEY,
        bar_id TEXT NOT NULL,
        nombre TEXT NOT NULL,
        creditos INTEGER DEFAULT 0,
        total_gastado REAL DEFAULT 0,
        activo INTEGER DEFAULT 1,
        creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bar_id) REFERENCES bares(id) ON DELETE CASCADE
      )
    `);

    // 6. Tabla solicitudes_recarga
    await client.execute(`
      CREATE TABLE IF NOT EXISTS solicitudes_recarga (
        id TEXT PRIMARY KEY,
        bar_id TEXT NOT NULL,
        cliente_nombre TEXT NOT NULL,
        monto INTEGER NOT NULL,
        estado TEXT CHECK(estado IN ('pendiente', 'aprobada', 'rechazada')) DEFAULT 'pendiente',
        creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bar_id) REFERENCES bares(id) ON DELETE CASCADE
      )
    `);

    console.log("✅ Turso Database tables verified/created successfully.");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    throw error;
  }
}

// Convertidores auxiliares para normalizar tipos booleanos de SQLite (0/1 a true/false)
function mapBar(row: any): Bar {
  return {
    id: row.id,
    nombre: row.nombre,
    creditos_disponibles: Number(row.creditos_disponibles || 0),
    creditos_pantalla: Number(row.creditos_pantalla || 0),
    precio_compra: Number(row.precio_compra || 0),
    precio_venta: Number(row.precio_venta || 0),
    activo: row.activo === 1 || row.activo === true || row.activo === 'true',
    whatsapp: row.whatsapp || undefined,
    correo: row.correo || undefined,
    clave_admin: row.clave_admin || undefined,
    creado_en: row.creado_en,
    actualizado_en: row.actualizado_en,
  };
}

function mapInstancia(row: any): InstanciaRockola {
  return {
    id: row.id,
    bar_id: row.bar_id,
    creditos_pantalla: Number(row.creditos_pantalla || 0),
    volumen: Number(row.volumen || 50),
    pausado: row.pausado === 1 || row.pausado === true || row.pausado === 'true',
    skip_requested: row.skip_requested === 1 || row.skip_requested === true || row.skip_requested === 'true',
  };
}

function mapCancion(row: any): CancionCola {
  return {
    id: row.id,
    bar_id: row.bar_id,
    video_id: row.video_id,
    titulo: row.titulo,
    thumbnail: row.thumbnail,
    canal: row.canal || undefined,
    estado: row.estado,
    costo_creditos: Number(row.costo_creditos || 1),
    solicitado_por: row.solicitado_por,
    posicion: Number(row.posicion || 0),
    creado_en: row.creado_en,
  };
}

function mapTransaccion(row: any): Transaccion {
  return {
    id: row.id,
    bar_id: row.bar_id,
    tipo: row.tipo,
    cantidad: Number(row.cantidad || 0),
    precio_unitario: Number(row.precio_unitario || 0),
    total: Number(row.total || 0),
    cliente_nombre: row.cliente_nombre || undefined,
    cancion_titulo: row.cancion_titulo || undefined,
    descripcion: row.descripcion || undefined,
    creado_en: row.creado_en,
  };
}

function mapCliente(row: any): Cliente {
  return {
    id: row.id,
    bar_id: row.bar_id,
    nombre: row.nombre,
    creditos: Number(row.creditos || 0),
    total_gastado: Number(row.total_gastado || 0),
    activo: row.activo === 1 || row.activo === true || row.activo === 'true',
  };
}

// ============= FUNCIONES API =============

export const verificarConexion = async () => {
  await initDatabase();
  const res = await client.execute("SELECT 1 AS connect");
  return res.rows.length > 0;
};

export async function obtenerBar(barId: string) {
  await initDatabase();
  const res = await client.execute({
    sql: "SELECT * FROM bares WHERE id = ?",
    args: [barId],
  });
  if (res.rows.length === 0) {
    throw new Error("Bar no encontrado");
  }
  return mapBar(res.rows[0]);
}

export async function obtenerInstancia(barId: string) {
  await initDatabase();
  const res = await client.execute({
    sql: "SELECT * FROM instancias_rockola WHERE bar_id = ?",
    args: [barId],
  });
  if (res.rows.length === 0) {
    throw new Error("Instancia de rockola no encontrada");
  }
  return mapInstancia(res.rows[0]);
}

export async function obtenerCola(barId: string) {
  await initDatabase();
  const res = await client.execute({
    sql: "SELECT * FROM canciones_cola WHERE bar_id = ? AND estado IN ('pendiente', 'aprobada', 'reproduciendo') ORDER BY posicion ASC, creado_en ASC",
    args: [barId],
  });
  return res.rows.map(mapCancion);
}

export async function agregarCancionYConsumir(barId: string, cancion: Omit<CancionCola, "id" | "creado_en" | "bar_id">) {
  await initDatabase();
  
  // Obtener estado actual del bar
  const bar = await obtenerBar(barId);
  if (!bar || bar.creditos_pantalla < 1) {
    throw new Error("No hay créditos disponibles en la pantalla");
  }

  const newSongId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Agregar canción
  await client.execute({
    sql: `INSERT INTO canciones_cola (id, bar_id, video_id, titulo, thumbnail, canal, estado, costo_creditos, solicitado_por, posicion, creado_en) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newSongId,
      barId,
      cancion.video_id,
      cancion.titulo,
      cancion.thumbnail,
      cancion.canal || null,
      cancion.estado,
      cancion.costo_creditos || 1,
      cancion.solicitado_por,
      cancion.posicion,
      now,
    ],
  });

  // Descontar crédito de la pantalla en bares
  await client.execute({
    sql: "UPDATE bares SET creditos_pantalla = ? WHERE id = ?",
    args: [bar.creditos_pantalla - 1, barId],
  });

  // Registrar transacción de consumo
  const transId = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO transacciones (id, bar_id, tipo, cantidad, precio_unitario, total, cancion_titulo, descripcion, creado_en)
          VALUES (?, ?, 'consumo', 1, 0, 0, ?, ?, ?)`,
    args: [
      transId,
      barId,
      cancion.titulo,
      `Consumo: ${cancion.titulo}`,
      now,
    ],
  });

  // Retornar la canción recién creada
  const newSongRes = await client.execute({
    sql: "SELECT * FROM canciones_cola WHERE id = ?",
    args: [newSongId],
  });
  return mapCancion(newSongRes.rows[0]);
}

export async function agregarCancion(cancion: Omit<CancionCola, "id" | "creado_en">) {
  await initDatabase();
  const newSongId = crypto.randomUUID();
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO canciones_cola (id, bar_id, video_id, titulo, thumbnail, canal, estado, costo_creditos, solicitado_por, posicion, creado_en) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newSongId,
      cancion.bar_id,
      cancion.video_id,
      cancion.titulo,
      cancion.thumbnail,
      cancion.canal || null,
      cancion.estado,
      cancion.costo_creditos || 1,
      cancion.solicitado_por,
      cancion.posicion,
      now,
    ],
  });

  const songRes = await client.execute({
    sql: "SELECT * FROM canciones_cola WHERE id = ?",
    args: [newSongId],
  });
  return mapCancion(songRes.rows[0]);
}

export async function actualizarEstadoCancion(cancionId: string, estado: CancionCola["estado"]) {
  await initDatabase();
  await client.execute({
    sql: "UPDATE canciones_cola SET estado = ? WHERE id = ?",
    args: [estado, cancionId],
  });
}

export async function eliminarCancion(cancionId: string) {
  await initDatabase();
  await client.execute({
    sql: "DELETE FROM canciones_cola WHERE id = ?",
    args: [cancionId],
  });
}

export async function comprarCreditosProveedor(barId: string, cantidad: number, precioUnitario: number) {
  await initDatabase();
  const total = cantidad * precioUnitario;
  const now = new Date().toISOString();
  const transId = crypto.randomUUID();

  // Crear transacción
  await client.execute({
    sql: `INSERT INTO transacciones (id, bar_id, tipo, cantidad, precio_unitario, total, descripcion, creado_en)
          VALUES (?, ?, 'compra_software', ?, ?, ?, ?, ?)`,
    args: [
      transId,
      barId,
      cantidad,
      precioUnitario,
      total,
      `Compra de ${cantidad} créditos al proveedor`,
      now,
    ],
  });

  // Sumar al stock del bar
  const bar = await obtenerBar(barId);
  if (bar) {
    await client.execute({
      sql: "UPDATE bares SET creditos_disponibles = ? WHERE id = ?",
      args: [bar.creditos_disponibles + cantidad, barId],
    });
  }

  return { cantidad, precioUnitario, total };
}

export async function acreditarCreditosPantalla(barId: string, cantidad: number) {
  await initDatabase();

  const bar = await obtenerBar(barId);
  if (!bar) throw new Error("Bar no encontrado");
  if (bar.creditos_disponibles < cantidad) throw new Error("Stock insuficiente");

  const nuevoStock = bar.creditos_disponibles - cantidad;
  const nuevoPantalla = bar.creditos_pantalla + cantidad;
  const now = new Date().toISOString();

  // Actualizar bar
  await client.execute({
    sql: "UPDATE bares SET creditos_disponibles = ?, creditos_pantalla = ? WHERE id = ?",
    args: [nuevoStock, nuevoPantalla, barId],
  });

  // Registrar transacción
  const transId = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO transacciones (id, bar_id, tipo, cantidad, precio_unitario, total, descripcion, creado_en)
          VALUES (?, ?, 'acreditacion', ?, ?, ?, ?, ?)`,
    args: [
      transId,
      barId,
      cantidad,
      bar.precio_venta,
      cantidad * bar.precio_venta,
      `Acreditación de ${cantidad} créditos a pantalla`,
      now,
    ],
  });

  return { cantidad, nuevoStock, nuevoPantalla };
}

export async function venderCreditosCliente(barId: string, clienteNombre: string, cantidad: number) {
  const result = await acreditarCreditosPantalla(barId, cantidad);
  
  // Buscar o crear cliente y sumarle el saldo (cantidad * precio_venta)
  const bar = await obtenerBar(barId);
  const totalColones = cantidad * (bar.precio_venta || 100);
  const cliente = await obtenerOcrearCliente(barId, clienteNombre);
  await recargarCreditosCliente(cliente.id, totalColones);

  return result;
}

export async function obtenerTransacciones(barId: string, filtros?: {
  fechaInicio?: string;
  fechaFin?: string;
  tipo?: string;
}) {
  await initDatabase();

  let sql = "SELECT * FROM transacciones WHERE bar_id = ?";
  const args: any[] = [barId];

  if (filtros?.tipo && filtros.tipo !== "todos") {
    sql += " AND tipo = ?";
    args.push(filtros.tipo);
  }

  if (filtros?.fechaInicio) {
    sql += " AND creado_en >= ?";
    args.push(filtros.fechaInicio);
  }

  if (filtros?.fechaFin) {
    const fFin = new Date(filtros.fechaFin);
    fFin.setHours(23, 59, 59);
    sql += " AND creado_en <= ?";
    args.push(fFin.toISOString());
  }

  sql += " ORDER BY creado_en DESC";

  const res = await client.execute({ sql, args });
  return res.rows.map(mapTransaccion);
}

export async function actualizarPrecios(barId: string, precioCompra: number, precioVenta: number) {
  await initDatabase();
  await client.execute({
    sql: "UPDATE bares SET precio_compra = ?, precio_venta = ? WHERE id = ?",
    args: [precioCompra, precioVenta, barId],
  });
}

export async function obtenerTodosLosBares() {
  await initDatabase();
  const res = await client.execute("SELECT * FROM bares ORDER BY creado_en DESC");
  return res.rows.map(mapBar);
}

export async function crearBar(nombre: string, whatsapp?: string, correo?: string, claveAdmin?: string) {
  await initDatabase();
  const newBarId = crypto.randomUUID();
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO bares (id, nombre, whatsapp, correo, clave_admin, creditos_disponibles, creditos_pantalla, precio_compra, precio_venta, activo, creado_en, actualizado_en)
          VALUES (?, ?, ?, ?, ?, 0, 0, 40, 100, 1, ?, ?)`,
    args: [
      newBarId,
      nombre,
      whatsapp || null,
      correo || null,
      claveAdmin || "1234",
      now,
      now,
    ],
  });

  return obtenerBar(newBarId);
}

export async function actualizarEstadoBar(barId: string, activo: boolean) {
  await initDatabase();
  await client.execute({
    sql: "UPDATE bares SET activo = ? WHERE id = ?",
    args: [activo ? 1 : 0, barId],
  });
}

export async function eliminarBar(barId: string) {
  await initDatabase();
  await client.execute({ sql: "DELETE FROM transacciones WHERE bar_id = ?", args: [barId] });
  await client.execute({ sql: "DELETE FROM canciones_cola WHERE bar_id = ?", args: [barId] });
  await client.execute({ sql: "DELETE FROM instancias_rockola WHERE bar_id = ?", args: [barId] });
  await client.execute({ sql: "DELETE FROM bares WHERE id = ?", args: [barId] });
}

// ============= CONTROL DE REPRODUCCIÓN =============

export async function obtenerInstanciaControl(barId: string) {
  await initDatabase();
  const res = await client.execute({
    sql: "SELECT * FROM instancias_rockola WHERE bar_id = ?",
    args: [barId],
  });
  if (res.rows.length === 0) return null;
  return mapInstancia(res.rows[0]);
}

export async function crearInstanciaControl(barId: string) {
  await initDatabase();
  const newInstId = crypto.randomUUID();

  await client.execute({
    sql: `INSERT INTO instancias_rockola (id, bar_id, creditos_pantalla, volumen, pausado, skip_requested)
          VALUES (?, ?, 0, 50, 0, 0)`,
    args: [newInstId, barId],
  });

  const res = await client.execute({
    sql: "SELECT * FROM instancias_rockola WHERE id = ?",
    args: [newInstId],
  });
  return mapInstancia(res.rows[0]);
}

export async function togglePausa(barId: string, pausado: boolean) {
  await initDatabase();
  let ctrl = await obtenerInstanciaControl(barId);
  if (!ctrl) {
    await crearInstanciaControl(barId);
  }
  await client.execute({
    sql: "UPDATE instancias_rockola SET pausado = ? WHERE bar_id = ?",
    args: [pausado ? 1 : 0, barId],
  });
}

export async function solicitarSkip(barId: string) {
  await initDatabase();
  let ctrl = await obtenerInstanciaControl(barId);
  if (!ctrl) {
    await crearInstanciaControl(barId);
  }
  await client.execute({
    sql: "UPDATE instancias_rockola SET skip_requested = 1 WHERE bar_id = ?",
    args: [barId],
  });
}

export async function limpiarSkip(barId: string) {
  await initDatabase();
  await client.execute({
    sql: "UPDATE instancias_rockola SET skip_requested = 0 WHERE bar_id = ?",
    args: [barId],
  });
}

export async function actualizarVolumen(barId: string, volumen: number) {
  await initDatabase();
  let ctrl = await obtenerInstanciaControl(barId);
  if (!ctrl) {
    await crearInstanciaControl(barId);
  }
  await client.execute({
    sql: "UPDATE instancias_rockola SET volumen = ? WHERE bar_id = ?",
    args: [volumen, barId],
  });
}

export async function obtenerTodasTransacciones() {
  await initDatabase();
  const res = await client.execute("SELECT * FROM transacciones ORDER BY creado_en DESC");
  return res.rows.map(mapTransaccion);
}

// ============= CLIENTES CON SALDO INDIVIDUAL =============

export async function obtenerOcrearCliente(barId: string, nombre: string): Promise<Cliente> {
  await initDatabase();
  
  // Buscar cliente existente
  const res = await client.execute({
    sql: "SELECT * FROM clientes WHERE bar_id = ? AND nombre = ? AND activo = 1 LIMIT 1",
    args: [barId, nombre],
  });

  if (res.rows.length > 0) {
    return mapCliente(res.rows[0]);
  }

  // Crear nuevo
  const newClientId = crypto.randomUUID();
  await client.execute({
    sql: "INSERT INTO clientes (id, bar_id, nombre, creditos, total_gastado, activo) VALUES (?, ?, ?, 0, 0, 1)",
    args: [newClientId, barId, nombre],
  });

  const newRes = await client.execute({
    sql: "SELECT * FROM clientes WHERE id = ?",
    args: [newClientId],
  });
  return mapCliente(newRes.rows[0]);
}

export async function obtenerCliente(clienteId: string): Promise<Cliente | null> {
  await initDatabase();
  const res = await client.execute({
    sql: "SELECT * FROM clientes WHERE id = ?",
    args: [clienteId],
  });
  if (res.rows.length === 0) return null;
  return mapCliente(res.rows[0]);
}

export async function obtenerClientesBar(barId: string): Promise<Cliente[]> {
  await initDatabase();
  const res = await client.execute({
    sql: "SELECT * FROM clientes WHERE bar_id = ? AND activo = 1 ORDER BY creado_en DESC",
    args: [barId],
  });
  return res.rows.map(mapCliente);
}

export async function actualizarCreditosCliente(clienteId: string, creditos: number): Promise<void> {
  await initDatabase();
  await client.execute({
    sql: "UPDATE clientes SET creditos = ? WHERE id = ?",
    args: [creditos, clienteId],
  });
}

export async function recargarCreditosCliente(clienteId: string, cantidad: number): Promise<Cliente> {
  const cliente = await obtenerCliente(clienteId);
  if (!cliente) throw new Error("Cliente no encontrado");

  const nuevosCreditos = cliente.creditos + cantidad;
  await actualizarCreditosCliente(clienteId, nuevosCreditos);

  return { ...cliente, creditos: nuevosCreditos };
}

export async function descontarCreditoCliente(clienteId: string): Promise<boolean> {
  const cliente = await obtenerCliente(clienteId);
  if (!cliente || cliente.creditos < 1) return false;

  await actualizarCreditosCliente(clienteId, cliente.creditos - 1);
  return true;
}

export async function eliminarCliente(clienteId: string): Promise<void> {
  await initDatabase();
  await client.execute({
    sql: "UPDATE clientes SET activo = 0 WHERE id = ?",
    args: [clienteId],
  });
}

// ============= FUNCIÓN AUXILIAR PARA TRANSACCIONES DIRECTAS =============

export async function crearTransaccion(trans: any) {
  await initDatabase();
  const transId = crypto.randomUUID();
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO transacciones (id, bar_id, tipo, cantidad, precio_unitario, total, cliente_nombre, cancion_titulo, descripcion, creado_en)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      transId,
      trans.bar_id,
      trans.tipo,
      trans.cantidad || 0,
      trans.precio_unitario || 0,
      trans.total || 0,
      trans.cliente_nombre || null,
      trans.cancion_titulo || null,
      trans.descripcion || null,
      now,
    ],
  });
}

// ============= SOLICITUDES DE RECARGA EN COLONES =============

export interface SolicitudRecarga {
  id: string;
  bar_id: string;
  cliente_nombre: string;
  monto: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  creado_en: string;
}

function mapSolicitud(row: any): SolicitudRecarga {
  return {
    id: row.id,
    bar_id: row.bar_id,
    cliente_nombre: row.cliente_nombre,
    monto: Number(row.monto || 0),
    estado: row.estado,
    creado_en: row.creado_en,
  };
}

export async function crearSolicitudRecarga(barId: string, clienteNombre: string, monto: number): Promise<SolicitudRecarga> {
  await initDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO solicitudes_recarga (id, bar_id, cliente_nombre, monto, estado, creado_en)
          VALUES (?, ?, ?, ?, 'pendiente', ?)`,
    args: [id, barId, clienteNombre, monto, now],
  });

  const res = await client.execute({
    sql: "SELECT * FROM solicitudes_recarga WHERE id = ?",
    args: [id],
  });
  return mapSolicitud(res.rows[0]);
}

export async function obtenerSolicitudesPendientes(barId: string): Promise<SolicitudRecarga[]> {
  await initDatabase();
  const res = await client.execute({
    sql: "SELECT * FROM solicitudes_recarga WHERE bar_id = ? AND estado = 'pendiente' ORDER BY creado_en ASC",
    args: [barId],
  });
  return res.rows.map(mapSolicitud);
}

export async function aprobarSolicitudRecarga(solicitudId: string): Promise<void> {
  await initDatabase();
  
  const res = await client.execute({
    sql: "SELECT * FROM solicitudes_recarga WHERE id = ?",
    args: [solicitudId],
  });
  if (res.rows.length === 0) throw new Error("Solicitud no encontrada");
  const sol = mapSolicitud(res.rows[0]);

  if (sol.estado !== 'pendiente') return;

  const bar = await obtenerBar(sol.bar_id);
  const creditos = Math.floor(sol.monto / (bar.precio_venta || 100));

  if (bar.creditos_disponibles < creditos) {
    throw new Error(`Créditos insuficientes en el bar. Se requieren ${creditos} cr, disponibles ${bar.creditos_disponibles} cr.`);
  }

  const nuevoStock = bar.creditos_disponibles - creditos;
  const now = new Date().toISOString();

  // Actualizar bar
  await client.execute({
    sql: "UPDATE bares SET creditos_disponibles = ? WHERE id = ?",
    args: [nuevoStock, sol.bar_id],
  });

  // Buscar o crear cliente y sumarle el monto solicitado
  const cliente = await obtenerOcrearCliente(sol.bar_id, sol.cliente_nombre);
  await recargarCreditosCliente(cliente.id, sol.monto);

  // Actualizar solicitud
  await client.execute({
    sql: "UPDATE solicitudes_recarga SET estado = 'aprobada' WHERE id = ?",
    args: [solicitudId],
  });

  // Registrar transacción
  const transId = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO transacciones (id, bar_id, tipo, cantidad, precio_unitario, total, cliente_nombre, descripcion, creado_en)
          VALUES (?, ?, 'venta_cliente', ?, ?, ?, ?, ?, ?)`,
    args: [
      transId,
      sol.bar_id,
      creditos,
      bar.precio_venta,
      sol.monto,
      sol.cliente_nombre,
      `Venta aprobada de recarga por ${sol.monto} colones`,
      now,
    ],
  });
}

export async function registrarConsumoCreditosCliente(barId: string, clienteNombre: string, monto: number): Promise<void> {
  const cliente = await obtenerOcrearCliente(barId, clienteNombre);
  if (cliente.creditos >= monto) {
    await actualizarCreditosCliente(cliente.id, cliente.creditos - monto);
  }
}

export async function rechazarSolicitudRecarga(solicitudId: string): Promise<void> {
  await initDatabase();
  await client.execute({
    sql: "UPDATE solicitudes_recarga SET estado = 'rechazada' WHERE id = ?",
    args: [solicitudId],
  });
}
