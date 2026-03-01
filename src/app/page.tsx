'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import YouTube, { YouTubeEvent } from 'react-youtube'
import { QRCodeSVG } from 'qrcode.react'
import {
  Play, Pause, SkipForward, Volume2, VolumeX,
  Users, Music, Search, Trash2, Check, X, Crown,
  DollarSign, BarChart3, Loader2, Wifi, WifiOff, ShoppingCart,
  Plus, LogOut, Copy, TrendingUp, FileSpreadsheet
} from 'lucide-react'
import { supabase, obtenerBar, obtenerCola, agregarCancion, actualizarEstadoCancion, eliminarCancion, obtenerTransacciones, comprarCreditosProveedor, venderCreditosCliente, suscribirseACambios, obtenerTodosLosBares, crearBar, obtenerTodasTransacciones, type Bar, type CancionCola, type Transaccion } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ============= CONFIGURACIÓN =============
const CLAVE_ADMIN = "1234"
const CLAVE_SUPER_ADMIN = "rockola2024"
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || ""
const DEFAULT_BAR_ID = "7b2fc122-93fa-4311-aaf9-184f0c111de1"

// Precios fijos
const PRECIO_COMPRA = 40   // Colones - lo que paga el bar al dueño del SaaS
const PRECIO_VENTA = 100   // Colones - lo que cobra el bar al cliente

interface VideoBusqueda {
  id: { videoId: string }
  snippet: {
    title: string
    thumbnails: { default: { url: string }; medium: { url: string } }
    channelTitle: string
  }
  duracionFormateada?: string
}

export default function RockolaSaaS() {
  // ============= MODO =============
  const [modo, setModo] = useState<'tv' | 'cliente' | 'admin' | 'superadmin'>('tv')
  
  // ============= ESTADOS =============
  const [bar, setBar] = useState<Bar | null>(null)
  const [bares, setBares] = useState<Bar[]>([])
  const [cola, setCola] = useState<CancionCola[]>([])
  const [cancionActual, setCancionActual] = useState<CancionCola | null>(null)
  const [volumen, setVolumen] = useState(50)
  const [pausado, setPausado] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [conectado, setConectado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // ============= CLIENTE =============
  const [creditosCliente, setCreditosCliente] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [videosBusqueda, setVideosBusqueda] = useState<VideoBusqueda[]>([])
  const [buscando, setBuscando] = useState(false)
  
  // ============= ADMIN =============
  const [claveInput, setClaveInput] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [todasTransacciones, setTodasTransacciones] = useState<Transaccion[]>([])
  const [nombreClienteInput, setNombreClienteInput] = useState('')
  const [creditosAVender, setCreditosAVender] = useState(0)
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false)
  
  // ============= PLAYER =============
  const [player, setPlayer] = useState<any>(null)
  const playerRef = useRef<any>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const [currentUrl, setCurrentUrl] = useState('')

  // ============= DETECTAR MODO =============
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const modoUrl = params.get('modo')
    
    if (modoUrl === 'cliente') setModo('cliente')
    else if (modoUrl === 'admin') setModo('admin')
    else if (modoUrl === 'superadmin') setModo('superadmin')
    else setModo('tv')

    setCurrentUrl(window.location.origin)
  }, [])

  // ============= CARGAR DATOS =============
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true)
      setError(null)

      if (!supabase) {
        throw new Error('Supabase no configurado')
      }

      if (modo === 'superadmin') {
        const baresData = await obtenerTodosLosBares()
        setBares(baresData)
        const transData = await obtenerTodasTransacciones()
        setTodasTransacciones(transData)
        setConectado(true)
        return
      }

      const barData = await obtenerBar(DEFAULT_BAR_ID)
      setBar(barData)

      const colaData = await obtenerCola(DEFAULT_BAR_ID)
      setCola(colaData)

      const actual = colaData.find(c => c.estado === 'reproduciendo')
      setCancionActual(actual || null)

      const transData = await obtenerTransacciones(DEFAULT_BAR_ID)
      setTransacciones(transData)

      setConectado(true)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error de conexión')
      setConectado(false)
    } finally {
      setCargando(false)
    }
  }, [modo])

  // ============= SUSCRIPCIÓN =============
  useEffect(() => {
    if (modo === 'superadmin') {
      cargarDatos()
      return
    }
    
    cargarDatos()

    unsubscribeRef.current = suscribirseACambios(DEFAULT_BAR_ID, {
      onBarCambio: (nuevoBar) => setBar(nuevoBar),
      onColaCambio: (nuevaCola) => {
        setCola(nuevaCola)
        const actual = nuevaCola.find(c => c.estado === 'reproduciendo')
        setCancionActual(actual || null)
      },
      onTransaccionCambio: () => {
        obtenerTransacciones(DEFAULT_BAR_ID).then(setTransacciones)
      }
    })

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current()
    }
  }, [modo, cargarDatos])

  // ============= BUSCAR VIDEOS =============
  const buscarVideos = async () => {
    if (!busqueda.trim()) return
    setBuscando(true)

    try {
      const query = encodeURIComponent(busqueda)
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${query}&type=video&key=${YOUTUBE_API_KEY}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.items?.length > 0) {
        const videoIds = data.items.map((v: VideoBusqueda) => v.id.videoId).join(',')
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
        const detailsRes = await fetch(detailsUrl)
        const detailsData = await detailsRes.json()

        const videosConDuracion = data.items.map((v: VideoBusqueda) => {
          const detail = detailsData.items?.find((d: any) => d.id === v.id.videoId)
          const duration = detail?.contentDetails?.duration || ''
          const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
          const hours = parseInt((match?.[1] || '0H').replace('H', '')) || 0
          const minutes = parseInt((match?.[2] || '0M').replace('M', '')) || 0
          const seconds = parseInt((match?.[3] || '0S').replace('S', '')) || 0
          const duracionFormateada = hours > 0 
            ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            : `${minutes}:${seconds.toString().padStart(2, '0')}`
          return { ...v, duracionFormateada }
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

  // ============= AGREGAR A COLA =============
  const agregarACola = async (video: VideoBusqueda) => {
    if (!bar) return
    
    if (creditosCliente < 1) {
      alert('❌ No tienes créditos. Pide al administrador que te recargue.')
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
        costo_creditos: PRECIO_VENTA,
        precio_venta: PRECIO_VENTA,
        solicitado_por: 'Cliente',
        posicion: cola.length
      })

      setCreditosCliente(prev => prev - 1)
      setBusqueda('')
      setVideosBusqueda([])
      alert(`✅ "${video.snippet.title}" agregado a la cola`)
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al agregar')
    }
  }

  // ============= REPRODUCCIÓN =============
  const reproducirSiguiente = useCallback(async () => {
    const colaAprobada = cola.filter(c => c.estado === 'aprobada')
    if (colaAprobada.length > 0) {
      const siguiente = colaAprobada[0]
      await actualizarEstadoCancion(siguiente.id, 'reproduciendo')
      setCancionActual(siguiente)
    } else {
      setCancionActual(null)
    }
  }, [cola])

  const onVideoEnd = useCallback(async () => {
    if (cancionActual) {
      await eliminarCancion(cancionActual.id)
      setCancionActual(null)
      setTimeout(() => reproducirSiguiente(), 500)
    }
  }, [cancionActual, reproducirSiguiente])

  const onPlayerReady = (event: YouTubeEvent) => {
    playerRef.current = event.target
    setPlayer(event.target)
    event.target.setVolume(volumen)
  }

  const togglePause = () => {
    if (player) {
      if (pausado) player.playVideo()
      else player.pauseVideo()
      setPausado(!pausado)
    }
  }

  // ============= REPRODUCIR SIGUIENTE AUTO =============
  useEffect(() => {
    if (modo === 'tv' && !cancionActual && cola.filter(c => c.estado === 'aprobada').length > 0) {
      reproducirSiguiente()
    }
  }, [modo, cancionActual, cola, reproducirSiguiente])

  // ============= ADMIN: VENDER CRÉDITOS =============
  const confirmarVentaCliente = async () => {
    if (!nombreClienteInput.trim()) {
      alert('Ingresa el nombre del cliente')
      return
    }
    if (!bar) return
    
    try {
      await venderCreditosCliente(bar.id, nombreClienteInput.trim(), creditosAVender)
      await cargarDatos()
      setModalClienteAbierto(false)
      setNombreClienteInput('')
      alert(`✅ ${creditosAVender} créditos vendidos a ${nombreClienteInput} = ₡${creditosAVender * PRECIO_VENTA}`)
    } catch (error: any) {
      alert(error.message || 'Error al vender')
    }
  }

  // ============= SUPER ADMIN: COMPRAR CRÉDITOS =============
  const comprarCreditos = async (barId: string, cantidad: number) => {
    try {
      await comprarCreditosProveedor(barId, cantidad, PRECIO_COMPRA)
      await cargarDatos()
      alert(`✅ ${cantidad} créditos agregados = ₡${cantidad * PRECIO_COMPRA}`)
    } catch (error) {
      alert('Error al comprar créditos')
    }
  }

  // ============= EXPORTAR EXCEL =============
  const exportarExcel = () => {
    const datos = todasTransacciones.map(t => ({
      Fecha: new Date(t.creado_en).toLocaleDateString(),
      Bar: bares.find(b => b.id === t.bar_id)?.nombre || 'N/A',
      Tipo: t.tipo,
      Cantidad: t.cantidad,
      'Precio Unitario': t.precio_unitario,
      Total: t.total,
      Cliente: t.cliente_nombre || '-'
    }))
    
    const csv = [
      Object.keys(datos[0] || {}).join(','),
      ...datos.map(d => Object.values(d).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // ============= URLS =============
  const getUrlCliente = () => `${currentUrl}?modo=cliente`
  const getUrlAdmin = () => `${currentUrl}?modo=admin`
  const getUrlSuperAdmin = () => `${currentUrl}?modo=superadmin`
  const getUrlTV = () => currentUrl

  const copiarUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    alert('✅ Link copiado')
  }

  // ============= PANTALLA DE ERROR =============
  if (error && modo !== 'tv') {
    return (
      <div className="min-h-screen bg-red-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <WifiOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Error de Conexión</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => cargarDatos()} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ============= PANTALLA DE CARGA =============
  if (cargando && modo !== 'tv') {
    return (
      <div className="min-h-screen bg-purple-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Conectando...</p>
        </div>
      </div>
    )
  }

  // ================================================================
  // MODO TV - SOLO VIDEO SIN BOTONES
  // ================================================================
  if (modo === 'tv') {
    if (error) {
      return (
        <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
          <div className="text-center max-w-lg">
            <WifiOff className="w-20 h-20 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-4">Error de Conexión</h1>
            <p className="text-gray-400 mb-4">{error}</p>
            <button onClick={() => cargarDatos()} className="bg-purple-600 text-white py-3 px-8 rounded-xl font-bold">
              Reintentar
            </button>
          </div>
        </div>
      )
    }
    
    return (
      <div className="fixed inset-0 bg-black">
        {cancionActual ? (
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
                fs: 0
              }
            }}
            onReady={onPlayerReady}
            onEnd={onVideoEnd}
            iframeClassName="w-full h-full absolute inset-0"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Music className="w-32 h-32 text-purple-500 mx-auto mb-6 animate-pulse" />
            <h1 className="text-5xl font-bold text-white mb-4">🎵 ROCKOLA</h1>
            <p className="text-gray-400 text-xl mb-8">{bar?.nombre || 'Cargando...'}</p>
            
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              <QRCodeSVG value={getUrlCliente()} size={200} />
              <p className="text-black mt-4 font-bold text-lg">📱 Escanea para pedir música</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ================================================================
  // MODO CLIENTE - PANTALLA COMPARTIDA SIN REGISTRO
  // ================================================================
  if (modo === 'cliente') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800">
        <div className="max-w-2xl mx-auto p-4">
          {/* Bienvenida con nombre del bar */}
          <div className="bg-white rounded-2xl p-6 mb-4 shadow-xl text-center">
            <h1 className="text-3xl font-bold text-green-700 mb-2">🍻 Bienvenido a</h1>
            <h2 className="text-4xl font-bold text-green-600">{bar?.nombre || 'ROCKOLA'}</h2>
            <p className="text-gray-500 mt-2">Pide tu música o video favorito</p>
          </div>

          {/* Créditos disponibles - visible para todos */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 mb-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-lg font-medium">Créditos Disponibles</p>
                <p className="text-white/80 text-sm">El administrador te recarga aquí</p>
              </div>
              <div className="bg-white rounded-xl px-8 py-4">
                <p className="text-5xl font-bold text-green-600">{bar?.creditos_disponibles || 0}</p>
              </div>
            </div>
          </div>

          {/* Mensaje si no hay créditos */}
          {(!bar?.creditos_disponibles || bar.creditos_disponibles === 0) && (
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4 mb-4">
              <p className="text-yellow-700 text-center font-medium">
                💡 Sin créditos disponibles. Solicita al administrador que te recargue.
              </p>
            </div>
          )}

          {/* Buscador */}
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-xl">
            <h2 className="font-bold text-lg mb-3">🔍 Buscar Música o Video</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarVideos()}
                placeholder="Artista, canción o video..."
                className="flex-1 p-3 border-2 border-gray-200 rounded-xl text-lg focus:border-green-500 focus:outline-none"
              />
              <button 
                onClick={buscarVideos} 
                disabled={buscando}
                className="bg-red-600 hover:bg-red-700 text-white px-6 rounded-xl font-bold text-xl disabled:bg-gray-400 transition-colors"
              >
                {buscando ? '⏳' : '🔍'}
              </button>
            </div>

            {/* Resultados */}
            {videosBusqueda.length > 0 && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {videosBusqueda.map((video) => (
                  <button
                    key={video.id.videoId}
                    onClick={() => agregarACola(video)}
                    disabled={!bar?.creditos_disponibles || bar.creditos_disponibles < 1}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all ${
                      (bar?.creditos_disponibles || 0) >= 1 
                        ? 'bg-gray-100 hover:bg-green-100 active:scale-[0.98]' 
                        : 'bg-gray-100 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <img src={video.snippet.thumbnails.default.url} alt="" className="w-16 h-12 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{video.snippet.title}</p>
                      <p className="text-sm text-gray-500">{video.snippet.channelTitle} • {video.duracionFormateada}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg font-bold ${
                      (bar?.creditos_disponibles || 0) >= 1 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-300 text-gray-500'
                    }`}>
                      {(bar?.creditos_disponibles || 0) >= 1 ? '✓ 1' : '❌'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cola de reproducción */}
          <div className="bg-white rounded-2xl p-4 shadow-xl">
            <h2 className="font-bold text-lg mb-3">🎵 Cola de Reproducción</h2>
            
            {cancionActual && (
              <div className="bg-green-100 border-2 border-green-500 p-3 rounded-xl mb-3 flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{cancionActual.titulo}</p>
                  <p className="text-sm text-green-600">▶️ Reproduciendo ahora</p>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cola.filter(c => c.estado === 'aprobada').map((cancion, idx) => (
                <div key={cancion.id} className="bg-gray-100 p-3 rounded-xl flex items-center gap-3">
                  <span className="text-gray-400 font-bold text-lg w-8">{idx + 1}</span>
                  <img src={cancion.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{cancion.titulo}</p>
                  </div>
                </div>
              ))}
              
              {cola.filter(c => c.estado === 'pendiente').length > 0 && (
                <div className="bg-yellow-100 p-2 rounded-lg text-center text-yellow-700">
                  ⏳ {cola.filter(c => c.estado === 'pendiente').length} pendientes de aprobación
                </div>
              )}
              
              {cola.filter(c => c.estado === 'aprobada').length === 0 && !cancionActual && (
                <p className="text-gray-400 text-center py-4">No hay canciones en cola</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // MODO ADMIN - DUEÑO DEL BAR
  // ================================================================
  if (modo === 'admin') {
    if (!isAuthed) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-center mb-4">👑 Admin Bar</h2>
            <input
              type="password"
              value={claveInput}
              onChange={(e) => setClaveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (claveInput === CLAVE_ADMIN) setIsAuthed(true)
                  else if (claveInput === CLAVE_SUPER_ADMIN) { setIsAuthed(true); setModo('superadmin') }
                  else alert('❌ Clave incorrecta')
                }
              }}
              placeholder="Clave de acceso"
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-xl mb-4 focus:border-yellow-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => {
                if (claveInput === CLAVE_ADMIN) setIsAuthed(true)
                else if (claveInput === CLAVE_SUPER_ADMIN) { setIsAuthed(true); setModo('superadmin') }
                else alert('❌ Clave incorrecta')
              }}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 rounded-xl text-xl transition-colors"
            >
              ENTRAR
            </button>
          </div>
        </div>
      )
    }

    // Funciones del Admin
    const handleAprobar = async (cancionId: string) => {
      try {
        await actualizarEstadoCancion(cancionId, 'aprobada')
        await cargarDatos()
      } catch (error) {
        alert('Error al aprobar')
      }
    }

    const handleRechazar = async (cancionId: string) => {
      try {
        await eliminarCancion(cancionId)
        await cargarDatos()
      } catch (error) {
        alert('Error al rechazar')
      }
    }

    const handleEliminarCola = async (cancionId: string) => {
      try {
        await eliminarCancion(cancionId)
        await cargarDatos()
      } catch (error) {
        alert('Error al eliminar')
      }
    }

    const handleTogglePause = () => {
      if (player) {
        if (pausado) player.playVideo()
        else player.pauseVideo()
        setPausado(!pausado)
      }
    }

    const handleSkip = async () => {
      if (cancionActual) {
        await eliminarCancion(cancionActual.id)
        setCancionActual(null)
        setTimeout(() => reproducirSiguiente(), 500)
      }
    }

    const handleVolumen = (nuevoVolumen: number) => {
      if (player) player.setVolume(nuevoVolumen)
      setVolumen(nuevoVolumen)
    }

    return (
      <div className="min-h-screen bg-gray-100">
        {/* Modal vender créditos */}
        {modalClienteAbierto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-xl font-bold mb-2">💰 Vender {creditosAVender} créditos</h3>
              <p className="text-gray-600 mb-4">Total a cobrar: <span className="font-bold text-green-600">₡{creditosAVender * PRECIO_VENTA}</span></p>
              <input
                type="text"
                value={nombreClienteInput}
                onChange={(e) => setNombreClienteInput(e.target.value)}
                placeholder="Nombre del cliente"
                className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4 text-lg focus:border-green-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && confirmarVentaCliente()}
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => { setModalClienteAbierto(false); setNombreClienteInput('') }} 
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmarVentaCliente} 
                  disabled={!nombreClienteInput.trim()}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 text-white sticky top-0 z-10">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">👑 {bar?.nombre || 'Admin Bar'}</h1>
              <p className="text-sm opacity-80">Panel de Administración</p>
            </div>
            <button 
              onClick={() => { setIsAuthed(false); setClaveInput('') }} 
              className="bg-black/20 hover:bg-black/30 px-4 py-2 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Mi Bolsa de Créditos */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-gray-500 mb-2">Mi Bolsa de Créditos</h2>
            <p className="text-6xl font-bold text-green-600">{bar?.creditos_disponibles || 0}</p>
            <p className="text-gray-400">créditos disponibles</p>
          </div>

          {/* Vender Créditos - SOLO 1, 5, 10, 20 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="font-bold text-lg mb-2">💰 Vender Créditos a Clientes</h2>
            <p className="text-gray-500 text-sm mb-4">Precio: ₡{PRECIO_VENTA} por crédito</p>
            <div className="grid grid-cols-4 gap-3">
              {[1, 5, 10, 20].map(cant => (
                <button
                  key={cant}
                  onClick={() => {
                    if ((bar?.creditos_disponibles || 0) >= cant) {
                      setCreditosAVender(cant)
                      setNombreClienteInput('')
                      setModalClienteAbierto(true)
                    } else {
                      alert('❌ No tienes suficientes créditos')
                    }
                  }}
                  disabled={(bar?.creditos_disponibles || 0) < cant}
                  className={`py-4 rounded-xl font-bold text-lg transition-all ${
                    (bar?.creditos_disponibles || 0) >= cant 
                      ? 'bg-green-500 hover:bg-green-600 text-white active:scale-95' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {cant}
                  <span className="block text-xs opacity-80">₡{cant * PRECIO_VENTA}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Controles de Reproducción */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 shadow-lg text-white">
            <h2 className="font-bold text-lg mb-4">🎮 Control de Reproducción</h2>
            
            {cancionActual ? (
              <div className="bg-white/20 rounded-xl p-3 mb-4">
                <p className="font-bold truncate">{cancionActual.titulo}</p>
                <p className="text-sm opacity-80">
                  {pausado ? '⏸️ Pausado' : '▶️ Reproduciendo'}
                </p>
              </div>
            ) : (
              <p className="text-white/60 mb-4">No hay canción reproduciéndose</p>
            )}

            <div className="flex gap-3 justify-center mb-4">
              <button 
                onClick={handleTogglePause}
                disabled={!cancionActual}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                  cancionActual ? 'bg-white text-purple-600 hover:bg-gray-100 active:scale-95' : 'bg-white/30 text-white/50'
                }`}
              >
                {pausado ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                {pausado ? 'Reanudar' : 'Pausar'}
              </button>
              <button 
                onClick={handleSkip}
                disabled={!cancionActual}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                  cancionActual ? 'bg-red-500 text-white hover:bg-red-600 active:scale-95' : 'bg-white/30 text-white/50'
                }`}
              >
                <SkipForward className="w-5 h-5" />
                Siguiente
              </button>
            </div>

            <div className="flex items-center gap-3">
              {volumen === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={volumen} 
                onChange={(e) => handleVolumen(parseInt(e.target.value))} 
                className="flex-1 accent-white"
              />
              <span className="w-10 text-right text-sm">{volumen}%</span>
            </div>
          </div>

          {/* Pendientes de aprobación */}
          {cola.filter(c => c.estado === 'pendiente').length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-4">
              <h2 className="font-bold text-yellow-700 mb-3">
                ⏳ Pendientes de Aprobación ({cola.filter(c => c.estado === 'pendiente').length})
              </h2>
              <div className="space-y-2">
                {cola.filter(c => c.estado === 'pendiente').map(cancion => (
                  <div key={cancion.id} className="bg-white p-3 rounded-xl flex items-center gap-3">
                    <img src={cancion.thumbnail} alt="" className="w-14 h-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cancion.titulo}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAprobar(cancion.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold transition-colors active:scale-95"
                      >
                        ✓ Aprobar
                      </button>
                      <button 
                        onClick={() => handleRechazar(cancion.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-colors active:scale-95"
                      >
                        ✗ Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cola de Reproducción */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="font-bold text-lg mb-4">🎵 Cola de Reproducción ({cola.filter(c => c.estado === 'aprobada').length})</h2>
            
            {cola.filter(c => c.estado === 'aprobada').length === 0 ? (
              <p className="text-gray-400 text-center py-4">No hay canciones en cola</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cola.filter(c => c.estado === 'aprobada').map((cancion, idx) => (
                  <div key={cancion.id} className="bg-gray-100 p-3 rounded-xl flex items-center gap-3">
                    <span className="text-gray-400 font-bold text-lg w-8">{idx + 1}</span>
                    <img src={cancion.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cancion.titulo}</p>
                    </div>
                    <button 
                      onClick={() => handleEliminarCola(cancion.id)}
                      className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="font-bold text-lg mb-4">🔗 Links del Sistema</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gray-100 p-3 rounded-xl">
                <div>
                  <p className="font-bold">📺 TV</p>
                  <p className="text-xs text-gray-500">{getUrlTV()}</p>
                </div>
                <button 
                  onClick={() => copiarUrl(getUrlTV())} 
                  className="text-blue-500 hover:text-blue-700 p-2"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-100 p-3 rounded-xl">
                <div>
                  <p className="font-bold">👤 Cliente</p>
                  <p className="text-xs text-gray-500">{getUrlCliente()}</p>
                </div>
                <button 
                  onClick={() => copiarUrl(getUrlCliente())} 
                  className="text-blue-500 hover:text-blue-700 p-2"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // MODO SUPER ADMIN - DUEÑO DEL SAAS
  // ================================================================
  if (modo === 'superadmin') {
    if (!isAuthed) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-600 to-teal-700 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <Crown className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-center mb-2">🎵 MERKA 4.0</h2>
            <p className="text-center text-green-600 font-bold mb-4">SUPER ADMIN</p>
            <input
              type="password"
              value={claveInput}
              onChange={(e) => setClaveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (claveInput === CLAVE_SUPER_ADMIN) setIsAuthed(true)
                  else alert('❌ Clave incorrecta')
                }
              }}
              placeholder="Clave de acceso"
              className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-xl mb-4 focus:border-green-500 focus:outline-none"
            />
            <button
              onClick={() => {
                if (claveInput === CLAVE_SUPER_ADMIN) setIsAuthed(true)
                else alert('❌ Clave incorrecta')
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-xl"
            >
              ENTRAR
            </button>
          </div>
        </div>
      )
    }

    // Función para eliminar transacción
    const eliminarTransaccion = async (transaccionId: string, barId: string, cantidad: number, tipo: string) => {
      if (!confirm('¿Estás seguro de eliminar esta transacción?')) return
      
      try {
        // Eliminar transacción
        await supabase.from('transacciones').delete().eq('id', transaccionId)
        
        // Si es compra_software, restar créditos del bar
        if (tipo === 'compra_software') {
          const { data: bar } = await supabase.from('bares').select('creditos_disponibles').eq('id', barId).single()
          if (bar) {
            await supabase
              .from('bares')
              .update({ creditos_disponibles: Math.max(0, bar.creditos_disponibles - cantidad) })
              .eq('id', barId)
          }
        }
        
        cargarDatos()
        alert('✅ Transacción eliminada')
      } catch (error) {
        alert('Error al eliminar')
      }
    }

    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-black p-4 text-white">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">🎵 MERKA 4.0 - SÚPER ADMIN</h1>
              <p className="text-sm opacity-80">Panel de Control - Dueño del SaaS</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportarExcel} className="bg-green-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
              <button onClick={() => setIsAuthed(false)} className="bg-white/20 px-4 py-2 rounded-lg">
                Salir
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 space-y-4">
          {/* Precio Base */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 shadow-lg text-center">
            <p className="text-white text-sm mb-1">PRECIO BASE POR CRÉDITO</p>
            <p className="text-5xl font-bold text-white">₡{PRECIO_COMPRA}</p>
            <p className="text-white/80 text-sm mt-1">colones por crédito</p>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-lg text-center">
              <p className="text-gray-500 text-sm">Bares Activos</p>
              <p className="text-4xl font-bold text-purple-600">{bares.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg text-center">
              <p className="text-gray-500 text-sm">Total Créditos Activos</p>
              <p className="text-4xl font-bold text-green-600">
                {bares.reduce((sum, b) => sum + b.creditos_disponibles, 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg text-center">
              <p className="text-gray-500 text-sm">Ventas Totales</p>
              <p className="text-4xl font-bold text-blue-600">
                ₡{todasTransacciones.filter(t => t.tipo === 'compra_software').reduce((sum, t) => sum + t.total, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Lista de Bares - Acreditar Créditos */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="font-bold text-lg mb-4">🏪 Bares - Acreditar Créditos</h2>
            <div className="space-y-4">
              {bares.map(b => (
                <div key={b.id} className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-lg">{b.nombre}</p>
                      <p className="text-gray-500">Créditos actuales: <span className="font-bold text-green-600">{b.creditos_disponibles}</span></p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[50, 100, 200, 500].map(cant => (
                      <button
                        key={cant}
                        onClick={() => comprarCreditos(b.id, cant)}
                        className="bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold transition-colors"
                      >
                        +{cant}
                        <span className="block text-xs opacity-80">₡{(cant * PRECIO_COMPRA).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Últimas transacciones con opción de borrar */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="font-bold text-lg mb-4">📊 Últimas Transacciones</h2>
            <p className="text-gray-500 text-sm mb-4">Haz clic en 🗑️ para eliminar una transacción incorrecta</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Fecha</th>
                    <th className="p-2 text-left">Bar</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-right">Cantidad</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {todasTransacciones.slice(0, 30).map(t => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{new Date(t.creado_en).toLocaleDateString()}</td>
                      <td className="p-2">{bares.find(b => b.id === t.bar_id)?.nombre || '-'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          t.tipo === 'compra_software' ? 'bg-blue-100 text-blue-700' :
                          t.tipo === 'venta_cliente' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {t.tipo === 'compra_software' ? 'Compra' : t.tipo === 'venta_cliente' ? 'Venta' : t.tipo}
                        </span>
                      </td>
                      <td className="p-2 text-right font-medium">{t.cantidad}</td>
                      <td className="p-2 text-right font-bold">₡{t.total.toLocaleString()}</td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => eliminarTransaccion(t.id, t.bar_id, t.cantidad, t.tipo)}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Eliminar transacción"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Links */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="font-bold text-lg mb-4">🔗 Links del Sistema</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: '📺 TV', url: getUrlTV() },
                { name: '👤 Cliente', url: getUrlCliente() },
                { name: '👑 Admin Bar', url: getUrlAdmin() },
                { name: '🔐 Super Admin', url: getUrlSuperAdmin() }
              ].map(link => (
                <div key={link.name} className="flex items-center justify-between bg-gray-100 p-3 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{link.name}</p>
                    <p className="text-xs text-gray-500 truncate">{link.url}</p>
                  </div>
                  <button onClick={() => copiarUrl(link.url)} className="text-blue-500 ml-2">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
