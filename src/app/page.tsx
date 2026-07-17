'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import YouTube, { YouTubeEvent } from 'react-youtube'
import { QRCodeSVG } from 'qrcode.react'
import {
  Play, Pause, SkipForward, Volume2, VolumeX,
  Users, CreditCard, Music, Search, Trash2, Check, X, Crown,
  DollarSign, Video, BarChart3, Building, Loader2, Wifi, WifiOff, ShoppingCart,
  Plus, Minus, LogOut, Copy, Calendar, TrendingUp, ExternalLink
} from 'lucide-react'
import { supabase, obtenerBar, obtenerCola, agregarCancion, actualizarEstadoCancion, eliminarCancion, obtenerTransacciones, comprarCreditosProveedor, venderCreditosCliente, actualizarPrecios, suscribirseACambios, obtenerTodosLosBares, crearBar, obtenerTodasTransacciones, obtenerInstanciaControl, crearInstanciaControl, togglePausa, actualizarVolumen, limpiarSkip, crearSolicitudRecarga, obtenerSolicitudesPendientes, aprobarSolicitudRecarga, rechazarSolicitudRecarga, type Bar, type CancionCola, type Transaccion } from '@/lib/supabase'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

// ============= CONFIGURACIÓN =============
const CLAVE_ADMIN = '1234'
const CLAVE_SUPER_ADMIN = 'rockola2024'
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "AIzaSyC2JJqbZUDOkjBOzyU3xE6yJFoCJh1a6JY"

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
  const [solicitudesRecarga, setSolicitudesRecarga] = useState<any[]>([])
  const [montoRecargaColones, setMontoRecargaColones] = useState('')

  // ============= ESTADOS DE MODAL =============
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false)
  const [creditosAVender, setCreditosAVender] = useState(0)
  const [nombreClienteInput, setNombreClienteInput] = useState('')

  // ============= ESTADOS DE TRANSACCIONES =============
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [todasTransacciones, setTodasTransacciones] = useState<Transaccion[]>([])
  
  // ============= ESTADO PARA NUEVO BAR CREADO =============
  const [nuevoBarCreado, setNuevoBarCreado] = useState<{bar: Bar, claveAdmin: string} | null>(null)
  
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

  // ============= ESTADOS DE CONTROL E INTERACCIÓN =============
  const [controlInstancia, setControlInstancia] = useState<any>(null)
  const [tvReady, setTvReady] = useState(false)

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

      const barData = await obtenerBar(id)
      setBar(barData)

      const colaData = await obtenerCola(id)
      setCola(colaData)

      const actual = colaData.find(c => c.estado === 'reproduciendo')
      setCancionActual(prev => {
        if (!prev && !actual) return null
        if (prev && actual && prev.id === actual.id && prev.video_id === actual.video_id) {
          return prev
        }
        return actual || null
      })

      const transData = await obtenerTransacciones(id)
      setTransacciones(transData)

      // Cargar solicitudes de recarga pendientes para admin
      if (modo === 'admin') {
        const pends = await obtenerSolicitudesPendientes(id)
        setSolicitudesRecarga(pends)
      }

      // Cargar control de reproducción de la base de datos
      try {
        const ctrl = await obtenerInstanciaControl(id)
        if (ctrl) {
          setControlInstancia(ctrl)
          setPausado(ctrl.pausado)
          setVolumen(ctrl.volumen)
        } else {
          const nuevoCtrl = await crearInstanciaControl(id)
          setControlInstancia(nuevoCtrl)
          setPausado(nuevoCtrl.pausado)
          setVolumen(nuevoCtrl.volumen)
        }
      } catch (ctrlErr) {
        console.error('Error cargando control de reproduccion:', ctrlErr)
      }

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
        // Solo actualizar si hay cambios reales
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
        setCancionActual(prev => {
          if (!prev && !actual) return null
          if (prev && actual && prev.id === actual.id && prev.video_id === actual.video_id) {
            return prev
          }
          return actual || null
        })
      },
      onTransaccionCambio: () => {
        if (barId) obtenerTransacciones(barId).then(setTransacciones)
      },
      onSolicitudesCambio: (pends) => {
        setSolicitudesRecarga(pends)
      },
      onControlCambio: (ctrl) => {
        setControlInstancia(ctrl)
        setPausado(ctrl.pausado)
        setVolumen(ctrl.volumen)

        // Si el admin solicitó skip y estamos en modo TV, pasar a la siguiente
        if (modo === 'tv' && ctrl.skip_requested) {
          limpiarSkip(barId).then(() => {
            reproducirSiguiente()
          })
        }
      }
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [modo, barId])

  // Sincronizar créditos del cliente con la base de datos en tiempo real
  useEffect(() => {
    if (modo === 'cliente' && clienteRegistrado && nombreCliente && bar) {
      let active = true
      const syncCliente = async () => {
        try {
          const { obtenerOcrearCliente } = await import('@/lib/supabase')
          const clientData = await obtenerOcrearCliente(bar.id, nombreCliente)
          if (active) {
            setCreditosCliente(clientData.creditos)
          }
        } catch (e) {
          console.error("Error sincronizando cliente:", e)
        }
      }

      syncCliente()
      const interval = setInterval(syncCliente, 2500)

      return () => {
        active = false
        clearInterval(interval)
      }
    }
  }, [modo, clienteRegistrado, nombreCliente, bar])

  // ============= FUNCIÓN DE BÚSQUEDA YOUTUBE =============
  const buscarVideos = async () => {
    if (!busqueda.trim()) return
    setBuscando(true)

    if (!YOUTUBE_API_KEY) {
      alert("❌ Error: La clave de API de YouTube (NEXT_PUBLIC_YOUTUBE_API_KEY) no está configurada.");
      setBuscando(false)
      return
    }

    try {
      const query = encodeURIComponent(busqueda)
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${query}&type=video&key=${YOUTUBE_API_KEY}`

      const res = await fetch(url)
      const data = await res.json()

      if (data.error) {
        console.error('Error de API de YouTube:', data.error)
        alert(`❌ Error de YouTube: ${data.error.message || 'Error desconocido'} (Código: ${data.error.code})`)
        setVideosBusqueda([])
        setBuscando(false)
        return
      }

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
        }).filter((v: any) => v.duracionMinutos <= 8)

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
    const seconds = parseInt((match?.[3] || '0S').replace('S', '')) || 0
    return hours * 60 + minutes + seconds / 60
  }

  const formatDuration = (minutos: number): string => {
    const totalSeconds = Math.round(minutos * 60)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ============= FUNCIONES DE COLA =============
  const agregarACola = async (video: VideoBusqueda) => {
    if (!bar) return
    const precioCancion = bar.precio_venta || 100

    if (creditosCliente < precioCancion) {
      alert(`❌ No tienes suficiente saldo. Necesitas ₡${precioCancion}. Pide al administrador que te recargue.`)
      return
    }

    try {
      const nuevaPosicion = cola.length > 0 ? Math.max(...cola.map(c => c.posicion || 0)) + 1 : 0

      // Agregar canción a la base de datos
      await agregarCancion({
        bar_id: bar.id,
        video_id: video.id.videoId,
        titulo: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
        canal: video.snippet.channelTitle,
        estado: 'pendiente',
        costo_creditos: bar.precio_compra,
        precio_venta: bar.precio_venta,
        solicitado_por: nombreCliente || 'Cliente',
        posicion: nuevaPosicion
      })

      // Actualizar localmente de inmediato para que clics sucesivos incrementen la posición secuencialmente
      const cancionTmp: CancionCola = {
        id: Math.random().toString(),
        bar_id: bar.id,
        video_id: video.id.videoId,
        titulo: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
        canal: video.snippet.channelTitle,
        estado: 'pendiente',
        costo_creditos: bar.precio_compra,
        solicitado_por: nombreCliente || 'Cliente',
        posicion: nuevaPosicion,
        creado_en: new Date().toISOString()
      }
      setCola(prev => [...prev, cancionTmp])

      // Descontar del saldo del cliente
      const nuevosCreditos = creditosCliente - precioCancion
      setCreditosCliente(nuevosCreditos)

      // Descontar saldo del cliente en la base de datos
      const { obtenerOcrearCliente, actualizarCreditosCliente } = await import('@/lib/supabase')
      const clientDb = await obtenerOcrearCliente(bar.id, nombreCliente)
      await actualizarCreditosCliente(clientDb.id, clientDb.creditos - precioCancion)

      await supabase.from('transacciones').insert([{
        bar_id: bar.id,
        tipo: 'consumo',
        cantidad: 1,
        precio_unitario: precioCancion,
        total: precioCancion,
        cancion_titulo: video.snippet.title,
        cliente_nombre: nombreCliente,
        descripcion: `Video solicitado: ${video.snippet.title}`
      }])

      // NO limpiar búsqueda para permitir agregar más canciones
      alert(`✅ "${video.snippet.title.substring(0, 30)}..." agregado a la cola. Saldo restante: ₡${nuevosCreditos}`)
    } catch (error) {
      console.error('Error agregando video:', error)
      alert('❌ Error al agregar video')
    }
  }

  const aprobarCancion = async (cancionId: string) => {
    try {
      // El Admin solo cambia el estado a 'aprobada'. La pantalla de TV gestiona la reproducción secuencial.
      await actualizarEstadoCancion(cancionId, 'aprobada')
      
      // Actualizar localmente para feedback inmediato
      setCola(prev => prev.map(c => c.id === cancionId ? { ...c, estado: 'aprobada' } : c))
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
    try {
      const dbCola = await obtenerCola(barId)
      const colaAprobada = dbCola.filter(c => c.estado === 'aprobada')

      if (colaAprobada.length > 0) {
        const siguiente = colaAprobada[0]
        await actualizarEstadoCancion(siguiente.id, 'reproduciendo')
        setCancionActual(siguiente)
      } else {
        setCancionActual(null)
      }
    } catch (error) {
      console.error('Error al reproducir la siguiente canción:', error)
      // Fallback a cola local
      const colaAprobada = cola.filter(c => c.estado === 'aprobada')
      if (colaAprobada.length > 0) {
        const siguiente = colaAprobada[0]
        actualizarEstadoCancion(siguiente.id, 'reproduciendo')
          .then(() => setCancionActual(siguiente))
          .catch(console.error)
      } else {
        setCancionActual(null)
      }
    }
  }, [barId, cola])

  const onVideoEnd = useCallback(async () => {
    if (cancionActual) {
      try {
        await actualizarEstadoCancion(cancionActual.id, 'completada')
        setCancionActual(null)
        setTimeout(() => reproducirSiguiente(), 500)
      } catch (error) {
        console.error('Error terminando video:', error)
      }
    }
  }, [cancionActual, reproducirSiguiente])

  const onVideoError = useCallback(async (event: any) => {
    console.error('YouTube Player Error:', event.data)
    if (cancionActual) {
      try {
        await actualizarEstadoCancion(cancionActual.id, 'completada')
        setCancionActual(null)
        setTimeout(() => reproducirSiguiente(), 500)
      } catch (error) {
        console.error('Error handling video error:', error)
      }
    }
  }, [cancionActual, reproducirSiguiente])

  const onPlayerReady = (event: YouTubeEvent) => {
    playerRef.current = event.target
    setPlayer(event.target)
    event.target.setVolume(volumen)
    if (modo === 'tv' && tvReady) {
      event.target.playVideo()
    }
  }

  const togglePause = async () => {
    if (!barId) return
    const nuevoEstadoPausa = !pausado
    setPausado(nuevoEstadoPausa)

    if (playerRef.current) {
      try {
        if (nuevoEstadoPausa) {
          playerRef.current.pauseVideo()
        } else {
          playerRef.current.playVideo()
        }
      } catch (err) {
        console.error('Error controlando pausa local:', err)
      }
    }

    try {
      await togglePausa(barId, nuevoEstadoPausa)
    } catch (error) {
      console.error('Error al pausar en la base de datos:', error)
    }
  }

  const cambiarVolumen = async (nuevoVolumen: number) => {
    if (!barId) return
    setVolumen(nuevoVolumen)

    if (playerRef.current) {
      try {
        playerRef.current.setVolume(nuevoVolumen)
      } catch (err) {
        console.error('Error controlando volumen local:', err)
      }
    }

    try {
      await actualizarVolumen(barId, nuevoVolumen)
    } catch (error) {
      console.error('Error al actualizar volumen en la base de datos:', error)
    }
  }

  const ejecutarSiguienteAdmin = async () => {
    if (!barId) return
    try {
      if (cancionActual) {
        await actualizarEstadoCancion(cancionActual.id, 'completada')
        setCancionActual(null)
      } else {
        reproducirSiguiente()
      }
    } catch (error) {
      console.error('Error al pasar a la siguiente canción:', error)
    }
  }

  // ============= TRANSACCIONES =============
  const comprarCreditosSoftware = async (cantidad: number, precioUnitario: number) => {
    if (!barSeleccionado) return
    try {
      await comprarCreditosProveedor(barSeleccionado.id, cantidad, precioUnitario)
      // Usar isRefresh=true para evitar parpadeo
      await cargarDatos(undefined, true)
      alert(`✅ Vendidos ${cantidad} créditos a ₡${precioUnitario} c/u = ₡${cantidad * precioUnitario}`)
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
      alert(`✅ Vendidos ${creditosAVender} créditos a ${nombreClienteInput.trim()} = ₡${creditosAVender * bar.precio_venta}`)
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
    if (modo === 'tv' && tvReady && !cancionActual) {
      const colaAprobada = cola.filter(c => c.estado === 'aprobada')
      if (colaAprobada.length > 0) {
        reproducirSiguiente()
      }
    }
  }, [modo, tvReady, cancionActual, cola, reproducirSiguiente])

  // ============= EFECTOS DE CONTROL DE REPRODUCCIÓN (TV) =============
  useEffect(() => {
    if (modo === 'tv' && playerRef.current) {
      try {
        if (pausado) {
          playerRef.current.pauseVideo()
        } else {
          playerRef.current.playVideo()
        }
      } catch (err) {
        console.error('Error controlando pausa/reproducción en TV:', err)
      }
    }
  }, [pausado, modo])

  useEffect(() => {
    if (modo === 'tv' && playerRef.current) {
      try {
        playerRef.current.setVolume(volumen)
      } catch (err) {
        console.error('Error controlando volumen en TV:', err)
      }
    }
  }, [volumen, modo])

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
        <p className="text-gray-600 mb-4">Vendiendo <strong>{creditosAVender} crédito{creditosAVender > 1 ? 's' : ''}</strong> (₡{bar ? creditosAVender * bar.precio_venta : 0})</p>
        <input
          type="text"
          value={nombreClienteInput}
          onChange={(e) => setNombreClienteInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirmarVentaCliente()}
          placeholder="Escribe el nombre completo..."
          autoFocus
          className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg mb-4 focus:border-green-500 focus:outline-none text-gray-900 bg-white"
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
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold py-3 rounded-xl transition-colors"
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
        <h3 className="text-xl font-bold text-gray-800 mb-4">💰 Solicitar Recarga de Saldo</h3>
        <p className="text-gray-600 mb-4 text-sm">Selecciona o ingresa la cantidad de colones que deseas solicitar al dueño del bar:</p>
        
        <div className="flex gap-2 flex-wrap mb-4 justify-center">
          {[100, 300, 500, 1000, 2000].map(monto => (
            <button
              key={monto}
              type="button"
              onClick={() => setMontoRecargaColones(monto.toString())}
              className={`px-3 py-2 rounded-xl font-bold border transition-colors ${montoRecargaColones === monto.toString() ? 'bg-green-600 border-green-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200'}`}
            >
              ₡{monto}
            </button>
          ))}
        </div>

        <input
          type="number"
          value={montoRecargaColones}
          onChange={(e) => setMontoRecargaColones(e.target.value)}
          placeholder="Monto en colones (₡)..."
          autoFocus
          className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg mb-4 focus:border-green-500 focus:outline-none text-gray-900 bg-white"
        />

        <div className="flex gap-2">
          <button 
            onClick={() => { setModalRecarga(false); setMontoRecargaColones('') }}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={async () => {
              const monto = parseInt(montoRecargaColones)
              if (monto > 0 && bar && nombreCliente) {
                try {
                  await crearSolicitudRecarga(bar.id, nombreCliente, monto)
                  setModalRecarga(false)
                  setMontoRecargaColones('')
                  alert(`✅ Solicitud de recarga enviada al administrador por ₡${monto}.`)
                } catch (e: any) {
                  alert(`❌ Error al solicitar recarga: ${e.message || 'Error desconocido'}`)
                }
              }
            }}
            disabled={!montoRecargaColones || parseInt(montoRecargaColones) <= 0}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Solicitar
          </button>
        </div>
      </div>
    </div>
  )

  // ============= MODAL LINKS NUEVO BAR =============
  const ModalLinksNuevoBar = () => (
    <div className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 ${nuevoBarCreado ? '' : 'hidden'}`}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🎉 Bar Creado: {nuevoBarCreado?.bar.nombre}</h3>
        <p className="text-gray-600 mb-4">Guarda estos links para acceder a cada pantalla:</p>
        
        <div className="space-y-3 mb-4">
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">📺 TV (Pantalla del bar)</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white text-gray-900 px-2 py-1 rounded flex-1 break-all">{getUrlTV(nuevoBarCreado?.bar.id)}</code>
              <button onClick={() => copiarUrl(getUrlTV(nuevoBarCreado?.bar.id))} className="text-blue-500 hover:text-blue-700">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">👤 Cliente (Para pedir música)</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white text-gray-900 px-2 py-1 rounded flex-1 break-all">{getUrlCliente(nuevoBarCreado?.bar.id)}</code>
              <button onClick={() => copiarUrl(getUrlCliente(nuevoBarCreado?.bar.id))} className="text-blue-500 hover:text-blue-700">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">🔑 Admin (Panel del bar)</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white text-gray-900 px-2 py-1 rounded flex-1 break-all">{getUrlAdmin(nuevoBarCreado?.bar.id)}</code>
              <button onClick={() => copiarUrl(getUrlAdmin(nuevoBarCreado?.bar.id))} className="text-blue-500 hover:text-blue-700">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="bg-yellow-100 p-3 rounded-lg border border-yellow-300">
            <p className="text-sm text-yellow-700 mb-1">🔐 Clave Admin</p>
            <p className="text-lg font-bold text-yellow-800">{nuevoBarCreado?.claveAdmin}</p>
          </div>
        </div>
        
        <button 
          onClick={() => setNuevoBarCreado(null)}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  )

  // ================================================================
  // MODO TV - PANTALLA LIMPIA SOLO VIDEO
  // ================================================================
  if (modo === 'tv') {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden flex flex-col items-center justify-center">
        {/* Overlay interactivo para cumplir la política de reproducción automática del navegador */}
        {!tvReady && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-black to-blue-950 flex flex-col items-center justify-center z-50 p-6">
            <div className="text-center p-8 max-w-md bg-gray-900/80 border border-purple-500/40 rounded-3xl backdrop-blur-md shadow-2xl space-y-6">
              <div className="w-20 h-20 bg-purple-600/20 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Play className="w-10 h-10 text-yellow-400 fill-yellow-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold text-white tracking-wide">PANTALLA DE TV</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Para permitir que la música y los videos se reproduzcan automáticamente con sonido, por favor presiona el botón de abajo.
                </p>
              </div>
              <button
                onClick={() => {
                  setTvReady(true)
                  const colaAprobada = cola.filter(c => c.estado === 'aprobada')
                  if (!cancionActual && colaAprobada.length > 0) {
                    reproducirSiguiente()
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-purple-500/25 active:scale-95 transition-all duration-150"
              >
                Activar Reproducción
              </button>
            </div>
          </div>
        )}

        {cancionActual ? (
          <div className="absolute inset-0 flex items-center justify-center">
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
              onError={onVideoError}
              className="w-full h-full"
              iframeClassName="w-full h-full absolute inset-0"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-none">
              <p className="text-white text-xl font-bold truncate">{cancionActual.titulo}</p>
              <p className="text-gray-300 text-sm">Solicitado por: {cancionActual.solicitado_por}</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <Music className="w-32 h-32 text-purple-500 mx-auto mb-6 animate-pulse" />
              <h1 className="text-5xl font-bold text-white mb-4">🎵 ROCKOLA</h1>
              <p className="text-gray-400 text-xl mb-8">{bar?.nombre || 'Esperando conexión...'}</p>
              <p className="text-gray-500 text-lg mb-12">Esperando canciones...</p>
              
              {currentUrl && barId && (
                <div className="bg-white p-6 rounded-2xl inline-block shadow-2xl">
                  <QRCodeSVG value={getUrlCliente()} size={180} />
                  <p className="text-black mt-4 font-bold text-lg">📱 Escanea para pedir música</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ================================================================
  // MODO CLIENTE - EXCLUSIVO PARA CLIENTES CON QR Y SALDO
  // ================================================================
  if (modo === 'cliente') {
    if (!clienteRegistrado) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <Users className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-center mb-2">🍻 ROCKOLA</h2>
            <p className="text-center text-gray-500 mb-2">{bar?.nombre}</p>
            <p className="text-center text-gray-400 mb-6 text-sm">Pide tu música o video favorito</p>
            
            <input
              type="text"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && nombreCliente.trim() && setClienteRegistrado(true)}
              placeholder="Tu nombre completo..."
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-xl mb-4 focus:border-green-500 focus:outline-none text-gray-900 bg-white"
            />
            
            <button
              onClick={() => nombreCliente.trim() && setClienteRegistrado(true)}
              disabled={!nombreCliente.trim()}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors"
            >
              ENTRAR
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <ModalRecargaCreditos />
        
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold">🍻 Hola, {nombreCliente}!</h1>
                <p className="text-sm opacity-80">{bar?.nombre}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setClienteRegistrado(false); setNombreCliente(''); setCreditosCliente(0) }} className="bg-black/20 p-2 rounded-lg hover:bg-black/30">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Mi saldo */}
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-yellow-200 text-sm">MI SALDO</p>
                <p className="text-4xl font-bold">₡{creditosCliente}</p>
              </div>
              <button 
                onClick={() => setModalRecarga(true)}
                className="bg-white text-yellow-700 px-4 py-2 rounded-lg font-bold hover:bg-yellow-100"
              >
                Recargar
              </button>
            </div>
            <p className="text-yellow-200 text-sm mt-2">
              💡 Cada canción cuesta ₡{bar?.precio_venta || 100}
            </p>
          </div>

          {/* QR para compartir */}
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 mb-3 text-sm">📱 Comparte este QR con otros clientes</p>
            <div className="bg-white p-2 rounded-lg inline-block">
              <QRCodeSVG value={getUrlCliente()} size={100} />
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

            {/* RESULTADOS EN MODO LISTA - CON BOTÓN AGREGAR */}
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
                          <span className="text-yellow-400">₡{bar?.precio_venta || 100}</span>
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

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {cola.filter(c => c.estado === 'aprobada' || c.estado === 'completada').map((cancion, idx) => (
                <div key={cancion.id} className={`p-2 rounded-lg flex items-center gap-2 ${cancion.estado === 'completada' ? 'bg-gray-800/40 opacity-55' : 'bg-gray-700'}`}>
                  <span className="text-gray-400 w-5 text-center font-bold text-sm">
                    {cancion.estado === 'completada' ? '✓' : idx + 1 - cola.filter(c => c.estado === 'completada').length}
                  </span>
                  <img src={cancion.thumbnail} alt="" className="w-8 h-8 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${cancion.estado === 'completada' ? 'line-through text-gray-500' : ''}`}>{cancion.titulo}</p>
                    <p className="text-[10px] text-gray-400">Por: {cancion.solicitado_por} {cancion.estado === 'completada' && '(Reproducida)'}</p>
                  </div>
                </div>
              ))}
              
              {cola.filter(c => c.estado === 'pendiente').length > 0 && (
                <p className="text-yellow-400 text-xs py-1">⏳ Pendientes de aprobación: {cola.filter(c => c.estado === 'pendiente').length}</p>
              )}

              {cola.filter(c => c.estado === 'aprobada' || c.estado === 'completada').length === 0 && !cancionActual && (
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
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-xl mb-4 focus:border-yellow-500 focus:outline-none text-gray-900 bg-white"
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
        <ModalNombreCliente />
        
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
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-3 border border-green-600">
              <p className="text-green-300 text-xs">CRÉDITOS DISPONIBLES</p>
              <p className="text-3xl font-bold text-white">{bar?.creditos_disponibles || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-800 to-blue-900 rounded-xl p-3 border border-blue-600">
              <p className="text-blue-300 text-xs">PRECIO COMPRA</p>
              <p className="text-2xl font-bold text-white">₡{bar?.precio_compra || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 rounded-xl p-3 border border-yellow-600">
              <p className="text-yellow-300 text-xs">PRECIO VENTA</p>
              <p className="text-2xl font-bold text-white">₡{bar?.precio_venta || 0}</p>
            </div>
          </div>

          {/* Vender créditos a clientes */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-400" />
              💰 Vender Créditos a Clientes
            </h3>
            <p className="text-gray-400 text-sm mb-3">Cobra al cliente y dale sus créditos (ventas en colones):</p>
            <div className="flex gap-2 flex-wrap">
              {[100, 300, 500, 1000, 2000].map(monto => {
                const cantCreditos = bar ? Math.floor(monto / bar.precio_venta) : 0
                return (
                  <button
                    key={monto}
                    onClick={() => abrirModalCliente(cantCreditos)}
                    disabled={!bar || cantCreditos > bar.creditos_disponibles || cantCreditos === 0}
                    className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-2 rounded-lg font-bold transition-colors animate-pulse"
                  >
                    ₡{monto} ({cantCreditos} cr.)
                  </button>
                )
              })}
            </div>
          </div>

          {/* Solicitudes de recarga pendientes */}
          {solicitudesRecarga.length > 0 && (
            <div className="bg-yellow-900/30 rounded-xl p-4 border-2 border-yellow-500">
              <h3 className="font-bold mb-3 text-yellow-400">⏳ Solicitudes de Recarga ({solicitudesRecarga.length})</h3>
              <div className="space-y-2">
                {solicitudesRecarga.map((sol) => {
                  const cantCreditos = bar ? Math.floor(sol.monto / bar.precio_venta) : 0
                  return (
                    <div key={sol.id} className="bg-gray-800 p-3 rounded-lg flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-white">{sol.cliente_nombre}</p>
                        <p className="text-sm text-gray-400">Solicita: <strong className="text-yellow-400">₡{sol.monto}</strong> ({cantCreditos} cr.)</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await aprobarSolicitudRecarga(sol.id)
                              await cargarDatos(undefined, true)
                              alert(`✅ Solicitud aprobada para ${sol.cliente_nombre}`)
                            } catch (e: any) {
                              alert(`❌ Error al aprobar: ${e.message || 'Error desconocido'}`)
                            }
                          }}
                          className="bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 text-white"
                        >
                          <Check className="w-3.5 h-3.5" /> APROBAR
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await rechazarSolicitudRecarga(sol.id)
                              await cargarDatos(undefined, true)
                              alert(`❌ Solicitud rechazada`)
                            } catch (e: any) {
                              alert(`❌ Error al rechazar: ${e.message || 'Error desconocido'}`)
                            }
                          }}
                          className="bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 text-white"
                        >
                          <X className="w-3.5 h-3.5" /> RECHAZAR
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
            <div className="space-y-1 max-h-none">
              {cola.filter(c => c.estado === 'aprobada' || c.estado === 'completada').map((cancion, idx) => (
                <div key={cancion.id} className={`p-2 rounded-lg flex items-center gap-2 ${cancion.estado === 'completada' ? 'bg-gray-800/40 opacity-55' : 'bg-gray-700'}`}>
                  <span className="text-gray-400 w-5 text-center font-bold text-sm">
                    {cancion.estado === 'completada' ? '✓' : idx + 1 - cola.filter(c => c.estado === 'completada').length}
                  </span>
                  <img src={cancion.thumbnail} alt="" className="w-8 h-8 rounded" />
                  <p className={`text-sm truncate flex-1 ${cancion.estado === 'completada' ? 'line-through text-gray-500' : ''}`}>
                    {cancion.titulo} {cancion.estado === 'completada' && <span className="text-xs text-gray-500 font-normal">(Reproducida)</span>}
                  </p>
                  {cancion.estado !== 'completada' && (
                    <button onClick={() => eliminarDeCola(cancion.id)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {cola.filter(c => c.estado === 'aprobada' || c.estado === 'completada').length === 0 && !cancionActual && (
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
              <button onClick={ejecutarSiguienteAdmin} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
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
  // MODO SUPER ADMIN - GESTIÓN DE BARES
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
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-xl mb-4 focus:border-purple-500 focus:outline-none text-gray-900 bg-white"
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
              <p className="text-2xl font-bold text-white">₡{precioBase}/cr</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 rounded-xl p-4 border border-yellow-600">
              <p className="text-yellow-300 text-xs">TOTAL VENTAS</p>
              <p className="text-2xl font-bold text-white">₡{totalVentas}</p>
            </div>
          </div>

          {/* Agregar nuevo bar */}
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

          {/* Lista de bares */}
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
                  
                  {/* Links del bar */}
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
                    <p className="text-gray-400 text-xs mb-2">Vender créditos (precio: ₡{barItem.precio_compra}/cr):</p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={async () => {
                          setBarSeleccionado(barItem)
                          await comprarCreditosSoftware(10, barItem.precio_compra)
                        }}
                        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm font-bold"
                      >
                        +10 (₡{10 * barItem.precio_compra})
                      </button>
                      <button
                        onClick={async () => {
                          setBarSeleccionado(barItem)
                          await comprarCreditosSoftware(50, barItem.precio_compra)
                        }}
                        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm font-bold"
                      >
                        +50 (₡{50 * barItem.precio_compra})
                      </button>
                      <button
                        onClick={async () => {
                          setBarSeleccionado(barItem)
                          await comprarCreditosSoftware(100, barItem.precio_compra)
                        }}
                        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm font-bold"
                      >
                        +100 (₡{100 * barItem.precio_compra})
                      </button>
                      <button
                        onClick={async () => {
                          setBarSeleccionado(barItem)
                          await comprarCreditosSoftware(200, barItem.precio_compra)
                        }}
                        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm font-bold"
                      >
                        +200 (₡{200 * barItem.precio_compra})
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
