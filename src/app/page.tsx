'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import YouTube, { YouTubeEvent } from 'react-youtube'
import {
  Play, Pause, SkipForward, Trash2, Check, X, Crown,
  Music, Search, Building, Loader2, WifiOff, Wifi,
  Plus, LogOut, Copy, ExternalLink, Power, Sparkles,
  Download, FileSpreadsheet, Trash2 as TrashIcon
} from 'lucide-react'
import { supabase, supabaseConfigured, obtenerBar, obtenerCola, agregarCancion, actualizarEstadoCancion, eliminarCancion, obtenerTransacciones, comprarCreditosProveedor, obtenerTodosLosBares, crearBar, obtenerTodasTransacciones, actualizarEstadoBar, eliminarBar, type Bar, type CancionCola, type Transaccion } from '@/lib/supabase'

// ============= CONFIGURACIÓN =============
const CLAVE_ADMIN = "1234"
const CLAVE_SUPER_ADMIN = "rockola2024"
const YOUTUBE_API_KEY = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "") : ""

// Verificar si Supabase está configurado
const supabaseConfigurado = typeof window !== 'undefined' && supabase !== null

// ============= PRECIOS =============
const PRECIO_COMPRA_CREDITO = 40
const PRECIO_VENTA_CREDITO = 100
const UTILIDAD_CREDITO = PRECIO_VENTA_CREDITO - PRECIO_COMPRA_CREDITO

const esUUIDValido = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
const formatColones = (amount: number) => `₡${amount.toLocaleString('es-CR')}`

const Branding = () => (
  <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center gap-2 py-2">
    <Sparkles className="w-4 h-4 text-yellow-400" />
    MERKA 4.0 Rockola Saas para tí
    <Sparkles className="w-4 h-4 text-pink-400" />
  </div>
)

// Loading component for Suspense
const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900 flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl animate-bounce mb-4">🎵</div>
      <p className="text-white text-2xl font-bold">Cargando Rockola...</p>
      <Branding />
    </div>
  </div>
)

interface VideoBusqueda {
  id: { videoId: string }
  snippet: { 
    title: string; 
    thumbnails: { default: { url: string }; medium: { url: string } }; 
    channelTitle: string 
  }
  duracionFormateada?: string
  artista?: string
  cancion?: string
  esVideoMusical?: boolean
}

// Main component that uses useSearchParams
function RockolaContent() {
  const searchParams = useSearchParams()
  const modoUrl = searchParams.get('modo') || 'tv'
  const barIdUrl = searchParams.get('bar') || ''
  
  const [modo, setModo] = useState(modoUrl)
  const [mounted, setMounted] = useState(false)
  const [bar, setBar] = useState<Bar | null>(null)
  const [bares, setBares] = useState<Bar[]>([])
  const [cola, setCola] = useState<CancionCola[]>([])
  const [cancionActual, setCancionActual] = useState<CancionCola | null>(null)
  const [volumen] = useState(50)
  const [pausado, setPausado] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  const [duracionTotal, setDuracionTotal] = useState(0)
  const [claveInput, setClaveInput] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [videosBusqueda, setVideosBusqueda] = useState<VideoBusqueda[]>([])
  const [buscando, setBuscando] = useState(false)
  const [nombreCliente, setNombreCliente] = useState('')
  const [clienteActivo, setClienteActivo] = useState(false)
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [todasTransacciones, setTodasTransacciones] = useState<Transaccion[]>([])
  const [nuevoBarCreado, setNuevoBarCreado] = useState<{bar: Bar, claveAdmin: string} | null>(null)
  const [barParaEliminar, setBarParaEliminar] = useState<Bar | null>(null)
  const [nuevoBarNombre, setNuevoBarNombre] = useState('')
  const [nuevoBarWhatsApp, setNuevoBarWhatsApp] = useState('')
  const [nuevoBarCorreo, setNuevoBarCorreo] = useState('')
  const [nuevoBarClave, setNuevoBarClave] = useState('')
  const [creandoBar, setCreandoBar] = useState(false)
  const [player, setPlayer] = useState<any>(null)
  const playerRef = useRef<any>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isTransitioningRef = useRef(false)
  const [currentUrl, setCurrentUrl] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('mes')
  const [filtroBar, setFiltroBar] = useState<string>('todos')
  const [conectado, setConectado] = useState(false)
  const [tvActivado, setTvActivado] = useState(false)
  const [barExpandido, setBarExpandido] = useState<string | null>(null)
  const [filtroHistorialBar, setFiltroHistorialBar] = useState<{[barId: string]: 'hoy' | 'semana' | 'mes' | 'todo'}>({})

  // ============= INICIALIZACIÓN =============
  useEffect(() => {
    if (typeof window === 'undefined') return
    setMounted(true)
    
    // Verificar si Supabase está configurado
    if (!supabaseConfigured) {
      setError('⚠️ Supabase no está configurado. Ve a Render → Environment y agrega las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
      setCargando(false)
      return
    }
    
    setCurrentUrl(window.location.origin)
    
    // Cargar nombre desde localStorage
    const nombreGuardado = localStorage.getItem('rockola_nombre')
    if (nombreGuardado) {
      setNombreCliente(nombreGuardado)
      setClienteActivo(true)
    }
    
    // Cargar tvActivado desde localStorage (válido por 24 horas)
    const tvActivadoData = localStorage.getItem('rockola_tv_activado')
    if (tvActivadoData) {
      try {
        const { activado, fecha } = JSON.parse(tvActivadoData)
        const fechaGuardada = new Date(fecha)
        const ahora = new Date()
        const horasPasadas = (ahora.getTime() - fechaGuardada.getTime()) / (1000 * 60 * 60)
        // Si pasó menos de 24 horas, mantener activado
        if (activado && horasPasadas < 24) {
          setTvActivado(true)
        } else {
          localStorage.removeItem('rockola_tv_activado')
        }
      } catch {
        localStorage.removeItem('rockola_tv_activado')
      }
    }
  }, [])
  
  const barId = barIdUrl || bar?.id || ''

  // ============= CARGAR DATOS =============
  useEffect(() => {
    if (!barId && modo !== 'superadmin') return
    
    const cargar = async () => {
      try {
        setCargando(true)
        
        if (modo === 'superadmin') {
          const baresData = await obtenerTodosLosBares()
          setBares(baresData)
          const transData = await obtenerTodasTransacciones()
          setTodasTransacciones(transData)
          setCargando(false)
          return
        }

        if (!esUUIDValido(barId)) {
          setError('URL inválida. Usa el link correcto.')
          setCargando(false)
          return
        }

        const barData = await obtenerBar(barId)
        setBar(barData)

        const colaData = await obtenerCola(barId)
        setCola(colaData)

        const actual = colaData.find(c => c.estado === 'reproduciendo') || null
        setCancionActual(actual)

        const transData = await obtenerTransacciones(barId)
        setTransacciones(transData)
        
        setCargando(false)
      } catch (err: any) {
        console.error('Error:', err)
        setError(err.message || 'Error de conexión')
        setCargando(false)
      }
    }
    
    cargar()

    // Suscripción en tiempo real
    const channel = supabase.channel(`rockola-${barId}`)
    
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'bares', filter: `id=eq.${barId}` }, 
      (payload) => { 
        setConectado(true)
        if (payload.new) setBar(payload.new as Bar) 
      })
    
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'canciones_cola', filter: `bar_id=eq.${barId}` }, 
      async () => {
        setConectado(true)
        const colaData = await obtenerCola(barId)
        setCola(colaData)
        const actual = colaData.find(c => c.estado === 'reproduciendo') || null
        setCancionActual(actual)
      })

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') setConectado(true)
      else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setConectado(false)
    })

    return () => { 
      supabase.removeChannel(channel)
    }
  }, [modo, barId])

  // ============= PROGRESS BAR =============
  useEffect(() => {
    if (cancionActual && player) {
      progressIntervalRef.current = setInterval(() => {
        try {
          const current = player.getCurrentTime?.() || 0
          const duration = player.getDuration?.() || 0
          setTiempoTranscurrido(Math.floor(current))
          setDuracionTotal(Math.floor(duration))
        } catch {}
      }, 1000)
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [cancionActual, player])

  // ============= REPRODUCCIÓN AUTOMÁTICA =============
  const reproducirSiguiente = useCallback(async (colaActual: CancionCola[]) => {
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true
    
    try {
      const colaAprobada = colaActual.filter(c => c.estado === 'aprobada')
      if (colaAprobada.length > 0) {
        const siguiente = colaAprobada[0]
        await actualizarEstadoCancion(siguiente.id, 'reproduciendo')
        setCancionActual(siguiente)
        setCola(prev => prev.map(c => c.id === siguiente.id ? {...c, estado: 'reproduciendo'} : c))
      } else {
        setCancionActual(null)
      }
    } finally {
      setTimeout(() => { isTransitioningRef.current = false }, 500)
    }
  }, [])

  // Reproducción automática cuando hay canciones y TV está activa
  useEffect(() => {
    // Solo en modo TV y cuando está activado
    if (modo !== 'tv' || !tvActivado) return
    // Si ya hay canción reproduciéndose, no hacer nada
    if (cancionActual) return
    // Si ya se está transicionando, esperar
    if (isTransitioningRef.current) return
    
    // Verificar si hay canciones aprobadas
    const colaAprobada = cola.filter(c => c.estado === 'aprobada')
    if (colaAprobada.length > 0) {
      console.log('🎵 Reproducción automática: detectada canción pendiente')
      reproducirSiguiente(cola)
    }
  }, [modo, tvActivado, cancionActual, cola, reproducirSiguiente])

  // ============= SELF-PING PARA MANTENER RENDER ACTIVO =============
  useEffect(() => {
    if (modo !== 'tv' || !tvActivado) return
    
    // Ping inicial
    fetch('/api/ping').then(() => console.log('🏓 Ping inicial enviado'))
    
    // Ping cada 10 minutos para mantener el servicio activo
    const pingInterval = setInterval(() => {
      fetch('/api/ping')
        .then(() => console.log('🏓 Self-ping enviado - Manteniendo servicio activo'))
        .catch((e) => console.log('🏓 Error en self-ping:', e))
    }, 10 * 60 * 1000) // 10 minutos
    
    return () => clearInterval(pingInterval)
  }, [modo, tvActivado])

  const onVideoEnd = useCallback(async () => {
    if (cancionActual) {
      await eliminarCancion(cancionActual.id)
      const colaActualizada = await obtenerCola(barId)
      setCola(colaActualizada)
      
      const colaAprobada = colaActualizada.filter(c => c.estado === 'aprobada')
      if (colaAprobada.length > 0) {
        const siguiente = colaAprobada[0]
        await actualizarEstadoCancion(siguiente.id, 'reproduciendo')
        setCancionActual(siguiente)
        setCola(colaActualizada.map(c => c.id === siguiente.id ? {...c, estado: 'reproduciendo'} : c))
      } else {
        setCancionActual(null)
      }
    }
  }, [cancionActual, barId])

  const onPlayerReady = (event: YouTubeEvent) => {
    playerRef.current = event.target
    setPlayer(event.target)
    event.target.setVolume(volumen)
    event.target.playVideo()
  }

  const onPlayerError = useCallback(async () => {
    if (cancionActual) {
      try {
        await eliminarCancion(cancionActual.id)
      } catch (e) {
        console.error('Error eliminando canción:', e)
      }
      setCancionActual(null)
      
      setTimeout(async () => {
        const colaActualizada = await obtenerCola(barId)
        setCola(colaActualizada)
        
        const colaAprobada = colaActualizada.filter(c => c.estado === 'aprobada')
        if (colaAprobada.length > 0) {
          const siguiente = colaAprobada[0]
          await actualizarEstadoCancion(siguiente.id, 'reproduciendo')
          setCancionActual(siguiente)
          setCola(colaActualizada.map(c => c.id === siguiente.id ? {...c, estado: 'reproduciendo'} : c))
        }
      }, 500)
    }
  }, [cancionActual, barId])

  const togglePause = () => {
    if (player) {
      if (pausado) player.playVideo()
      else player.pauseVideo()
      setPausado(!pausado)
    }
  }

  const skipSong = async () => {
    if (cancionActual) {
      await eliminarCancion(cancionActual.id)
      setCancionActual(null)
      const colaData = await obtenerCola(barId)
      setCola(colaData)
    }
  }

  // ============= BÚSQUEDA YOUTUBE - SOLO CANCIONES =============
  const buscarVideos = async () => {
    if (!busqueda.trim()) return
    setBuscando(true)
    try {
      // Búsqueda con exclusiones fuertes para karaokes y contenido no deseado
      const exclusiones = [
        '-karaoke',
        '-karaokes',
        '-"sing along"',
        '-"letra lyrics"',
        '-"letra y lyrics"',
        '-"con letra"',
        '-"lyrics video"',
        '-"lyric video"',
        '-"letra oficial"',
        '-instrumental',
        '-"backing track"',
        '-"sin voz"',
        '-"no vocals"',
        '-mix',
        '-"full album"',
        '-playlist',
        '-podcast',
        '-entrevista',
        '-tutorial',
        '-cover',
        '-tributo',
        '-parodia',
        '-parody'
      ].join(' ')
      
      const busquedaSimple = `${busqueda} ${exclusiones}`
      
      // Buscar videos en YouTube (solo categoría música)
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(busquedaSimple)}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`)
      const data = await res.json()
      
      if (data.items?.length > 0) {
        // Obtener detalles de duración
        const videoIds = data.items.map((v: any) => v.id.videoId).join(',')
        const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`)
        const detailsData = await detailsRes.json()
        
        // Procesar videos
        const videosProcesados = data.items
          .map((v: any) => {
            const detail = detailsData.items?.find((d: any) => d.id === v.id.videoId)
            if (!detail) return null
            
            // Calcular duración
            const match = detail.contentDetails?.duration?.match(/PT(\d+H)?(\d+M)?(\d+S)?/) || []
            const h = parseInt((match[1] || '0H').replace('H', '')) || 0
            const m = parseInt((match[2] || '0M').replace('M', '')) || 0
            const s = parseInt((match[3] || '0S').replace('S', '')) || 0
            const duracionMinutos = h * 60 + m + s / 60
            
            const titulo = v.snippet.title || ''
            const canal = v.snippet.channelTitle || ''
            const tituloLower = titulo.toLowerCase()
            
            // Filtrar karaokes y otros contenidos no deseados en el título
            const palabrasProhibidas = [
              'karaoke', 'karaokes', 'sing along', 'letra lyrics', 'letra y lyrics',
              'con letra', 'instrumental', 'backing track', 'sin voz', 'no vocals',
              'full album', 'complete album', 'playlist', 'mix completo',
              'podcast', 'entrevista', 'tutorial', 'cover by', 'tribute to',
              'parodia', 'parody', 'react', 'reaction'
            ]
            const tienePalabraProhibida = palabrasProhibidas.some(p => tituloLower.includes(p))
            
            // Separar artista y canción del título
            let artista = canal
            let cancion = titulo
            
            // Intentar separar artista - canción
            const separadores = [' - ', ' – ', ' — ', ' | ', ': ']
            for (const sep of separadores) {
              if (titulo.includes(sep)) {
                const partes = titulo.split(sep)
                if (partes.length >= 2) {
                  artista = partes[0].trim()
                  cancion = partes.slice(1).join(sep).trim()
                  break
                }
              }
            }
            
            return {
              ...v,
              snippet: {
                ...v.snippet,
                title: titulo,
                channelTitle: canal
              },
              duracionFormateada: h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m}:${s.toString().padStart(2,'0')}`,
              duracionMinutos,
              artista,
              cancion,
              tienePalabraProhibida
            }
          })
          .filter((v: any) => {
            if (!v) return false
            // Filtrar palabras prohibidas
            if (v.tienePalabraProhibida) return false
            // Filtrar videos muy largos (más de 12 min)
            if (v.duracionMinutos > 12) return false
            // Filtrar videos muy cortos (menos de 1.5 min)
            if (v.duracionMinutos < 1.5) return false
            return true
          })
          .slice(0, 15)
        
        setVideosBusqueda(videosProcesados)
        
        if (videosProcesados.length === 0) {
          alert('No se encontraron canciones. Intenta con otro término.')
        }
      } else {
        setVideosBusqueda([])
        alert('No se encontraron resultados.')
      }
    } catch (e) { 
      console.error('Error en búsqueda:', e)
      setVideosBusqueda([]) 
    }
    setBuscando(false)
  }

  // ============= AGREGAR CANCIÓN (USANDO PISCINA DEL BAR) =============
  const agregarACola = async (video: VideoBusqueda) => {
    if (!bar) return
    const creditosPiscina = bar.creditos_disponibles || 0
    if (creditosPiscina < 1) { alert('❌ Sin créditos en la piscina. Pide al admin.'); return }
    
    const nombreParaMostrar = nombreCliente.trim() || 'Anónimo'
    
    try {
      await agregarCancion({ 
        bar_id: bar.id, 
        video_id: video.id.videoId, 
        titulo: video.snippet.title, 
        thumbnail: video.snippet.thumbnails.default.url, 
        canal: video.snippet.channelTitle, 
        estado: 'aprobada', 
        costo_creditos: 1, 
        precio_venta: PRECIO_VENTA_CREDITO, 
        solicitado_por: nombreParaMostrar, 
        posicion: cola.length 
      })
      
      const nuevosCreditos = creditosPiscina - 1
      await supabase.from('bares').update({ creditos_disponibles: nuevosCreditos }).eq('id', bar.id)
      await supabase.from('transacciones').insert([{ 
        bar_id: bar.id, 
        tipo: 'consumo', 
        cantidad: 1, 
        precio_unitario: PRECIO_VENTA_CREDITO, 
        total: PRECIO_VENTA_CREDITO, 
        cancion_titulo: video.snippet.title, 
        cliente_nombre: nombreParaMostrar,
        descripcion: `🎵 ${video.snippet.title}` 
      }])
      
      setBar({ ...bar, creditos_disponibles: nuevosCreditos })
      alert(`✅ "${video.snippet.title.substring(0, 25)}..." agregada por ${nombreParaMostrar}!\nCréditos restantes: ${nuevosCreditos}`)
    } catch { alert('❌ Error al agregar') }
  }

  // ============= CREAR BAR =============
  const handleCrearBar = async () => {
    if (!nuevoBarNombre.trim()) { alert('❌ Ingresa el nombre'); return }
    setCreandoBar(true)
    try {
      const nuevoBar = await crearBar(nuevoBarNombre.trim(), nuevoBarWhatsApp.trim() || undefined, nuevoBarCorreo.trim() || undefined, nuevoBarClave.trim() || '1234')
      setNuevoBarCreado({ bar: nuevoBar, claveAdmin: nuevoBarClave.trim() || '1234' })
      setNuevoBarNombre(''); setNuevoBarWhatsApp(''); setNuevoBarCorreo(''); setNuevoBarClave('')
      const baresData = await obtenerTodosLosBares()
      setBares(baresData)
    } catch (error: any) { alert('❌ Error: ' + error.message) }
    setCreandoBar(false)
  }

  // ============= EXPORTAR EXCEL =============
  const exportarExcel = (data: any[], filename: string) => {
    if (!data.length) { alert('No hay datos'); return }
    const headers = Object.keys(data[0])
    // Usar punto y coma como separador para evitar conflictos con comas de números
    const csv = [headers.join(';'), ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(';'))].join('\n')
    // Agregar BOM para que Excel reconozca UTF-8
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()
  }

  const generarReporteVentas = () => {
    let transFiltradas = todasTransacciones.filter(t => t.tipo === 'compra_software')
    const ahora = new Date()
    if (filtroPeriodo === 'hoy') transFiltradas = transFiltradas.filter(t => new Date(t.creado_en).toDateString() === ahora.toDateString())
    else if (filtroPeriodo === 'semana') transFiltradas = transFiltradas.filter(t => new Date(t.creado_en) >= new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000))
    else if (filtroPeriodo === 'mes') transFiltradas = transFiltradas.filter(t => new Date(t.creado_en) >= new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000))
    if (filtroBar !== 'todos') transFiltradas = transFiltradas.filter(t => t.bar_id === filtroBar)
    
    const reporte = transFiltradas.map(t => {
      const bar = bares.find(b => b.id === t.bar_id)
      // Precio fijo de venta: 40 colones por crédito
      const precioUnitario = PRECIO_COMPRA_CREDITO
      const total = t.cantidad * precioUnitario
      return { 
        Fecha: new Date(t.creado_en).toLocaleDateString('es-CR'), 
        Bar: bar?.nombre || 'N/A', 
        Créditos: t.cantidad, 
        'Precio Unit.': `${precioUnitario} colones`, 
        Total: `${total} colones` 
      }
    })
    exportarExcel(reporte, `reporte_ventas_${filtroPeriodo}`)
  }

  const generarReporteBar = () => {
    const reporte = transacciones.map(t => ({
      Fecha: new Date(t.creado_en).toLocaleDateString('es-CR'), Tipo: t.tipo, Cantidad: t.cantidad, 'Precio Unit.': formatColones(t.precio_unitario), Total: formatColones(t.total), Cliente: t.cliente_nombre || '-', Canción: t.cancion_titulo || '-'
    }))
    exportarExcel(reporte, `reporte_${bar?.nombre?.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`)
  }

  // ============= URLS =============
  const getUrlCliente = (id?: string) => `${currentUrl}?bar=${id || barId}&modo=cliente`
  const getUrlAdmin = (id?: string) => `${currentUrl}?bar=${id || barId}&modo=admin`
  const getUrlTV = (id?: string) => `${currentUrl}?bar=${id || barId}`
  const copiarUrl = (url: string) => { navigator.clipboard.writeText(url); alert('✅ Copiado!') }

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`

  // ============= PANTALLAS CARGA/ERROR =============
  // Esperar a que el componente esté montado para leer la URL correctamente
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🎵</div>
          <p className="text-white text-2xl font-bold">Cargando Rockola...</p>
          <p className="text-yellow-400 text-sm mt-2">Montando componente...</p>
          <Branding />
        </div>
      </div>
    )
  }

  // DEBUG: Mostrar modo actual
  console.log('🎵 DEBUG - modo:', modo, 'barId:', barId, 'modoUrl:', modoUrl, 'barIdUrl:', barIdUrl)

  if (cargando && modo !== 'tv') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🎵</div>
          <p className="text-white text-2xl font-bold">Cargando Rockola...</p>
          <Branding />
        </div>
      </div>
    )
  }

  if (error && modo !== 'tv') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
          <WifiOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">😢 Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-xl">🔄 Reintentar</button>
          <Branding />
        </div>
      </div>
    )
  }

  // ================================================================
  // MODO TV
  // ================================================================
  if (modo === 'tv') {
    if (!tvActivado) {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
          {/* DEBUG INFO */}
          <div className="absolute top-4 left-4 bg-black/80 text-white p-2 rounded text-xs">
            <p>🔧 V1.0.1 - DEBUG: modo={modo} | barId={barId || 'sin bar'}</p>
            <p>URL params: modoUrl={modoUrl} | barIdUrl={barIdUrl || 'vacío'}</p>
          </div>
          <div className="text-center p-8">
            <div className="mb-8">
              <Music className="w-32 h-32 text-yellow-400 mx-auto mb-6 animate-bounce" />
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 mb-4">
                🎵 ROCKOLA 🎵
              </h1>
              <p className="text-white/80 text-2xl mb-2">{bar?.nombre || 'Cargando...'}</p>
              <p className="text-gray-400 text-lg mb-8">Sistema de Música Interactiva</p>
            </div>
            
            <button
              onClick={() => {
                setTvActivado(true)
                // Guardar en localStorage con fecha (válido por 24 horas)
                localStorage.setItem('rockola_tv_activado', JSON.stringify({ 
                  activado: true, 
                  fecha: new Date().toISOString() 
                }))
                // Intentar reproducir la primera canción si hay
                if (cola.filter(c => c.estado === 'aprobada').length > 0) {
                  reproducirSiguiente(cola)
                }
              }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-3xl py-6 px-16 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-4 mx-auto"
            >
              <Play className="w-12 h-12" />
              🎬 ACTIVAR PANTALLA TV
            </button>
            
            <p className="text-gray-500 text-sm mt-6">Presiona este botón una vez al inicio del día</p>
            
            <div className={`mt-8 flex items-center justify-center gap-2 ${conectado ? 'text-green-400' : 'text-red-400'}`}>
              {conectado ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              <span className="text-sm">{conectado ? 'Conectado' : 'Sin conexión'}</span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950 via-black to-blue-950 overflow-hidden flex flex-col">
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
          {conectado ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Wifi className="w-4 h-4 text-green-400" />
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <WifiOff className="w-4 h-4 text-red-400" />
            </>
          )}
        </div>

        <div className="flex-shrink-0 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500">🎵🎶 ROCKOLA 🎶🎵</h1>
              <p className="text-white/80 text-lg">{bar?.nombre || 'Conectando...'}</p>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl px-4 py-2">
              <p className="text-black/70 text-xs">🎵 CRÉDITOS</p>
              <p className="text-black text-3xl font-black">{bar?.creditos_disponibles || 0}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          {cancionActual ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <YouTube videoId={cancionActual.video_id} opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, showinfo: 0, iv_load_policy: 3, disablekb: 1, fs: 0, playsinline: 1, origin: typeof window !== 'undefined' ? window.location.origin : '' } }} onReady={onPlayerReady} onEnd={onVideoEnd} onError={onPlayerError} className="w-full h-full" iframeClassName="w-full h-full absolute inset-0" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pointer-events-none">
                <p className="text-white text-xl font-bold truncate">🎵 {cancionActual.titulo}</p>
                <p className="text-yellow-400">👤 {cancionActual.solicitado_por}</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <div className="text-6xl animate-bounce mb-4">🎵🎶🎵</div>
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 mb-2">🎵 ROCKOLA 🎵</h2>
              <p className="text-white/60 text-xl mb-4">{bar?.nombre || ''}</p>
              <div className="bg-gradient-to-r from-purple-800/50 to-pink-800/50 rounded-2xl p-4 mb-4 border border-purple-400/30 max-w-md">
                <p className="text-yellow-400 font-bold">🎉 ¿Quieres una Rockola?</p>
                <p className="text-white/80 text-sm">Sistema de música para tu negocio</p>
                <p className="text-pink-300 text-sm">📱 WhatsApp: +506 6449-8045</p>
              </div>
              <p className="text-purple-300 animate-pulse">🎧 Esperando canciones...</p>
              <p className="text-gray-500 text-sm mt-2">Cola: {cola.filter(c => c.estado === 'aprobada').length} canciones</p>
            </div>
          )}
        </div>
        <Branding />
      </div>
    )
  }

  // ================================================================
  // MODO CLIENTE - SOLO NOMBRE PARA MOTIVACIÓN
  // ================================================================
  if (modo === 'cliente') {
    // Pedir nombre antes de usar
    if (!clienteActivo) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-pink-500/30 text-center">
            <div className="text-5xl mb-4">🎵🎶🎵</div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 mb-2">🎵 ROCKOLA 🎵</h2>
            <p className="text-pink-300 text-xl mb-4">{bar?.nombre}</p>
            
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-4 my-6">
              <p className="text-black/70 text-sm">💰 PRECIO POR CANCIÓN</p>
              <p className="text-black text-4xl font-black">{formatColones(PRECIO_VENTA_CREDITO)}</p>
            </div>
            
            <p className="text-white/80 mb-4 text-sm">¿Cómo te llamas? (aparecerá en la pantalla)</p>
            
            <input
              type="text"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nombreCliente.trim()) {
                  localStorage.setItem('rockola_nombre', nombreCliente.trim())
                  setClienteActivo(true)
                }
              }}
              placeholder="Tu nombre..."
              className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white text-center text-lg mb-4 focus:ring-2 focus:ring-pink-500 focus:outline-none"
              autoFocus
            />
            
            <button
              onClick={() => {
                if (nombreCliente.trim()) {
                  localStorage.setItem('rockola_nombre', nombreCliente.trim())
                  setClienteActivo(true)
                } else {
                  alert('❌ Ingresa tu nombre')
                }
              }}
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-black font-black py-4 rounded-2xl text-2xl flex items-center justify-center gap-2"
            >
              <Play className="w-8 h-8" /> ¡ENTRAR!
            </button>
            <Branding />
          </div>
        </div>
      )
    }

    // PANTALLA PRINCIPAL DEL CLIENTE
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex flex-col">
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-3 sticky top-0 z-10 flex-shrink-0">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black">🎵 Hola, {nombreCliente}!</h1>
              <p className="text-sm opacity-80">{bar?.nombre}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-yellow-400 text-black px-3 py-1 rounded-full font-black">💰 {bar?.creditos_disponibles || 0}</div>
              <button 
                onClick={() => { setClienteActivo(false); localStorage.removeItem('rockola_nombre') }} 
                className="bg-black/20 p-2 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 max-w-2xl mx-auto p-4 space-y-4 w-full overflow-auto">
          {/* Créditos de la piscina */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 text-center">
            <p className="text-black/70 text-sm">💰 CRÉDITOS DISPONIBLES</p>
            <p className="text-black text-5xl font-black">{bar?.creditos_disponibles || 0}</p>
            <p className="text-black/70 text-sm">1 crédito = {formatColones(PRECIO_VENTA_CREDITO)}</p>
            <p className="text-black/50 text-xs mt-2">Pide créditos al administrador</p>
          </div>
          
          {/* Buscador */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/30">
            <h3 className="font-bold mb-3">🔍 Buscar Música</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={busqueda} 
                onChange={(e) => setBusqueda(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && buscarVideos()} 
                placeholder="Artista o canción..." 
                className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-pink-500 focus:outline-none" 
              />
              <button 
                onClick={buscarVideos} 
                disabled={buscando} 
                className="bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 rounded-lg font-bold"
              >
                {buscando ? '⏳' : '🔍'}
              </button>
            </div>
            
            {videosBusqueda.length > 0 && (
              <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
                {videosBusqueda.map((v, i) => (
                  <div 
                    key={v.id.videoId} 
                    onClick={() => agregarACola(v)}
                    className="bg-gray-700/50 hover:bg-purple-700/50 p-2 rounded-lg cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-pink-400 font-bold">{i + 1}</span>
                    <img src={v.snippet.thumbnails.default.url} alt="" className="w-10 h-8 rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{v.snippet.title}</p>
                      <p className="text-xs text-gray-400">{v.duracionFormateada}</p>
                    </div>
                    <span className="bg-green-500 px-2 py-1 rounded text-xs font-bold">🎵 Agregar</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Cola de canciones */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-pink-500/30">
            <h3 className="font-bold mb-2">🎵 Cola de Canciones</h3>
            {cancionActual && (
              <div className="bg-green-600 p-2 rounded-lg mb-2 flex items-center gap-2">
                <Play className="w-4 h-4 animate-pulse" />
                <p className="text-sm truncate">{cancionActual.titulo}</p>
              </div>
            )}
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {cola.filter(c => c.estado === 'aprobada').map((c, i) => (
                <div key={c.id} className="bg-gray-700/50 p-1 rounded flex items-center gap-2">
                  <span className="text-pink-400 text-xs">{i + 1}</span>
                  <img src={c.thumbnail} alt="" className="w-6 h-6 rounded" />
                  <p className="text-xs truncate flex-1">{c.titulo}</p>
                  {c.solicitado_por === nombreCliente && <span className="text-yellow-400 text-xs">⭐</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <Branding />
      </div>
    )
  }

  // ================================================================
  // MODO ADMIN BAR
  // ================================================================
  if (modo === 'admin') {
    if (!isAuthed) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">👑 ADMIN BAR</h2>
            <input type="password" value={claveInput} onChange={(e) => setClaveInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (claveInput === CLAVE_ADMIN ? setIsAuthed(true) : claveInput === CLAVE_SUPER_ADMIN ? (setIsAuthed(true), setModo('superadmin')) : alert('❌ Incorrecto'))} placeholder="🔐 Clave" className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-xl mb-4 focus:border-yellow-500 focus:outline-none" />
            <button onClick={() => claveInput === CLAVE_ADMIN ? setIsAuthed(true) : claveInput === CLAVE_SUPER_ADMIN ? (setIsAuthed(true), setModo('superadmin')) : alert('❌ Incorrecto')} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-4 rounded-xl">ENTRAR</button>
            <Branding />
          </div>
        </div>
      )
    }

    const totalCompras = transacciones.filter(t => t.tipo === 'compra_software').reduce((s, t) => s + t.total, 0)
    const totalVentas = transacciones.filter(t => t.tipo === 'venta_cliente').reduce((s, t) => s + t.total, 0)
    const totalConsumo = transacciones.filter(t => t.tipo === 'consumo').reduce((s, t) => s + t.cantidad, 0)
    const utilidadCalculada = (transacciones.filter(t => t.tipo === 'venta_cliente').reduce((s, t) => s + t.cantidad, 0)) * UTILIDAD_CREDITO

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-gray-900 text-white flex flex-col">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 sticky top-0 z-10 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6" />
              <div>
                <h1 className="text-2xl font-black text-black">{bar?.nombre?.toUpperCase()}</h1>
                <p className="text-xs text-black/70">👑 Panel de Administración</p>
              </div>
            </div>
            <button onClick={() => { setIsAuthed(false); setClaveInput('') }} className="bg-black/20 px-3 py-1 rounded-lg text-sm">Salir</button>
          </div>
        </div>

        <div className="flex-1 max-w-4xl mx-auto p-4 space-y-4 w-full overflow-auto">
          {/* Control de Reproducción */}
          {cancionActual && (
            <div className="bg-gradient-to-r from-purple-800/50 to-pink-800/50 rounded-xl p-4 border border-purple-500/30">
              <h3 className="font-bold mb-3 text-lg">🎵 Reproduciendo Ahora</h3>
              <div className="flex items-center gap-3 mb-3">
                <img src={cancionActual.thumbnail} alt="" className="w-16 h-12 rounded" />
                <div className="flex-1">
                  <p className="font-bold truncate">{cancionActual.titulo}</p>
                  <p className="text-xs text-gray-400">👤 {cancionActual.solicitado_por}</p>
                </div>
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{formatTime(tiempoTranscurrido)}</span>
                  <span>{formatTime(duracionTotal)}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${duracionTotal > 0 ? (tiempoTranscurrido / duracionTotal) * 100 : 0}%` }}></div>
                </div>
              </div>
              
              <div className="flex gap-2 justify-center">
                <button onClick={togglePause} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                  {pausado ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />} {pausado ? 'Play' : 'Pausar'}
                </button>
                <button onClick={skipSong} className="bg-pink-600 hover:bg-pink-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                  <SkipForward className="w-5 h-5" /> Adelantar
                </button>
                <button onClick={async () => { 
                  if (confirm('¿Eliminar esta canción?')) {
                    await eliminarCancion(cancionActual.id)
                    setCancionActual(null)
                  }
                }} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                  <TrashIcon className="w-5 h-5" /> Eliminar
                </button>
              </div>
            </div>
          )}

          {/* Créditos de la Piscina */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 text-center">
            <p className="text-black/70 text-sm">💰 CRÉDITOS EN LA PISCINA</p>
            <p className="text-black text-5xl font-black">{bar?.creditos_disponibles || 0}</p>
            <p className="text-black/70 text-sm">Disponibles para clientes</p>
          </div>

          {/* Resumen financiero */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-800/50 rounded-lg p-3 text-center">
              <p className="text-green-300 text-xs">COMPRAS</p>
              <p className="text-xl font-bold">{formatColones(totalCompras)}</p>
            </div>
            <div className="bg-yellow-800/50 rounded-lg p-3 text-center">
              <p className="text-yellow-300 text-xs">VENTAS</p>
              <p className="text-xl font-bold">{formatColones(totalVentas)}</p>
            </div>
            <div className="bg-pink-800/50 rounded-lg p-3 text-center">
              <p className="text-pink-300 text-xs">UTILIDAD</p>
              <p className="text-xl font-bold">{formatColones(utilidadCalculada)}</p>
            </div>
          </div>

          {/* Cola */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/30">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">🎵 Cola de Canciones ({cola.filter(c => c.estado === 'aprobada').length})</h3>
              <button onClick={generarReporteBar} className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3" /> Exportar
              </button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {cola.filter(c => c.estado === 'aprobada').map((c, i) => (
                <div key={c.id} className="bg-gray-700/50 p-2 rounded flex items-center gap-2">
                  <span className="text-pink-400 font-bold">{i + 1}</span>
                  <img src={c.thumbnail} alt="" className="w-10 h-8 rounded" />
                  <div className="flex-1">
                    <p className="text-sm truncate">{c.titulo}</p>
                    <p className="text-xs text-gray-400">👤 {c.solicitado_por}</p>
                  </div>
                  <button onClick={async () => { await eliminarCancion(c.id) }} className="text-red-400 hover:text-red-300">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {cola.filter(c => c.estado === 'aprobada').length === 0 && (
                <p className="text-gray-400 text-center py-4">No hay canciones en cola</p>
              )}
            </div>
          </div>

          {/* URLs */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-green-500/30">
            <h3 className="font-bold mb-3">🔗 Links de tu Rockola</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-sm w-16">TV:</span>
                <input readOnly value={getUrlTV()} className="flex-1 bg-gray-700 rounded px-2 py-1 text-xs" />
                <button onClick={() => copiarUrl(getUrlTV())} className="text-green-400"><Copy className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-pink-400 text-sm w-16">Cliente:</span>
                <input readOnly value={getUrlCliente()} className="flex-1 bg-gray-700 rounded px-2 py-1 text-xs" />
                <button onClick={() => copiarUrl(getUrlCliente())} className="text-pink-400"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
        <Branding />
      </div>
    )
  }

  // ================================================================
  // MODO SUPER ADMIN
  // ================================================================
  if (modo === 'superadmin') {
    // DEBUG INFO
    console.log('👑 SUPER ADMIN - modo:', modo, 'barId:', barId)
    
    if (!isAuthed) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 flex items-center justify-center p-4">
          {/* DEBUG INFO */}
          <div className="absolute top-4 left-4 bg-black/80 text-white p-2 rounded text-xs">
            <p>🔧 V1.0.1 - SUPER ADMIN LOGIN</p>
            <p>modo={modo} | barId={barId || 'sin bar'}</p>
          </div>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
            <Crown className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">👑 SUPER ADMIN</h2>
            <input type="password" value={claveInput} onChange={(e) => setClaveInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (claveInput === CLAVE_SUPER_ADMIN ? setIsAuthed(true) : alert('❌ Incorrecto'))} placeholder="🔐 Clave Maestra" className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-xl mb-4 focus:border-purple-500 focus:outline-none" />
            <button onClick={() => claveInput === CLAVE_SUPER_ADMIN ? setIsAuthed(true) : alert('❌ Incorrecto')} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-xl">ENTRAR</button>
            <Branding />
          </div>
        </div>
      )
    }

    const totalVentas = todasTransacciones.filter(t => t.tipo === 'compra_software').reduce((s, t) => s + t.total, 0)
    const totalCreditos = todasTransacciones.filter(t => t.tipo === 'compra_software').reduce((s, t) => s + t.cantidad, 0)

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 sticky top-0 z-10 flex-shrink-0">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-black">👑 SUPER ADMIN</h1>
                <p className="text-xs opacity-80">Panel de Control Global</p>
              </div>
            </div>
            <button onClick={() => { setIsAuthed(false); setClaveInput('') }} className="bg-black/20 px-3 py-1 rounded-lg text-sm">Salir</button>
          </div>
        </div>

        <div className="flex-1 max-w-6xl mx-auto p-4 space-y-4 w-full overflow-auto">
          {/* Resumen Global */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-4 text-center">
              <p className="text-purple-200 text-sm">BARES ACTIVOS</p>
              <p className="text-4xl font-black">{bares.filter(b => b.activo).length}</p>
            </div>
            <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-4 text-center">
              <p className="text-green-200 text-sm">CRÉDITOS VENDIDOS</p>
              <p className="text-4xl font-black">{totalCreditos}</p>
            </div>
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl p-4 text-center">
              <p className="text-yellow-200 text-sm">INGRESOS TOTALES</p>
              <p className="text-4xl font-black">{formatColones(totalVentas)}</p>
            </div>
          </div>

          {/* Crear nuevo bar */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/30">
            <h3 className="font-bold mb-3">➕ Crear Nuevo Bar</h3>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Nombre del bar" value={nuevoBarNombre} onChange={(e) => setNuevoBarNombre(e.target.value)} className="bg-gray-700 rounded-lg px-3 py-2" />
              <input placeholder="WhatsApp (opcional)" value={nuevoBarWhatsApp} onChange={(e) => setNuevoBarWhatsApp(e.target.value)} className="bg-gray-700 rounded-lg px-3 py-2" />
              <input placeholder="Correo (opcional)" value={nuevoBarCorreo} onChange={(e) => setNuevoBarCorreo(e.target.value)} className="bg-gray-700 rounded-lg px-3 py-2" />
              <input placeholder="Clave admin (default: 1234)" value={nuevoBarClave} onChange={(e) => setNuevoBarClave(e.target.value)} className="bg-gray-700 rounded-lg px-3 py-2" />
            </div>
            <button onClick={handleCrearBar} disabled={creandoBar} className="mt-3 w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-2 rounded-lg">
              {creandoBar ? '⏳ Creando...' : '➕ CREAR BAR'}
            </button>
          </div>

          {/* Nuevo bar creado */}
          {nuevoBarCreado && (
            <div className="bg-green-800/50 rounded-xl p-4 border border-green-500/50">
              <h3 className="font-bold text-green-400 mb-2">✅ Bar Creado: {nuevoBarCreado.bar.nombre}</h3>
              <p className="text-sm mb-2">Clave Admin: <strong>{nuevoBarCreado.claveAdmin}</strong></p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">TV:</span>
                  <input readOnly value={getUrlTV(nuevoBarCreado.bar.id)} className="flex-1 bg-gray-700 rounded px-2 py-1 text-xs" />
                  <button onClick={() => copiarUrl(getUrlTV(nuevoBarCreado.bar.id))} className="text-green-400"><Copy className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-pink-400">Cliente:</span>
                  <input readOnly value={getUrlCliente(nuevoBarCreado.bar.id)} className="flex-1 bg-gray-700 rounded px-2 py-1 text-xs" />
                  <button onClick={() => copiarUrl(getUrlCliente(nuevoBarCreado.bar.id))} className="text-pink-400"><Copy className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">Admin:</span>
                  <input readOnly value={getUrlAdmin(nuevoBarCreado.bar.id)} className="flex-1 bg-gray-700 rounded px-2 py-1 text-xs" />
                  <button onClick={() => copiarUrl(getUrlAdmin(nuevoBarCreado.bar.id))} className="text-yellow-400"><Copy className="w-4 h-4" /></button>
                </div>
              </div>
              <button onClick={() => setNuevoBarCreado(null)} className="mt-2 text-sm text-gray-400">Cerrar</button>
            </div>
          )}

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value as any)} className="bg-gray-700 rounded-lg px-3 py-2">
              <option value="hoy">Hoy</option>
              <option value="semana">Esta Semana</option>
              <option value="mes">Este Mes</option>
              <option value="todo">Todo</option>
            </select>
            <select value={filtroBar} onChange={(e) => setFiltroBar(e.target.value)} className="bg-gray-700 rounded-lg px-3 py-2">
              <option value="todos">Todos los bares</option>
              {bares.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
            <button onClick={generarReporteVentas} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
              <Download className="w-4 h-4" /> Exportar
            </button>
          </div>

          {/* Lista de bares */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/30">
            <h3 className="font-bold mb-3">📋 Lista de Bares ({bares.length})</h3>
            <div className="space-y-3">
              {bares.map((b) => {
                // Filtrar transacciones de este bar
                const historialBar = todasTransacciones.filter(t => t.bar_id === b.id && t.tipo === 'compra_software')
                const filtroActual = filtroHistorialBar[b.id] || 'mes'
                const ahora = new Date()
                let historialFiltrado = historialBar
                if (filtroActual === 'hoy') historialFiltrado = historialBar.filter(t => new Date(t.creado_en).toDateString() === ahora.toDateString())
                else if (filtroActual === 'semana') historialFiltrado = historialBar.filter(t => new Date(t.creado_en) >= new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000))
                else if (filtroActual === 'mes') historialFiltrado = historialBar.filter(t => new Date(t.creado_en) >= new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000))
                
                const totalCreditosBar = historialFiltrado.reduce((s, t) => s + t.cantidad, 0)
                const totalMontoBar = totalCreditosBar * PRECIO_COMPRA_CREDITO
                
                return (
                <div key={b.id} className={`bg-gray-700/50 rounded-lg overflow-hidden ${!b.activo ? 'opacity-50' : ''}`}>
                  {/* Fila principal del bar */}
                  <div className="p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="font-bold text-lg">{b.nombre}</p>
                        <p className="text-xs text-gray-400">💰 Créditos: {b.creditos_disponibles} | 📱 {b.whatsapp || 'Sin WhatsApp'}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <button onClick={() => setBarExpandido(barExpandido === b.id ? null : b.id)} className="text-purple-400 text-xs bg-purple-900/50 px-2 py-1 rounded">
                          {barExpandido === b.id ? '▲ Ocultar' : '▼ Historial'}
                        </button>
                        <button onClick={async () => { await actualizarEstadoBar(b.id, !b.activo); const baresData = await obtenerTodosLosBares(); setBares(baresData) }} className={b.activo ? 'text-red-400' : 'text-green-400'}>
                          <Power className="w-4 h-4" />
                        </button>
                        <button onClick={() => setBarParaEliminar(b)} className="text-red-400"><TrashIcon className="w-4 h-4" /></button>
                      </div>
                    </div>
                    
                    {/* Links del bar */}
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <button onClick={() => copiarUrl(getUrlTV(b.id))} className="bg-green-900/50 hover:bg-green-800/50 text-green-300 px-2 py-1 rounded flex items-center justify-center gap-1">
                        <Copy className="w-3 h-3" /> TV
                      </button>
                      <button onClick={() => copiarUrl(getUrlCliente(b.id))} className="bg-pink-900/50 hover:bg-pink-800/50 text-pink-300 px-2 py-1 rounded flex items-center justify-center gap-1">
                        <Copy className="w-3 h-3" /> Cliente
                      </button>
                      <button onClick={() => copiarUrl(getUrlAdmin(b.id))} className="bg-yellow-900/50 hover:bg-yellow-800/50 text-yellow-300 px-2 py-1 rounded flex items-center justify-center gap-1">
                        <Copy className="w-3 h-3" /> Admin
                      </button>
                    </div>
                  </div>
                  
                  {/* Historial expandido */}
                  {barExpandido === b.id && (
                    <div className="border-t border-gray-600 p-3 bg-gray-800/50">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-sm text-purple-300">📊 Historial de Compras</h4>
                        <select 
                          value={filtroActual} 
                          onChange={(e) => setFiltroHistorialBar({...filtroHistorialBar, [b.id]: e.target.value as any})}
                          className="bg-gray-700 rounded px-2 py-1 text-xs"
                        >
                          <option value="hoy">Hoy</option>
                          <option value="semana">Semana</option>
                          <option value="mes">Mes</option>
                          <option value="todo">Todo</option>
                        </select>
                      </div>
                      
                      {/* Resumen */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="bg-green-900/30 rounded p-2 text-center">
                          <p className="text-xs text-green-300">Créditos Comprados</p>
                          <p className="text-lg font-bold text-green-400">{totalCreditosBar}</p>
                        </div>
                        <div className="bg-yellow-900/30 rounded p-2 text-center">
                          <p className="text-xs text-yellow-300">Total Pagado</p>
                          <p className="text-lg font-bold text-yellow-400">₡{totalMontoBar}</p>
                        </div>
                      </div>
                      
                      {/* Lista de transacciones */}
                      {historialFiltrado.length > 0 ? (
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {historialFiltrado.slice(0, 10).map((t) => (
                            <div key={t.id} className="bg-gray-700/50 rounded px-2 py-1 flex justify-between text-xs">
                              <span className="text-gray-300">{new Date(t.creado_en).toLocaleDateString('es-CR')}</span>
                              <span className="text-green-400 font-bold">+{t.cantidad} créditos</span>
                              <span className="text-yellow-400">₡{t.cantidad * PRECIO_COMPRA_CREDITO}</span>
                            </div>
                          ))}
                          {historialFiltrado.length > 10 && (
                            <p className="text-xs text-gray-500 text-center">...y {historialFiltrado.length - 10} más</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 text-center py-2">Sin compras en este período</p>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>

          {/* Modal eliminar */}
          {barParaEliminar && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
                <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ ¿Eliminar {barParaEliminar.nombre}?</h3>
                <p className="text-gray-400 mb-4">Esta acción no se puede deshacer. Se eliminarán todas las transacciones y canciones.</p>
                <div className="flex gap-2">
                  <button onClick={() => setBarParaEliminar(null)} className="flex-1 bg-gray-600 py-2 rounded-lg">Cancelar</button>
                  <button onClick={async () => { await eliminarBar(barParaEliminar.id); const baresData = await obtenerTodosLosBares(); setBares(baresData); setBarParaEliminar(null) }} className="flex-1 bg-red-600 py-2 rounded-lg font-bold">ELIMINAR</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <Branding />
      </div>
    )
  }

  return null
}

// Export with Suspense wrapper for useSearchParams
export default function RockolaSaaS() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RockolaContent />
    </Suspense>
  )
}
