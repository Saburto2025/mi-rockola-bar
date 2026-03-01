'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import YouTube, { YouTubeEvent } from 'react-youtube'
import { QRCodeSVG } from 'qrcode.react'
import {
  Play, Pause, SkipForward, Volume2, VolumeX,
  Users, CreditCard, Music, Search, Trash2, Check, X, Crown,
  DollarSign, Video, BarChart3, Building, Loader2, Wifi, WifiOff, ShoppingCart,
  Plus, Minus, LogOut, Copy, Calendar, TrendingUp
} from 'lucide-react'
import { supabase, obtenerBar, obtenerCola, agregarCancion, actualizarEstadoCancion, eliminarCancion, obtenerTransacciones, comprarCreditosProveedor, venderCreditosCliente, actualizarPrecios, suscribirseACambios, obtenerTodosLosBares, crearBar, obtenerTodasTransacciones, type Bar, type CancionCola, type Transaccion } from '@/lib/supabase'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

// ============= CONFIGURACIÓN =============
const CLAVE_ADMIN = "1234"
const CLAVE_SUPER_ADMIN = "rockola2024"
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || ""

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

  // ============= PLAYER =============
  const [player, setPlayer] = useState<any>(null)
  const playerRef = useRef<any>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // ============= URL ACTUAL =============
  const [currentUrl, setCurrentUrl] = useState('')

  // ============= BAR ID ACTUAL =============
  const barId = barSeleccionado?.id || bar?.id || ''

  // ============= DETECTAR MODO AL CARGAR =============
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const modoUrl = params.get('modo')
    
    if (modoUrl === 'cliente') setModo('cliente')
    else if (modoUrl === 'admin') setModo('admin')
    else if (modoUrl === 'superadmin') setModo('superadmin')
    else setModo('tv')

    setCurrentUrl(window.location.origin)
  }, [])

  // ============= CARGAR DATOS SEGÚN MODO =============
  const cargarDatos = async (barIdToUse?: string) => {
    try {
      setCargando(true)
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
        setBar(nuevoBar)
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

  // ============= FUNCIONES DE COLA =============
  const agregarACola = async (video: VideoBusqueda) => {
    if (!bar) return
    const precioCancion = bar.precio_venta || 1
    
    if (creditosCliente < precioCancion) {
      alert(`❌ No tienes suficientes créditos. Necesitas ${precioCancion} créditos. Pide al administrador que te recargue.`)
      return
    }

    try {
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
        posicion: cola.length
      })

      // Descontar del saldo del cliente
      const nuevosCreditos = creditosCliente - precioCancion
      setCreditosCliente(nuevosCreditos)
      
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

      setBusqueda('')
      setVideosBusqueda([])
      alert(`✅ Video enviado a la cola. Se descontaron ${precioCancion} créditos de tu saldo.`)
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
      await cargarDatos()
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
      await cargarDatos()
      setModalClienteAbierto(false)
      alert(`✅ Vendidos ${creditosAVender} créditos a ${nombreClienteInput.trim()} = $${creditosAVender * bar.precio_venta}`)
    } catch (error: any) {
      console.error('Error vendiendo:', error)
      alert(error.message || '❌ Error al vender créditos')
    }
  }

  // ============= REPRODUCIR SIGUIENTE AUTOMÁTICAMENTE =============
  useEffect(() => {
    if (modo === 'tv' && !cancionActual && cola.filter(c => c.estado === 'aprobada').length > 0) {
      reproducirSiguiente()
    }
  }, [modo, cancionActual, cola, reproducirSiguiente])

  // ============= URLS EXCLUSIVAS =============
  const getUrlCliente = () => `${currentUrl}?modo=cliente`
  const getUrlAdmin = () => `${currentUrl}?modo=admin`
  const getUrlSuperAdmin = () => `${currentUrl}?modo=superadmin`
  const getUrlTV = () => currentUrl

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

  // ================================================================
  // MODO TV - PANTALLA LIMPIA SOLO VIDEO
  // ================================================================
  if (modo === 'tv') {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden">
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
              
              {currentUrl && (
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
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-xl mb-4 focus:border-green-500 focus:outline-none"
            />
            
            <button
              onClick={() => nombreCliente.trim() && setClienteRegistrado(true)}
              disabled={!nombreCliente.trim()}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors"
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
                <button 
                  onClick={() => setModalRecarga(true)}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-full font-bold text-lg flex items-center gap-2"
                >
                  💰 {creditosCliente} <Plus className="w-4 h-4" />
                </button>
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
                <p className="text-4xl font-bold">{creditosCliente} créditos</p>
              </div>
              <button 
                onClick={() => setModalRecarga(true)}
                className="bg-white text-yellow-700 px-4 py-2 rounded-lg font-bold hover:bg-yellow-100"
              >
                Recargar
              </button>
            </div>
            <p className="text-yellow-200 text-sm mt-2">
              💡 Cada canción cuesta {bar?.precio_venta || 1} créditos
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

            {/* RESULTADOS EN MODO LISTA */}
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
                          <span className="text-yellow-400">{bar?.precio_venta || 1} créditos</span>
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-green-400 flex-shrink-0" />
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
              <p className="text-2xl font-bold text-white">${bar?.precio_compra || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 rounded-xl p-3 border border-yellow-600">
              <p className="text-yellow-300 text-xs">PRECIO VENTA</p>
              <p className="text-2xl font-bold text-white">${bar?.precio_venta || 0}</p>
            </div>
          </div>

          {/* Vender créditos a clientes */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-400" />
              💰 Vender Créditos a Clientes
            </h3>
            <p className="text-gray-400 text-sm mb-3">Cobra al cliente y dale sus créditos:</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 3, 5, 10, 20, 50].map(cant => (
                <button
                  key={cant}
                  onClick={() => abrirModalCliente(cant)}
                  disabled={!bar || cant > bar.creditos_disponibles}
                  className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-2 rounded-lg font-bold transition-colors"
                >
                  {cant} cr. (${bar ? cant * bar.precio_venta : 0})
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
              <input type="range" min="0" max="100" value={volumen} onChange={(e) => cambiarVolumen(parseInt(e.target.value))} className="flex-1" />
              <span className="w-10 text-right text-sm">{volumen}%</span>
            </div>
          </div>

          {/* Links exclusivos */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3">🔗 Links Exclusivos</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
                <div>
                  <p className="font-medium text-sm">📺 TV</p>
                  <p className="text-xs text-gray-400 truncate max-w-[150px]">{getUrlTV()}</p>
                </div>
                <button onClick={() => copiarUrl(getUrlTV())} className="text-blue-400">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
                <div>
                  <p className="font-medium text-sm">🍻 Clientes</p>
                  <p className="text-xs text-gray-400 truncate max-w-[150px]">{getUrlCliente()}</p>
                </div>
                <button onClick={() => copiarUrl(getUrlCliente())} className="text-blue-400">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // MODO SUPER ADMIN - DUEÑO DEL SOFTWARE SAAS
  // ================================================================
  if (modo === 'superadmin') {
    if (!isAuthed) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <Building className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-center mb-2">🏢 SUPER ADMIN</h2>
            <p className="text-center text-gray-500 mb-6">Dueño del Software SaaS</p>
            <input
              type="password"
              value={claveInput}
              onChange={(e) => setClaveInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (claveInput === CLAVE_SUPER_ADMIN ? setIsAuthed(true) : alert('❌ Clave incorrecta'))}
              placeholder="Ingresa tu clave"
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-xl mb-4 focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={() => claveInput === CLAVE_SUPER_ADMIN ? setIsAuthed(true) : alert('❌ Clave incorrecta')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-colors"
            >
              ENTRAR
            </button>
          </div>
        </div>
      )
    }

    // Filtrar transacciones de ventas a bares
    const ventasABares = todasTransacciones.filter(t => t.tipo === 'compra_software')
    const totalVentas = ventasABares.reduce((acc, t) => acc + t.total, 0)

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="bg-gradient-to-r from-purple-700 to-purple-900 p-4 sticky top-0 z-10">
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
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-purple-800 to-purple-900 rounded-xl p-3 border border-purple-600">
              <p className="text-purple-300 text-xs">BARES ACTIVOS</p>
              <p className="text-3xl font-bold text-white">{bares.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-3 border border-green-600">
              <p className="text-green-300 text-xs">CRÉDITOS TOTALES</p>
              <p className="text-3xl font-bold text-white">{bares.reduce((acc, b) => acc + (b.creditos_disponibles || 0), 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-800 to-blue-900 rounded-xl p-3 border border-blue-600">
              <p className="text-blue-300 text-xs">PRECIO BASE</p>
              <p className="text-2xl font-bold text-white">$5/cred</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 rounded-xl p-3 border border-yellow-600">
              <p className="text-yellow-300 text-xs">TOTAL VENTAS</p>
              <p className="text-3xl font-bold text-white">${totalVentas}</p>
            </div>
          </div>

          {/* CREAR NUEVO BAR */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3">➕ Agregar Nuevo Bar</h3>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const nombre = formData.get('nombre') as string
              if (nombre) {
                try {
                  await crearBar(nombre)
                  await cargarDatos()
                  alert('✅ Bar creado exitosamente')
                } catch (error) {
                  alert('❌ Error al crear bar')
                }
              }
            }} className="flex gap-2">
              <input 
                name="nombre"
                placeholder="Nombre del bar..."
                className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <button type="submit" className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-lg font-bold">
                Crear Bar
              </button>
            </form>
          </div>

          {/* LISTA DE BARES */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3">🏪 Lista de Bares</h3>
            <div className="space-y-3">
              {bares.map((barItem) => (
                <div key={barItem.id} className="bg-gray-700 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold">{barItem.nombre}</h4>
                      <p className="text-xs text-gray-400">ID: {barItem.id.substring(0, 8)}...</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-400">{barItem.creditos_disponibles || 0} créditos</p>
                      <p className="text-xs text-gray-400">Venta: ${barItem.precio_venta || 0}</p>
                    </div>
                  </div>
                  
                  {/* Vender créditos al bar */}
                  <div className="border-t border-gray-600 pt-2 mt-2">
                    <p className="text-xs text-gray-400 mb-2">Vender créditos:</p>
                    <div className="flex gap-1 flex-wrap">
                      {[10, 50, 100, 200].map(cant => (
                        <button
                          key={cant}
                          onClick={async () => {
                            try {
                              await comprarCreditosProveedor(barItem.id, cant, 5)
                              await cargarDatos()
                            } catch (error) {
                              alert('❌ Error')
                            }
                          }}
                          className="bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs font-bold"
                        >
                          +{cant} (${cant * 5})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* REPORTE DE VENTAS A BARES */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                📊 Reporte de Ventas a Bares
              </h3>
              <span className="text-green-400 font-bold">Total: ${totalVentas}</span>
            </div>
            
            {ventasABares.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left py-2 px-2">Fecha</th>
                      <th className="text-left py-2 px-2">Bar</th>
                      <th className="text-right py-2 px-2">Créditos</th>
                      <th className="text-right py-2 px-2">Precio Unit.</th>
                      <th className="text-right py-2 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasABares.map((t) => {
                      const barInfo = bares.find(b => b.id === t.bar_id)
                      return (
                        <tr key={t.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1 text-gray-400">
                              <Calendar className="w-3 h-3" />
                              {new Date(t.creado_en).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(t.creado_en).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="py-2 px-2 font-medium">{barInfo?.nombre || 'Bar'}</td>
                          <td className="py-2 px-2 text-right">{t.cantidad}</td>
                          <td className="py-2 px-2 text-right">${t.precio_unitario}</td>
                          <td className="py-2 px-2 text-right text-green-400 font-bold">${t.total}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay ventas registradas</p>
            )}
          </div>

          {/* Links exclusivos */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-bold mb-3">🔗 Links del Sistema</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
                <div>
                  <p className="font-medium text-sm">📺 TV</p>
                  <p className="text-xs text-gray-400 truncate">{getUrlTV()}</p>
                </div>
                <button onClick={() => copiarUrl(getUrlTV())} className="text-blue-400">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
                <div>
                  <p className="font-medium text-sm">👑 Admin Bar</p>
                  <p className="text-xs text-gray-400 truncate">{getUrlAdmin()}</p>
                </div>
                <button onClick={() => copiarUrl(getUrlAdmin())} className="text-blue-400">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
                <div>
                  <p className="font-medium text-sm">🍻 Clientes</p>
                  <p className="text-xs text-gray-400 truncate">{getUrlCliente()}</p>
                </div>
                <button onClick={() => copiarUrl(getUrlCliente())} className="text-blue-400">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
                <div>
                  <p className="font-medium text-sm">🏢 Super Admin</p>
                  <p className="text-xs text-gray-400 truncate">{getUrlSuperAdmin()}</p>
                </div>
                <button onClick={() => copiarUrl(getUrlSuperAdmin())} className="text-blue-400">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
