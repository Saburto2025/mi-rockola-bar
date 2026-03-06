'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import YouTube, { YouTubeEvent } from 'react-youtube'
import {
  Play, Pause, SkipForward, Volume2, VolumeX,
  Users, CreditCard, Music, Search, Trash2, Check, X, Crown,
  DollarSign, Video, BarChart3, Building, Loader2, Wifi, WifiOff, ShoppingCart,
  Plus, Minus, LogOut, Copy, Calendar, TrendingUp, ExternalLink
} from 'lucide-react'
import { supabase, obtenerBar, obtenerCola, agregarCancion, actualizarEstadoCancion, eliminarCancion, obtenerTransacciones, comprarCreditosProveedor, venderCreditosCliente, actualizarPrecios, suscribirseACambios, obtenerTodosLosBares, crearBar, obtenerTodasTransacciones, type Bar, type CancionCola, type Transaccion } from '@/lib/supabase'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

// ============= CONFIGURACIÓN =============
const CLAVE_ADMIN = "1234"
const CLAVE_SUPER_ADMIN = "rockola2024"
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || ""

// ============= FUNCIÓN PARA VALIDAR UUID =============
const esUUIDValido = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

interface VideoBusqueda {
  id: { videoId: string }
  snippet: {
    title: string
    thumbnails: { default: { url: string }; medium: { url: string } }
    channelTitle: string
    description: string
  }
  duracionMinutos?: number
  duracionFormateada?: string
}

export default function RockolaSaaS() {
  // ============= DETECTAR MODO POR URL =============
  const [modo, setModo] = useState<'tv' | 'cliente' | 'admin' | 'superadmin'>('tv')
  
  // ============= ESTADOS GENERALES =============
  const [bar, setBar] = useState<Bar | null>(null)
  const [bares, setBares] = useState<Bar[]>([])
  const [cola, setCola] = useState<CancionCola[]>([])
  const [cancionActual, setCancionActual] = useState<CancionCola | null>(null)
  const [volumen, setVolumen] = useState(50)
  const [pausado, setPausado] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [conectado, setConectado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============= ESTADOS DE AUTENTICACIÓN =============
  const [claveInput, setClaveInput] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)
  const [barSeleccionado, setBarSeleccionado] = useState<Bar | null>(null)

  // ============= ESTADOS DE BÚSQUEDA =============
  const [busqueda, setBusqueda] = useState('')
  const [videosBusqueda, setVideosBusqueda] = useState<VideoBusqueda[]>([])
  const [buscando, setBuscando] = useState(false)

  // ============= ESTADOS DE CLIENTE =============
  const [nombreCliente, setNombreCliente] = useState('')
  const [creditosCliente, setCreditosCliente] = useState(0)
  const [clienteRegistrado, setClienteRegistrado] = useState(false)
  const [modalRecarga, setModalRecarga] = useState(false)
  const [creditosRecarga, setCreditosRecarga] = useState('')

  // ============= ESTADOS DE MODAL =============
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false)
  const [creditosAVender, setCreditosAVender] = useState(0)
  const [nombreClienteInput, setNombreClienteInput] = useState('')

  // ============= ESTADOS DE TRANSACCIONES =============
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [todasTransacciones, setTodasTransacciones] = useState<Transaccion[]>([])
  
  // ============= ESTADO PARA NUEVO BAR CREADO =============
  const [nuevoBarCreado, setNuevoBarCreado] = useState<{bar: Bar, claveAdmin: string} | null>(null)
  
  // ============= ESTADO PARA VER LINKS DE BAR EXISTENTE =============
  const [barParaVerLinks, setBarParaVerLinks] = useState<Bar | null>(null)
  
  // ============= ESTADOS PARA FORMULARIO NUEVO BAR =============
  const [nuevoBarNombre, setNuevoBarNombre] = useState('')
  const [nuevoBarWhatsApp, setNuevoBarWhatsApp] = useState('')
  const [nuevoBarCorreo, setNuevoBarCorreo] = useState('')
  const [nuevoBarClave, setNuevoBarClave] = useState('')
  const [creandoBar, setCreandoBar] = useState(false)

  // ============= PLAYER =============
  const [player, setPlayer] = useState<any>(null)
  const playerRef = useRef<any>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // ============= URL ACTUAL =============
  const [currentUrl, setCurrentUrl] = useState('')

  // ============= BAR ID ACTUAL =============
  const [urlBarId, setUrlBarId] = useState<string>('')
  
  // ============= DETECTAR MODO Y BAR ID AL CARGAR =============
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const modoUrl = params.get('modo')
    const barIdUrl = params.get('bar')
    
    if (barIdUrl) {
      setUrlBarId(barIdUrl)
    }
    
    if (modoUrl === 'cliente') setModo('cliente')
    else if (modoUrl === 'admin') setModo('admin')
    else if (modoUrl === 'superadmin') setModo('superadmin')
    else setModo('tv')

    setCurrentUrl(window.location.origin)
  }, [])
  
  const barId = urlBarId || barSeleccionado?.id || bar?.id || ''

  // ============= CARGAR DATOS SEGÚN MODO =============
  const cargarDatos = async (barIdToUse?: string, isRefresh: boolean = false) => {
    try {
      // Solo mostrar pantalla de carga en la carga inicial, no en actualizaciones
      if (!isRefresh) {
        setCargando(true)
      }
      setError(null)

      if (modo === 'superadmin') {
        const baresData = await obtenerTodosLosBares()
        setBares(baresData)
        const transData = await obtenerTodasTransacciones()
        setTodasTransacciones(transData)
        setConectado(true)
        return
      }

      const id = barIdToUse || barId
      if (!id) {
        setCargando(false)
        return
      }
      
      // Validar que el ID sea un UUID válido
      if (!esUUIDValido(id)) {
        setError('URL inválida: El ID del bar no es válido. Por favor usa el link correcto proporcionado por el administrador.')
        setCargando(false)
        return
      }

      const barData = await obtenerBar(id)
      setBar(barData)

      const colaData = await obtenerCola(id)
      setCola(colaData)

      const actual = colaData.find(c => c.estado === 'reproduciendo')
      setCancionActual(actual || null)

      const transData = await obtenerTransacciones(id)
      setTransacciones(transData)

      setConectado(true)
    } catch (err: any) {
      console.error('Error cargando datos:', err)
      setError(err.message || 'Error al conectar con la base de datos')
      setConectado(false)
    } finally {
      setCargando(false)
    }
  }

  // ============= SUSCRIPCIÓN A CAMBIOS =============
  useEffect(() => {
    if (!barId && modo !== 'superadmin') return
    
    cargarDatos()

    unsubscribeRef.current = suscribirseACambios(barId, {
      onBarCambio: (nuevoBar) => {
        // Solo actualizar si hay cambios reales - EVITA PARPADEO
        setBar(prev => {
          if (prev?.id === nuevoBar.id && prev?.creditos_disponibles === nuevoBar.creditos_disponibles) {
            return prev // No cambiar si es igual
          }
          return nuevoBar
        })
        if (barSeleccionado?.id === nuevoBar.id) {
          setBarSeleccionado(nuevoBar)
        }
      },
      onColaCambio: (nuevaCola) => {
        setCola(nuevaCola)
        const actual = nuevaCola.find(c => c.estado === 'reproduciendo')
        setCancionActual(actual || null)
      },
      onTransaccionCambio: () => {
        if (barId) obtenerTransacciones(barId).then(setTransacciones)
      }
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [modo, barId])

  // ============= FUNCIÓN DE BÚSQUEDA YOUTUBE =============
  const buscarVideos = async () => {
    if (!busqueda.trim()) return
    setBuscando(true)

    try {
      const query = encodeURIComponent(busqueda)
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${query}&type=video&key=${YOUTUBE_API_KEY}`

      const res = await fetch(url)
      const data = await res.json()

      if (data.items && data.items.length > 0) {
        const videoIds = data.items.map((v: VideoBusqueda) => v.id.videoId).join(',')
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
        const detailsRes = await fetch(detailsUrl)
        const detailsData = await detailsRes.json()

        const videosConDuracion = data.items.map((v: VideoBusqueda) => {
          const detail = detailsData.items?.find((d: any) => d.id === v.id.videoId)
          const duration = detail?.contentDetails?.duration || ''
          const minutos = parseDuration(duration)
          return { 
            ...v, 
            duracionMinutos: minutos,
            duracionFormateada: formatDuration(minutos)
          }
        })

        setVideosBusqueda(videosConDuracion)
      } else {
        setVideosBusqueda([])
      }
    } catch (error) {
      console.error('Error buscando:', error)
      setVideosBusqueda([])
    }
    setBuscando(false)
  }

  const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    const hours = parseInt((match?.[1] || '0H').replace('H', '')) || 0
    const minutes = parseInt((match?.[2] || '0M').replace('M', '')) || 0
    return hours * 60 + minutes
  }

  const formatDuration = (minutos: number): string => {
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}` : `${m}:00`
  }

  // ============= FUNCIONES DE COLA - PISCINA DE CRÉDITOS =============
  const agregarACola = async (video: VideoBusqueda) => {
    if (!bar) return
    
    // Verificar créditos de la piscina
    const creditosPiscina = bar.creditos_disponibles || 0
    if (creditosPiscina < 1) {
      alert(`❌ No hay créditos disponibles. Pide al administrador que recargue la piscina.`)
      return
    }

    try {
      // Agregar canción a la cola DIRECTAMENTE APROBADA (ya pagó)
      await agregarCancion({
        bar_id: bar.id,
        video_id: video.id.videoId,
        titulo: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
        canal: video.snippet.channelTitle,
        estado: 'aprobada', // DIRECTAMENTE APROBADA - ya descontó créditos
        costo_creditos: 1,
        precio_venta: 1,
        solicitado_por: 'Cliente',
        posicion: cola.length
      })

      // Descontar 1 crédito de la piscina en la base de datos
      const { error: updateError } = await supabase
        .from('bares')
        .update({ creditos_disponibles: creditosPiscina - 1 })
        .eq('id', bar.id)
      
      if (updateError) throw updateError
      
      // Registrar transacción
      await supabase.from('transacciones').insert([{
        bar_id: bar.id,
        tipo: 'consumo',
        cantidad: 1,
        precio_unitario: 1,
        total: 1,
        cancion_titulo: video.snippet.title,
        descripcion: `Video solicitado: ${video.snippet.title}`
      }])

      // Actualizar estado local
      setBar({ ...bar, creditos_disponibles: creditosPiscina - 1 })

      // NO limpiar búsqueda para permitir agregar más canciones
      alert(`✅ "${video.snippet.title.substring(0, 30)}..." agregado a la cola. Créditos restantes: ${creditosPiscina - 1}`)
    } catch (error) {
      console.error('Error agregando video:', error)
      alert('❌ Error al agregar video')
    }
  }

  const aprobarCancion = async (cancionId: string) => {
    try {
      await actualizarEstadoCancion(cancionId, 'aprobada')
    } catch (error) {
      console.error('Error aprobando:', error)
      alert('❌ Error al aprobar')
    }
  }

  const rechazarCancion = async (cancionId: string) => {
    try {
      await eliminarCancion(cancionId)
    } catch (error) {
      console.error('Error rechazando:', error)
    }
  }

  const eliminarDeCola = async (cancionId: string) => {
    try {
      await eliminarCancion(cancionId)
    } catch (error) {
      console.error('Error eliminando:', error)
    }
  }

  // ============= REPRODUCCIÓN =============
  const reproducirSiguiente = useCallback(async () => {
    const colaAprobada = cola.filter(c => c.estado === 'aprobada')

    if (colaAprobada.length > 0) {
      const siguiente = colaAprobada[0]
      try {
        await actualizarEstadoCancion(siguiente.id, 'reproduciendo')
        setCancionActual(siguiente)
      } catch (error) {
        console.error('Error reproduciendo:', error)
      }
    } else {
      setCancionActual(null)
    }
  }, [cola])

  const onVideoEnd = useCallback(async () => {
    if (cancionActual) {
      try {
        await eliminarCancion(cancionActual.id)
        setCancionActual(null)
        setTimeout(() => reproducirSiguiente(), 500)
      } catch (error) {
        console.error('Error terminando video:', error)
      }
    }
  }, [cancionActual, reproducirSiguiente])

  const onPlayerReady = (event: YouTubeEvent) => {
    playerRef.current = event.target
    setPlayer(event.target)
    event.target.setVolume(volumen)
  }

  const togglePause = () => {
    if (player) {
      if (pausado) {
        player.playVideo()
      } else {
        player.pauseVideo()
      }
      setPausado(!pausado)
    }
  }

  const cambiarVolumen = (nuevoVolumen: number) => {
    if (player) {
      player.setVolume(nuevoVolumen)
    }
    setVolumen(nuevoVolumen)
  }

  // ============= TRANSACCIONES =============
  const comprarCreditosSoftware = async (cantidad: number, precioUnitario: number) => {
    if (!barSeleccionado) return
    try {
      await comprarCreditosProveedor(barSeleccionado.id, cantidad, precioUnitario)
      // Usar isRefresh=true para evitar parpadeo
      await cargarDatos(undefined, true)
      alert(`✅ Vendidos ${cantidad} créditos a $${precioUnitario} c/u = $${cantidad * precioUnitario}`)
    } catch (error) {
      console.error('Error vendiendo créditos:', error)
      alert('❌ Error al vender créditos')
    }
  }

  const abrirModalCliente = (cantidad: number) => {
    setCreditosAVender(cantidad)
    setNombreClienteInput('')
    setModalClienteAbierto(true)
  }

  const confirmarVentaCliente = async () => {
    if (!nombreClienteInput.trim()) {
      alert('❌ Ingresa el nombre del cliente')
      return
    }
    if (!bar) return
    
    try {
      await venderCreditosCliente(bar.id, nombreClienteInput.trim(), creditosAVender)
      // Usar isRefresh=true para evitar parpadeo
      await cargarDatos(undefined, true)
      setModalClienteAbierto(false)
      alert(`✅ Vendidos ${creditosAVender} créditos a ${nombreClienteInput.trim()} = $${creditosAVender * bar.precio_venta}`)
    } catch (error: any) {
      console.error('Error vendiendo:', error)
      alert(error.message || '❌ Error al vender créditos')
    }
  }

  // ============= CREAR NUEVO BAR =============
  const handleCrearBar = async () => {
    if (!nuevoBarNombre.trim()) {
      alert('❌ Ingresa el nombre del bar')
      return
    }
    
    setCreandoBar(true)
    try {
      const nuevoBar = await crearBar(
        nuevoBarNombre.trim(),
        nuevoBarWhatsApp.trim() || undefined,
        nuevoBarCorreo.trim() || undefined,
        nuevoBarClave.trim() || '1234'
      )
      
      // Mostrar los links del nuevo bar
      setNuevoBarCreado({
        bar: nuevoBar,
        claveAdmin: nuevoBarClave.trim() || '1234'
      })
      
      // Limpiar formulario
      setNuevoBarNombre('')
      setNuevoBarWhatsApp('')
      setNuevoBarCorreo('')
      setNuevoBarClave('')
      
      // Recargar lista de bares
      await cargarDatos(undefined, true)
      
    } catch (error: any) {
      console.error('Error creando bar:', error)
      alert('❌ Error al crear el bar: ' + error.message)
    }
    setCreandoBar(false)
  }

  // ============= REPRODUCIR SIGUIENTE AUTOMÁTICAMENTE =============
  useEffect(() => {
    if (modo === 'tv' && !cancionActual && cola.filter(c => c.estado === 'aprobada').length > 0) {
      reproducirSiguiente()
    }
  }, [modo, cancionActual, cola, reproducirSiguiente])

  // ============= URLS EXCLUSIVAS =============
  const getUrlCliente = (barIdParam?: string) => {
    const id = barIdParam || barId
    return id ? `${currentUrl}?bar=${id}&modo=cliente` : `${currentUrl}?modo=cliente`
  }
  const getUrlAdmin = (barIdParam?: string) => {
    const id = barIdParam || barId
    return id ? `${currentUrl}?bar=${id}&modo=admin` : `${currentUrl}?modo=admin`
  }
  const getUrlTV = (barIdParam?: string) => {
    const id = barIdParam || barId
    return id ? `${currentUrl}?bar=${id}` : currentUrl
  }
  const getUrlSuperAdmin = () => `${currentUrl}?modo=superadmin`

  const copiarUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    alert('✅ Link copiado al portapapeles')
  }

  // ============= PANTALLA DE CARGA =============
  if (cargando && modo !== 'tv') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Conectando...</p>
        </div>
      </div>
    )
  }

  // ============= PANTALLA DE ERROR =============
  if (error && modo !== 'tv') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <WifiOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error de Conexión</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => cargarDatos()} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ============= MODAL PARA NOMBRE DE CLIENTE (ADMIN) =============
  const ModalNombreCliente = () => (
    <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 ${modalClienteAbierto ? '' : 'hidden'}`}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-bold text-gray-800 mb-4">📝 Nombre del Cliente</h3>
        <p className="text-gray-600 mb-4">Vendiendo <strong>{creditosAVender} crédito{creditosAVender > 1 ? 's' : ''}</strong> (${bar ? creditosAVender * bar.precio_venta : 0})</p>
        <input
          type="text"
          value={nombreClienteInput}
          onChange={(e) => setNombreClienteInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirmarVentaCliente()}
          placeholder="Escribe el nombre completo..."
          autoFocus
          className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg mb-4 focus:border-green-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <button 
            onClick={() => setModalClienteAbierto(false)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={confirmarVentaCliente}
            disabled={!nombreClienteInput.trim()}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )

  // ============= MODAL PARA RECARGA DE CRÉDITOS (CLIENTE) =============
  const ModalRecargaCreditos = () => (
    <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 ${modalRecarga ? '' : 'hidden'}`}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-bold text-gray-800 mb-4">💰 Recargar Créditos</h3>
        <p className="text-gray-600 mb-4">Ingresa la cantidad de créditos que el administrador te ha vendido:</p>
        <input
          type="number"
          value={creditosRecarga}
          onChange={(e) => setCreditosRecarga(e.target.value)}
          placeholder="Cantidad de créditos..."
          autoFocus
          className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg mb-4 focus:border-green-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <button 
            onClick={() => { setModalRecarga(false); setCreditosRecarga('') }}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => {
              const creditos = parseInt(creditosRecarga)
              if (creditos > 0) {
                setCreditosCliente(creditos)
                setModalRecarga(false)
                setCreditosRecarga('')
                alert(`✅ Saldo actualizado a ${creditos} créditos`)
              }
            }}
            disabled={!creditosRecarga || parseInt(creditosRecarga) <= 0}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )

  // ============= MODAL LINKS NUEVO BAR - PROFESIONAL PARA ENTREGAR AL CLIENTE =============
  const ModalLinksNuevoBar = () => (
    <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 ${nuevoBarCreado ? '' : 'hidden'}`}>
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-purple-500/30">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-black text-white">¡Bar Creado Exitosamente!</h3>
          <p className="text-purple-400 text-lg font-medium mt-1">{nuevoBarCreado?.bar.nombre}</p>
          <p className="text-gray-400 text-sm mt-2">Entrega esta información al dueño del bar</p>
        </div>
        
        {/* Links y credenciales */}
        <div className="space-y-4 mb-6">
          {/* Link TV */}
          <div className="bg-purple-900/50 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📺</span>
              <p className="text-purple-300 font-bold">Pantalla TV (Pantalla grande del bar)</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-black/50 text-purple-200 px-3 py-2 rounded-lg flex-1 break-all">{getUrlTV(nuevoBarCreado?.bar.id)}</code>
              <button 
                onClick={() => copiarUrl(getUrlTV(nuevoBarCreado?.bar.id))} 
                className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg transition-colors"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Link Cliente */}
          <div className="bg-green-900/50 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">👤</span>
              <p className="text-green-300 font-bold">Vista Cliente (Para pedir música)</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-black/50 text-green-200 px-3 py-2 rounded-lg flex-1 break-all">{getUrlCliente(nuevoBarCreado?.bar.id)}</code>
              <button 
                onClick={() => copiarUrl(getUrlCliente(nuevoBarCreado?.bar.id))} 
                className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition-colors"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Link Admin */}
          <div className="bg-yellow-900/50 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔑</span>
              <p className="text-yellow-300 font-bold">Panel Admin (Solo para el dueño)</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-black/50 text-yellow-200 px-3 py-2 rounded-lg flex-1 break-all">{getUrlAdmin(nuevoBarCreado?.bar.id)}</code>
              <button 
                onClick={() => copiarUrl(getUrlAdmin(nuevoBarCreado?.bar.id))} 
                className="bg-yellow-600 hover:bg-yellow-500 text-black p-2 rounded-lg transition-colors"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Clave Admin */}
          <div className="bg-red-900/50 rounded-xl p-4 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔐</span>
                <div>
                  <p className="text-red-300 font-bold">Clave de Acceso Admin</p>
                  <p className="text-red-400/70 text-xs">¡IMPORTANTE! Guardar esta clave</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-white font-mono">{nuevoBarCreado?.claveAdmin}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Info adicional */}
        <div className="bg-blue-900/30 rounded-xl p-4 mb-6 border border-blue-500/20">
          <p className="text-blue-300 text-sm">
            <strong>💡 Instrucciones para el dueño:</strong>
          </p>
          <ul className="text-blue-200/80 text-xs mt-2 space-y-1 list-disc list-inside">
            <li>Usa el link <strong>TV</strong> en una pantalla grande visible para todos</li>
            <li>Comparte el link <strong>Cliente</strong> con tus clientes (QR, WhatsApp, etc.)</li>
            <li>El link <strong>Admin</strong> y la <strong>Clave</strong> son SOLO para ti</li>
          </ul>
        </div>
        
        <button 
          onClick={() => setNuevoBarCreado(null)}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold py-4 rounded-xl transition-all text-lg shadow-lg"
        >
          ✓ Listo, cerrar
        </button>
      </div>
    </div>
  )

  // ============= MODAL VER LINKS DE BAR EXISTENTE =============
  const ModalVerLinksBar = () => (
    <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 ${barParaVerLinks ? '' : 'hidden'}`}>
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-blue-500/30">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4">
            <ExternalLink className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-black text-white">Links de {barParaVerLinks?.nombre}</h3>
          <p className="text-gray-400 text-sm mt-2">Copia los links para entregar al dueño del bar</p>
        </div>
        
        {/* Links y credenciales */}
        <div className="space-y-4 mb-6">
          {/* Link TV */}
          <div className="bg-purple-900/50 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📺</span>
              <p className="text-purple-300 font-bold">Pantalla TV</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-black/50 text-purple-200 px-3 py-2 rounded-lg flex-1 break-all">{getUrlTV(barParaVerLinks?.id)}</code>
              <button 
                onClick={() => copiarUrl(getUrlTV(barParaVerLinks?.id))} 
                className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg transition-colors"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Link Cliente */}
          <div className="bg-green-900/50 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">👤</span>
              <p className="text-green-300 font-bold">Vista Cliente</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-black/50 text-green-200 px-3 py-2 rounded-lg flex-1 break-all">{getUrlCliente(barParaVerLinks?.id)}</code>
              <button 
                onClick={() => copiarUrl(getUrlCliente(barParaVerLinks?.id))} 
                className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition-colors"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Link Admin */}
          <div className="bg-yellow-900/50 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔑</span>
              <p className="text-yellow-300 font-bold">Panel Admin</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-black/50 text-yellow-200 px-3 py-2 rounded-lg flex-1 break-all">{getUrlAdmin(barParaVerLinks?.id)}</code>
              <button 
                onClick={() => copiarUrl(getUrlAdmin(barParaVerLinks?.id))} 
                className="bg-yellow-600 hover:bg-yellow-500 text-black p-2 rounded-lg transition-colors"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Clave Admin */}
          <div className="bg-red-900/50 rounded-xl p-4 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔐</span>
                <p className="text-red-300 font-bold">Clave de Acceso Admin</p>
              </div>
              <p className="text-3xl font-black text-white font-mono">{barParaVerLinks?.clave_admin || '1234'}</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setBarParaVerLinks(null)}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-bold py-4 rounded-xl transition-all text-lg shadow-lg"
        >
          Cerrar
        </button>
      </div>
    </div>
  )

  // ================================================================
  // MODO TV - PANTALLA ATRACTIVA SIN QR, MUESTRA CRÉDITOS
  // ================================================================
  if (modo === 'tv') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950 via-black to-blue-950 overflow-hidden">
        {/* Header con nombre del bar y créditos */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-6">
          <div className="flex justify-between items-start max-w-7xl mx-auto">
            <div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 drop-shadow-lg">
                🎵 ROCKOLA
              </h1>
              <p className="text-white/80 text-xl mt-1">{bar?.nombre || 'Cargando...'}</p>
            </div>
            <div className="text-right">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl px-6 py-3 shadow-2xl">
                <p className="text-black/70 text-sm font-medium">CRÉDITOS DISPONIBLES</p>
                <p className="text-black text-4xl font-black">{bar?.creditos_disponibles || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        {cancionActual ? (
          <div className="absolute inset-0 flex items-center justify-center pt-24">
            <YouTube
              videoId={cancionActual.video_id}
              opts={{
                width: '100%',
                height: '100%',
                playerVars: { 
                  autoplay: 1, 
                  controls: 0,
                  modestbranding: 1,
                  rel: 0,
                  showinfo: 0,
                  iv_load_policy: 3,
                  disablekb: 1,
                  fs: 0,
                  playsinline: 1,
                  origin: typeof window !== 'undefined' ? window.location.origin : ''
                }
              }}
              onReady={onPlayerReady}
              onEnd={onVideoEnd}
              className="w-full h-full"
              iframeClassName="w-full h-full absolute inset-0"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pointer-events-none">
              <div className="max-w-4xl mx-auto">
                <p className="text-white text-2xl font-bold truncate mb-1">{cancionActual.titulo}</p>
                <p className="text-yellow-400 text-lg">🎵 Solicitado por: {cancionActual.solicitado_por}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              {/* Animación de notas musicales */}
              <div className="relative mb-8">
                <div className="absolute inset-0 blur-3xl bg-purple-500/30 rounded-full scale-150"></div>
                <Music className="w-40 h-40 text-purple-400 mx-auto animate-pulse relative z-10" />
              </div>
              <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 mb-4">
                🎵 ROCKOLA
              </h2>
              <p className="text-white/60 text-2xl mb-2">{bar?.nombre || ''}</p>
              <p className="text-purple-300 text-xl animate-pulse">Esperando canciones...</p>
              <p className="text-white/40 text-lg mt-6">Pide tu música al administrador</p>
            </div>
          </div>
        )}

        {/* Cola de reproducción en la parte inferior */}
        {cola.filter(c => c.estado === 'aprobada').length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent p-4 pointer-events-none">
            <div className="max-w-4xl mx-auto">
              <p className="text-white/60 text-sm mb-2">📋 Próximas canciones:</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {cola.filter(c => c.estado === 'aprobada').slice(0, 5).map((cancion, idx) => (
                  <div key={cancion.id} className="flex-shrink-0 bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                    <p className="text-white text-sm font-medium truncate max-w-[200px]">{idx + 1}. {cancion.titulo}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ================================================================
  // MODO CLIENTE - PISCINA DE CRÉDITOS COMPARTIDA (SIN LOGIN)
  // ================================================================
  if (modo === 'cliente') {
    // Pantalla inicial - Solo botón ACTIVAR
    if (!clienteRegistrado) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 max-w-md w-full shadow-2xl border border-purple-500/30 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 blur-3xl bg-purple-500/20 rounded-full scale-150"></div>
              <Music className="w-24 h-24 text-purple-400 mx-auto relative z-10" />
            </div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 mb-2">🎵 ROCKOLA</h2>
            <p className="text-purple-300 text-xl mb-2">{bar?.nombre}</p>
            <p className="text-gray-400 mb-8">Pide tu música favorita</p>
            
            <div className="bg-gradient-to-r from-yellow-600 to-orange-500 rounded-2xl p-4 mb-6">
              <p className="text-black/70 text-sm">CRÉDITOS DISPONIBLES</p>
              <p className="text-black text-5xl font-black">{bar?.creditos_disponibles || 0}</p>
            </div>
            
            <button
              onClick={() => setClienteRegistrado(true)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold py-5 rounded-2xl transition-all text-xl shadow-lg flex items-center justify-center gap-3"
            >
              <Play className="w-8 h-8" /> ACTIVAR
            </button>
            
            <p className="text-gray-500 text-xs mt-4">1 crédito = 1 canción</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header simplificado */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold">🍻 ROCKOLA</h1>
                <p className="text-sm opacity-80">{bar?.nombre}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500 text-black px-4 py-2 rounded-full font-bold text-lg">
                  💰 {bar?.creditos_disponibles || 0} créditos
                </div>
                <button onClick={() => setClienteRegistrado(false)} className="bg-black/20 p-2 rounded-lg hover:bg-black/30">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Créditos de la piscina - SIN botón recargar */}
          <div className="bg-gradient-to-r from-yellow-600 to-orange-500 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-black/70 text-sm font-medium">CRÉDITOS DISPONIBLES</p>
                <p className="text-black text-4xl font-black">{bar?.creditos_disponibles || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-black/70 text-sm">Pide tus canciones al admin</p>
                <p className="text-black font-bold">1 crédito = 1 canción</p>
              </div>
            </div>
          </div>

          {/* Buscador */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="font-bold mb-3 text-lg">🔍 Buscar Música o Videos</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarVideos()}
                placeholder="Artista, canción, video..."
                className="flex-1 bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              <button onClick={buscarVideos} disabled={buscando} className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 px-6 py-3 rounded-lg font-bold transition-colors">
                {buscando ? '⏳' : '🔍'}
              </button>
            </div>

            {/* RESULTADOS CON BOTÓN AGREGAR VERDE */}
            {videosBusqueda.length > 0 && (
              <div className="border-t border-gray-700 pt-3">
                <p className="text-gray-400 text-sm mb-2">Resultados ({videosBusqueda.length}) - Click para agregar:</p>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {videosBusqueda.map((video, index) => (
                    <div
                      key={video.id.videoId}
                      onClick={() => agregarACola(video)}
                      className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg cursor-pointer transition-colors flex items-center gap-3"
                    >
                      <span className="text-gray-500 font-bold w-6 text-center text-sm">{index + 1}</span>
                      <img src={video.snippet.thumbnails.default.url} alt="" className="w-12 h-9 rounded object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.snippet.title}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{video.snippet.channelTitle}</span>
                          <span>•</span>
                          <span className="text-blue-400">{video.duracionFormateada}</span>
                          <span>•</span>
                          <span className="text-yellow-400">1 crédito</span>
                        </div>
                      </div>
                      <span className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-lg font-bold text-sm">
                        Agregar
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cola de reproducción */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="font-bold mb-3 text-lg">🎵 Cola General</h3>
            
            {cancionActual && (
              <div className="bg-green-600 p-3 rounded-lg mb-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center animate-pulse">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate text-sm">{cancionActual.titulo}</p>
                  <p className="text-xs opacity-80">▶️ Reproduciendo ahora</p>
                </div>
              </div>
            )}

            <div className="space-y-1 max-h-32 overflow-y-auto">
              {cola.filter(c => c.estado === 'aprobada').map((cancion, idx) => (
                <div key={cancion.id} className="bg-gray-700 p-2 rounded-lg flex items-center gap-2">
                  <span className="text-gray-400 w-5 text-center font-bold text-sm">{idx + 1}</span>
                  <img src={cancion.thumbnail} alt="" className="w-8 h-8 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{cancion.titulo}</p>
                    <p className="text-xs text-gray-400">{cancion.solicitado_por}</p>
                  </div>
                </div>
              ))}
              
              {cola.filter(c => c.estado === 'pendiente').length > 0 && (
                <p className="text-yellow-400 text-xs py-1">⏳ Pendientes: {cola.filter(c => c.estado === 'pendiente').length}</p>
              )}

              {cola.filter(c => c.estado !== 'reproduciendo').length === 0 && !cancionActual && (
                <p className="text-gray-500 text-center py-2 text-sm">No hay videos en cola</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // MODO ADMIN - EXCLUSIVO PARA DUEÑOS DE BAR
  // ================================================================
  if (modo === 'admin') {
    if (!isAuthed) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-center mb-2">👑 ADMIN BAR</h2>
            <p className="text-center text-gray-500 mb-6">Solo para dueños del negocio</p>
            <input
              type="password"
              value={claveInput}
              onChange={(e) => setClaveInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (
                claveInput === CLAVE_ADMIN ? setIsAuthed(true) :
                claveInput === CLAVE_SUPER_ADMIN ? (setIsAuthed(true), setModo('superadmin')) :
                alert('❌ Clave incorrecta')
              )}
              placeholder="Ingresa tu clave"
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-xl mb-4 focus:border-yellow-500 focus:outline-none"
            />
            <button
              onClick={() => {
                if (claveInput === CLAVE_ADMIN) {
                  setIsAuthed(true)
                } else if (claveInput === CLAVE_SUPER_ADMIN) {
                  setIsAuthed(true)
                  setModo('superadmin')
                } else {
                  alert('❌ Clave incorrecta')
                }
              }}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 rounded-xl transition-colors"
            >
              ENTRAR
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 p-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">👑 ADMIN - {bar?.nombre}</h1>
                <p className="text-sm opacity-80">Panel de administración</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {conectado && <Wifi className="w-4 h-4 text-green-300" />}
              <button onClick={() => { setIsAuthed(false); setClaveInput('') }} className="bg-black/20 px-4 py-2 rounded-lg hover:bg-black/30">
                Salir
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 space-y-4">
          {/* Resumen de créditos */}
          <div className="bg-gradient-to-r from-yellow-600 to-orange-500 rounded-xl p-6 text-center">
            <p className="text-black/70 text-sm font-medium">CRÉDITOS EN LA PISCINA</p>
            <p className="text-black text-6xl font-black">{bar?.creditos_disponibles || 0}</p>
            <p className="text-black/70 text-sm mt-2">Disponibles para todos los clientes</p>
          </div>

          {/* Acreditar créditos a la piscina - SIN PEDIR NOMBRE */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-400" />
              💰 Acreditar Créditos a la Piscina
            </h3>
            <p className="text-gray-400 text-sm mb-3">Agrega créditos para que los clientes puedan pedir canciones:</p>
            <div className="flex gap-3 justify-center">
              {[1, 5, 10].map(cant => (
                <button
                  key={cant}
                  onClick={async () => {
                    if (!bar) return
                    try {
                      const nuevosCreditos = (bar.creditos_disponibles || 0) + cant
                      await supabase
                        .from('bares')
                        .update({ creditos_disponibles: nuevosCreditos })
                        .eq('id', bar.id)
                      
                      setBar({ ...bar, creditos_disponibles: nuevosCreditos })
                      alert(`✅ ${cant} crédito${cant > 1 ? 's' : ''} agregado${cant > 1 ? 's' : ''} a la piscina. Total: ${nuevosCreditos}`)
                    } catch (error) {
                      console.error('Error:', error)
                      alert('❌ Error al acreditar créditos')
                    }
                  }}
                  className="bg-green-600 hover:bg-green-500 px-6 py-4 rounded-xl font-bold text-xl transition-colors"
                >
                  +{cant}
                </button>
              ))}
            </div>
          </div>

          {/* Videos pendientes de aprobación */}
          {cola.filter(c => c.estado === 'pendiente').length > 0 && (
            <div className="bg-yellow-900/30 rounded-xl p-4 border-2 border-yellow-500">
              <h3 className="font-bold mb-3 text-yellow-400">⏳ Pendientes de Aprobación ({cola.filter(c => c.estado === 'pendiente').length})</h3>
              <div className="space-y-2">
                {cola.filter(c => c.estado === 'pendiente').map((cancion) => (
                  <div key={cancion.id} className="bg-gray-800 p-3 rounded-lg flex items-center gap-3">
                    <img src={cancion.thumbnail} alt="" className="w-14 h-10 rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cancion.titulo}</p>
                      <p className="text-sm text-gray-400">Por: <strong className="text-white">{cancion.solicitado_por}</strong></p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => aprobarCancion(cancion.id)} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-bold flex items-center gap-1">
                        <Check className="w-4 h-4" /> APROBAR
                      </button>
                      <button onClick={() => rechazarCancion(cancion.id)} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg font-bold flex items-center gap-1">
                        <X className="w-4 h-4" /> RECHAZAR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cola de reproducción */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3">🎵 Cola de Reproducción</h3>
            {cancionActual && (
              <div className="bg-yellow-600 p-3 rounded-lg mb-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded flex items-center justify-center">
                  <Play className="w-5 h-5 text-black" />
                </div>
                <div className="flex-1">
                  <p className="font-bold truncate">{cancionActual.titulo}</p>
                  <p className="text-sm opacity-80">▶️ Reproduciendo</p>
                </div>
              </div>
            )}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {cola.filter(c => c.estado === 'aprobada').map((cancion, idx) => (
                <div key={cancion.id} className="bg-gray-700 p-2 rounded-lg flex items-center gap-2">
                  <span className="text-gray-400 w-5 text-center font-bold">{idx + 1}</span>
                  <img src={cancion.thumbnail} alt="" className="w-8 h-8 rounded" />
                  <p className="text-sm truncate flex-1">{cancion.titulo}</p>
                  <button onClick={() => eliminarDeCola(cancion.id)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {cola.filter(c => c.estado === 'aprobada').length === 0 && !cancionActual && (
                <p className="text-gray-500 text-center py-2">No hay videos en cola</p>
              )}
            </div>
          </div>

          {/* Control de reproducción */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3">🎮 Control de Reproducción</h3>
            <div className="flex gap-2 flex-wrap">
              <button onClick={togglePause} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                {pausado ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {pausado ? 'Reanudar' : 'Pausar'}
              </button>
              <button onClick={reproducirSiguiente} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                <SkipForward className="w-4 h-4" /> Siguiente
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              {volumen === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              <input
                type="range"
                min="0"
                max="100"
                value={volumen}
                onChange={(e) => cambiarVolumen(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm w-8">{volumen}%</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // MODO SUPER ADMIN - GESTIÓN DE BARES CON FORMULARIO COMPLETO
  // ================================================================
  if (modo === 'superadmin') {
    if (!isAuthed) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-purple-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <Building className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-center mb-2">🏢 SUPER ADMIN</h2>
            <p className="text-center text-gray-500 mb-6">Panel de administración global</p>
            <input
              type="password"
              value={claveInput}
              onChange={(e) => setClaveInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (
                claveInput === CLAVE_SUPER_ADMIN ? setIsAuthed(true) : alert('❌ Clave incorrecta')
              )}
              placeholder="Ingresa tu clave"
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-xl mb-4 focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={() => {
                if (claveInput === CLAVE_SUPER_ADMIN) {
                  setIsAuthed(true)
                } else {
                  alert('❌ Clave incorrecta')
                }
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-colors"
            >
              ENTRAR
            </button>
          </div>
        </div>
      )
    }

    // Calcular estadísticas
    const totalBares = bares.length
    const totalCreditos = bares.reduce((sum, b) => sum + (b.creditos_disponibles || 0), 0)
    const totalVentas = todasTransacciones
      .filter(t => t.tipo === 'compra_software')
      .reduce((sum, t) => sum + (t.total || 0), 0)
    const precioBase = bares.length > 0 ? bares[0].precio_compra : 40

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <ModalLinksNuevoBar />
        <ModalVerLinksBar />
        
        <div className="bg-gradient-to-r from-purple-700 to-purple-800 p-4 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Building className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">🏢 SUPER ADMIN</h1>
                <p className="text-sm opacity-80">Gestión de bares y ventas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {conectado && <Wifi className="w-4 h-4 text-green-300" />}
              <button onClick={() => { setIsAuthed(false); setClaveInput('') }} className="bg-black/20 px-4 py-2 rounded-lg hover:bg-black/30">
                Salir
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-4 space-y-4">
          {/* Resumen general */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-purple-800 to-purple-900 rounded-xl p-4 border border-purple-600">
              <p className="text-purple-300 text-xs">BARES ACTIVOS</p>
              <p className="text-3xl font-bold text-white">{totalBares}</p>
            </div>
            <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-4 border border-green-600">
              <p className="text-green-300 text-xs">CRÉDITOS TOTALES</p>
              <p className="text-3xl font-bold text-white">{totalCreditos}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-800 to-blue-900 rounded-xl p-4 border border-blue-600">
              <p className="text-blue-300 text-xs">PRECIO BASE</p>
              <p className="text-2xl font-bold text-white">${precioBase}/cr</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 rounded-xl p-4 border border-yellow-600">
              <p className="text-yellow-300 text-xs">TOTAL VENTAS</p>
              <p className="text-2xl font-bold text-white">${totalVentas}</p>
            </div>
          </div>

          {/* Agregar nuevo bar - FORMULARIO COMPLETO */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-400" />
              Agregar Nuevo Bar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={nuevoBarNombre}
                onChange={(e) => setNuevoBarNombre(e.target.value)}
                placeholder="Nombre del bar *"
                className="bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <input
                type="text"
                value={nuevoBarWhatsApp}
                onChange={(e) => setNuevoBarWhatsApp(e.target.value)}
                placeholder="WhatsApp (opcional)"
                className="bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <input
                type="email"
                value={nuevoBarCorreo}
                onChange={(e) => setNuevoBarCorreo(e.target.value)}
                placeholder="Correo electrónico (opcional)"
                className="bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <input
                type="text"
                value={nuevoBarClave}
                onChange={(e) => setNuevoBarClave(e.target.value)}
                placeholder="Clave admin (default: 1234)"
                className="bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleCrearBar}
              disabled={creandoBar || !nuevoBarNombre.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 py-3 rounded-lg font-bold transition-colors"
            >
              {creandoBar ? 'Creando...' : 'Crear Bar'}
            </button>
          </div>

          {/* Lista de bares - CON WHATSAPP, CORREO, CLAVE Y BOTONES PARA COPIAR LINKS */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Lista de Bares ({bares.length})
            </h3>
            <div className="space-y-3">
              {bares.map((barItem) => (
                <div key={barItem.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-lg">{barItem.nombre}</h4>
                      <p className="text-gray-400 text-xs">ID: {barItem.id.substring(0, 8)}...</p>
                      {barItem.whatsapp && <p className="text-green-400 text-sm">📱 {barItem.whatsapp}</p>}
                      {barItem.correo && <p className="text-blue-400 text-sm">📧 {barItem.correo}</p>}
                      <p className="text-yellow-400 text-sm mt-1">🔐 Clave: {barItem.clave_admin || '1234'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 text-xl font-bold">{barItem.creditos_disponibles} cr.</p>
                      <p className="text-gray-400 text-sm">Stock disponible</p>
                    </div>
                  </div>
                  
                  {/* Botón Ver Links - DESTACADO */}
                  <button
                    onClick={() => setBarParaVerLinks(barItem)}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 py-3 rounded-lg font-bold text-sm mb-3 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" /> Ver todos los links y clave
                  </button>
                  
                  {/* Links del bar - BOTONES RÁPIDOS PARA COPIAR */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={() => copiarUrl(getUrlTV(barItem.id))}
                      className="bg-purple-600 hover:bg-purple-500 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> TV
                    </button>
                    <button
                      onClick={() => copiarUrl(getUrlCliente(barItem.id))}
                      className="bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Cliente
                    </button>
                    <button
                      onClick={() => copiarUrl(getUrlAdmin(barItem.id))}
                      className="bg-yellow-600 hover:bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Admin
                    </button>
                  </div>
                  
                  {/* Vender créditos */}
                  <div className="border-t border-gray-600 pt-3">
                    <p className="text-gray-400 text-xs mb-2">Vender créditos (precio: ${barItem.precio_compra}/cr):</p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={async () => {
                          setBarSeleccionado(barItem)
                          await comprarCreditosSoftware(10, barItem.precio_compra)
                        }}
                        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm font-bold"
                      >
                        +10 (${10 * barItem.precio_compra})
                      </button>
                      <button
                        onClick={async () => {
                          setBarSeleccionado(barItem)
                          await comprarCreditosSoftware(50, barItem.precio_compra)
                        }}
                        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm font-bold"
                      >
                        +50 (${50 * barItem.precio_compra})
                      </button>
                      <button
                        onClick={async () => {
                          setBarSeleccionado(barItem)
                          await comprarCreditosSoftware(100, barItem.precio_compra)
                        }}
                        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm font-bold"
                      >
                        +100 (${100 * barItem.precio_compra})
                      </button>
                      <button
                        onClick={async () => {
                          setBarSeleccionado(barItem)
                          await comprarCreditosSoftware(200, barItem.precio_compra)
                        }}
                        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm font-bold"
                      >
                        +200 (${200 * barItem.precio_compra})
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {bares.length === 0 && (
                <p className="text-gray-500 text-center py-4">No hay bares registrados</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
