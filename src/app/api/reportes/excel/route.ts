import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

interface Transaccion {
  id: string
  tipo: 'compra_software' | 'venta_cliente' | 'consumo'
  cantidad: number
  precioUnitario: number
  total: number
  descripcion: string
  fecha: string
  clienteNombre?: string
}

interface BarData {
  id: string
  nombre: string
  creditos_disponibles: number
  precio_compra: number
  precio_venta: number
}

interface ReporteData {
  transacciones: Transaccion[]
  filtros: {
    fechaInicio: string
    fechaFin: string
    tipo: string
  }
  bar: BarData
}

export async function POST(request: NextRequest) {
  try {
    const data: ReporteData = await request.json()
    const { transacciones, filtros, bar } = data

    // Crear workbook
    const wb = XLSX.utils.book_new()

    // ====== HOJA 1: RESUMEN ======
    const resumenData = [
      ['REPORTE DE ROCKOLA SaaS'],
      [''],
      ['Período:', `${filtros.fechaInicio} a ${filtros.fechaFin}`],
      ['Bar:', bar.nombre],
      ['Fecha de generación:', new Date().toLocaleString()],
      [''],
      ['RESUMEN FINANCIERO'],
      [''],
      ['Concepto', 'Monto ($)'],
      ['Compras al Proveedor', transacciones.filter(t => t.tipo === 'compra_software').reduce((a, t) => a + t.total, 0)],
      ['Ventas a Clientes', transacciones.filter(t => t.tipo === 'venta_cliente').reduce((a, t) => a + t.total, 0)],
      ['Canciones Reproducidas', transacciones.filter(t => t.tipo === 'consumo').length],
      [''],
      ['GANANCIA NETA', 
        transacciones.filter(t => t.tipo === 'venta_cliente').reduce((a, t) => a + t.total, 0) -
        transacciones.filter(t => t.tipo === 'compra_software').reduce((a, t) => a + t.total, 0)
      ],
      [''],
      ['PRECIOS CONFIGURADOS'],
      ['Precio Costo (al proveedor)', bar.precio_compra],
      ['Precio Venta (al cliente)', bar.precio_venta],
      ['Margen por crédito', bar.precio_venta - bar.precio_compra],
      ['Porcentaje de ganancia', `${((bar.precio_venta - bar.precio_compra) / bar.precio_compra * 100).toFixed(0)}%`]
    ]

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    
    // Ajustar anchos de columna
    wsResumen['!cols'] = [
      { wch: 25 },
      { wch: 20 }
    ]

    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

    // ====== HOJA 2: DETALLE DE TRANSACCIONES ======
    const detalleHeaders = [
      'Fecha',
      'Hora',
      'Tipo',
      'Cantidad',
      'Precio Unitario ($)',
      'Total ($)',
      'Cliente',
      'Descripción'
    ]

    const detalleRows = transacciones.map(t => [
      new Date(t.fecha).toLocaleDateString(),
      new Date(t.fecha).toLocaleTimeString(),
      t.tipo === 'compra_software' ? 'Compra Proveedor' :
      t.tipo === 'venta_cliente' ? 'Venta Cliente' : 'Consumo',
      t.cantidad,
      t.precioUnitario,
      t.total,
      t.clienteNombre || '-',
      t.descripcion
    ])

    const wsDetalle = XLSX.utils.aoa_to_sheet([
      ['DETALLE DE TRANSACCIONES'],
      [''],
      detalleHeaders,
      ...detalleRows
    ])

    wsDetalle['!cols'] = [
      { wch: 12 }, // Fecha
      { wch: 10 }, // Hora
      { wch: 18 }, // Tipo
      { wch: 10 }, // Cantidad
      { wch: 18 }, // Precio Unitario
      { wch: 12 }, // Total
      { wch: 20 }, // Cliente
      { wch: 40 }  // Descripción
    ]

    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Transacciones')

    // ====== HOJA 3: ANÁLISIS POR TIPO ======
    const comprasSoftware = transacciones.filter(t => t.tipo === 'compra_software')
    const ventasClientes = transacciones.filter(t => t.tipo === 'venta_cliente')
    const consumos = transacciones.filter(t => t.tipo === 'consumo')

    const analisisData = [
      ['ANÁLISIS POR TIPO DE TRANSACCIÓN'],
      [''],
      ['COMPRAS AL PROVEEDOR'],
      ['Fecha', 'Cantidad', 'Precio Unit.', 'Total'],
      ...comprasSoftware.map(t => [
        new Date(t.fecha).toLocaleString(),
        t.cantidad,
        t.precioUnitario,
        t.total
      ]),
      ['', 
        comprasSoftware.reduce((a, t) => a + t.cantidad, 0),
        '',
        comprasSoftware.reduce((a, t) => a + t.total, 0)
      ],
      [''],
      ['VENTAS A CLIENTES'],
      ['Fecha', 'Cliente', 'Cantidad', 'Precio Unit.', 'Total'],
      ...ventasClientes.map(t => [
        new Date(t.fecha).toLocaleString(),
        t.clienteNombre || '-',
        t.cantidad,
        t.precioUnitario,
        t.total
      ]),
      ['', '',
        ventasClientes.reduce((a, t) => a + t.cantidad, 0),
        '',
        ventasClientes.reduce((a, t) => a + t.total, 0)
      ],
      [''],
      ['CONSUMOS (CANCIONES)'],
      ['Total canciones reproducidas:', consumos.length],
      ['Ingreso generado:', consumos.reduce((a, t) => a + t.total, 0)]
    ]

    const wsAnalisis = XLSX.utils.aoa_to_sheet(analisisData)
    wsAnalisis['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 }
    ]

    XLSX.utils.book_append_sheet(wb, wsAnalisis, 'Análisis')

    // ====== HOJA 4: TOP CLIENTES ======
    const clientesMap = new Map<string, { cantidad: number; total: number }>()
    
    ventasClientes.forEach(t => {
      const nombre = t.clienteNombre || 'Sin nombre'
      const actual = clientesMap.get(nombre) || { cantidad: 0, total: 0 }
      clientesMap.set(nombre, {
        cantidad: actual.cantidad + t.cantidad,
        total: actual.total + t.total
      })
    })

    const topClientes = Array.from(clientesMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 20)

    const clientesData = [
      ['TOP CLIENTES POR VENTAS'],
      [''],
      ['Posición', 'Cliente', 'Créditos Comprados', 'Total Gastado ($)'],
      ...topClientes.map(([nombre, data], idx) => [
        idx + 1,
        nombre,
        data.cantidad,
        data.total
      ])
    ]

    const wsClientes = XLSX.utils.aoa_to_sheet(clientesData)
    wsClientes['!cols'] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 20 },
      { wch: 18 }
    ]

    XLSX.utils.book_append_sheet(wb, wsClientes, 'Top Clientes')

    // Generar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Devolver como respuesta
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="reporte_rockola_${filtros.fechaInicio}_${filtros.fechaFin}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error generando Excel:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte' },
      { status: 500 }
    )
  }
}
