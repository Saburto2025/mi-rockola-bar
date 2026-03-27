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
  
  const [modo, setModo] = useState('tv')
  const [urlProcessed, setUrlProcessed] = useState(false)
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

  // ============= SINCRONIZAR MODO CON URL PARAMS =============
  useEffect(() => {
    if (modoUrl && modoUrl !== modo) {
      console.log('🔄 Sincronizando modo:', modo, '->', modoUrl)
      setModo(modoUrl)
    }
    setUrlProcessed(true)
  }, [modoUrl, modo])

  // ============= INICIALIZACIÓN =============
  useEffect(() => {
    if (typeof window === 'undefined') return
    setMounted(true)
    
    if (!supabaseConfigured) {
      setError('⚠️ Supabase no está configurado. Ve a Render → Environment y agrega las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
      setCargando(false)
      return
    }
    
    setCurrentUrl(window.location.origin)
    
    const nombreGuardado = localStorage.getItem('rockola_nombre')
    if (nombreGuardado) {
      setNombreCliente(nombreGuardado)
      setClienteActivo(true)
    }
    
    const tvActivadoData = localStorage.getItem('rockola_tv_activado')
    if (tvActivadoData) {
      try {
        const { activado, fecha } = JSON.parse(tvActivadoData)
        const fechaGuardada = new Date(fecha)
        const ahora = new Date()
        const horasPasadas = (ahora.getTime() - fechaGuardada.getTime()) / (1000 * 60 * 60)
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
        
        if (!supabaseConfigured || !supabase) {
          setError('⚠️ Supabase no está configurado. Ve a Render → Environment y agrega:\n• NEXT_PUBLIC_SUPABASE_URL\n• NEXT_PUBLIC_SUPABASE_ANON_KEY\n• NEXT_PUBLIC_YOUTUBE_API_KEY')
          setCargando(false)
          return
        }
        
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

  useEffect(() => {
    if (modo !== 'tv' || !tvActivado) return
    if (cancionActual) return
    if (isTransitioningRef.current) return
    
    const colaAprobada = cola.filter(c => c.estado === 'aprobada')
    if (colaAprobada.length > 0) {
      console.log('🎵 Reproducción automática: detectada canción pendiente')
      reproducirSiguiente(cola)
    }
  }, [modo, tvActivado, cancionActual, cola, reproducirSiguiente])

  // ============= SELF-PING PARA MANTENER RENDER ACTIVO =============
  useEffect(() => {
    if (modo !== 'tv' || !tvActivado) return
    
    fetch('/api/ping').then(() => console.log('🏓 Ping inicial enviado'))
    
    const pingInterval = setInterval(() => {
      fetch('/api/ping')
        .then(() => console.log('🏓 Self-ping enviado - Manteniendo servicio activo'))
        .catch((e) => console.log('🏓 Error en self-ping:', e))
    }, 10 * 60 * 1000)
    
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


  // ============= BÚSQUEDA YOUTUBE - SOLO MÚSICA OFICIAL =============
  const buscarVideos = async () => {
    if (!busqueda.trim()) return
    setBuscando(true)
    try {
      const exclusiones = [
        '-karaoke', '-karaokes', '-"sing along"', '-"letra lyrics"', '-"letra y lyrics"',
        '-"con letra"', '-"lyrics video"', '-"lyric video"', '-instrumental',
        '-"backing track"', '-"sin voz"', '-"no vocals"',
        '-entrevista', '-interview', '-"programa de tv"', '-"show de tv"',
        '-television', '-"en vivo"', '-"live show"', '-"talk show"',
        '-"late night"', '-"jimmy fallon"', '-"jimmy kimmel"',
        '-"ellen show"', '-"today show"', '-"good morning"',
        '-"the voice"', '-"american idol"', '-"x factor"',
        '-presentacion', '-"live performance"', '-"live at"',
        '-concierto', '-concert', '-tour', '-gira',
        '-cover', '-covers', '-tribute', '-tributo', '-parodia', '-parody',
        '-remix', '-"version cumbia"', '-"version salsa"', '-"version bachata"',
        '-acoustic', '-acustico', '-unplugged', '-"en acustico"',
        '-mix', '-"full album"', '-playlist', '-podcast', '-tutorial',
        '-react', '-reaction', '-fanmade', '-"fan made"', '-mashup',
        '-xxx', '-porn', '-porno', '-onlyfans', '-only fans',
        '-sexy', '-hot', '-bikini', '-modelo', '-model',
        '-bailando', '-dance', '-baile', '-striptease',
        '-comercial', '-commercial', '-anuncio', '-ad',
        '-trailer', '- teaser', '-spot'
      ].join(' ')
      
      const busquedaOficial = `${busqueda} "official music video" ${exclusiones}`
      const busquedaGeneral = `${busqueda} music ${exclusiones}`
      
      let res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=30&q=${encodeURIComponent(busquedaOficial)}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`)
      let data = await res.json()
      
      if (!data.items || data.items.length < 10) {
        res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=30&q=${encodeURIComponent(busquedaGeneral)}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`)
        data = await res.json()
      }
      
      if (data.items?.length > 0) {
        const videoIds = data.items.map((v: any) => v.id.videoId).join(',')
        const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`)
        const detailsData = await detailsRes.json()
        
        const palabrasProhibidasTitulo = [
          'karaoke', 'karaokes', 'sing along', 'letra lyrics', 'letra y lyrics',
          'con letra', 'instrumental', 'backing track', 'sin voz', 'no vocals',
          'entrevista', 'interview', 'programa', 'show de', 'television',
          'en vivo', 'live at', 'live from', 'concierto', 'concert',
          'presentacion', 'performance live', 'tour', 'gira',
          'jimmy fallon', 'jimmy kimmel', 'ellen', 'today show',
          'good morning', 'the voice', 'american idol', 'x factor',
          'late night', 'tonight show', 'telemundo', 'univision',
          'despierta america', 'hoy dia', 'primer impacto',
          'cover by', 'cover de', 'tribute to', 'tributo a',
          'parodia', 'parody', 'acoustic version', 'version acustica',
          'unplugged', 'en acustico', 'remix by', 'version cumbia',
          'full album', 'complete album', 'playlist', 'mix completo',
          'podcast', 'tutorial', 'react', 'reaction', 'mashup',
          'comercial', 'commercial', 'anuncio', 'trailer', 'teaser',
          'fanmade', 'fan made', 'bootleg',
          'xxx', 'porn', 'porno', 'onlyfans', 'sexy', 'hot video',
          'bikini', 'modelo', 'bailando sexy', 'dance sexy',
          'striptease', 'lap dance', 'twerk',
          'descargar', 'download', 'descarga', 'mp3', 'free download'
        ]
        
        const canalesProhibidos = [
          'karaoke', 'sing along', 'lyric', 'letra', 'cover',
          'tribute', 'parodia', 'fan', 'acoustic', 'remix',
          'tv show', 'television', 'entrevista', 'interview',
          'live', 'concert', 'tour', 'xxx', 'porn', 'sexy',
          'bikini', 'model', 'dance', 'onlyfans'
        ]
        
        const canalesOficiales = [
          'vevo', 'official', 'oficial', 'records', 'music',
          'warner', 'sony', 'universal', 'emi', 'capitol',
          'columbia', 'atlantic', 'interscope', 'def jam',
          'rca', 'island', 'republic', 'big machine',
          'bmw', 'latin', 'latinus', 'tv', 'televisa',
          'univision', 'telemundo', 'fonsi', 'yhlqmdlg'
        ]
        
        const videosProcesados = data.items
          .map((v: any) => {
            const detail = detailsData.items?.find((d: any) => d.id === v.id.videoId)
            if (!detail) return null
            
            const match = detail.contentDetails?.duration?.match(/PT(\d+H)?(\d+M)?(\d+S)?/) || []
            const h = parseInt((match[1] || '0H').replace('H', '')) || 0
            const m = parseInt((match[2] || '0M').replace('M', '')) || 0
            const s = parseInt((match[3] || '0S').replace('S', '')) || 0
            const duracionMinutos = h * 60 + m + s / 60
            
            const titulo = v.snippet.title || ''
            const canal = v.snippet.channelTitle || ''
            const tituloLower = titulo.toLowerCase()
            const canalLower = canal.toLowerCase()
            const vistas = parseInt(detail.statistics?.viewCount || '0')
            
            const tienePalabraProhibida = palabrasProhibidasTitulo.some(p => tituloLower.includes(p))
            const esCanalProhibido = canalesProhibidos.some(c => canalLower.includes(c))
            const esCanalOficial = canalesOficiales.some(c => canalLower.includes(c))
            
            const esVideoOficial = 
              tituloLower.includes('official') ||
              tituloLower.includes('oficial') ||
              tituloLower.includes('music video') ||
              tituloLower.includes('video oficial') ||
              tituloLower.includes('vevo')
            
            let puntuacion = 0
            if (esCanalOficial) puntuacion += 100
            if (esVideoOficial) puntuacion += 50
            if (vistas > 10000000) puntuacion += 30
            else if (vistas > 1000000) puntuacion += 20
            else if (vistas > 100000) puntuacion += 10
            
            let artista = canal
            let cancion = titulo
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
              snippet: { ...v.snippet, title: titulo, channelTitle: canal },
              duracionFormateada: h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m}:${s.toString().padStart(2,'0')}`,
              duracionMinutos, artista, cancion,
              tienePalabraProhibida, esCanalOficial, esCanalProhibido,
              esVideoOficial, puntuacion, vistas
            }
          })
          .filter((v: any) => {
            if (!v) return false
            if (v.tienePalabraProhibida) return false
            if (v.esCanalProhibido && !v.esCanalOficial) return false
            if (v.duracionMinutos > 10) return false
            if (v.duracionMinutos < 1.5) return false
            return true
          })
          .sort((a: any, b: any) => b.puntuacion - a.puntuacion)
          .slice(0, 20)
        
        setVideosBusqueda(videosProcesados)
        
        if (videosProcesados.length === 0) {
          alert('No se encontraron canciones oficiales. Intenta con otro término o el nombre del artista.')
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



  // ============= AGREGAR CANCIÓN =============
  const agregarACola = async (video: VideoBusqueda) => {
    if (!bar) return
    const creditosPiscina = bar.creditos_disponibles || 0
    if (creditosPiscina < 1) { alert('❌ Sin créditos en la piscina. Pide al admin.'); return }
    
    const nombreParaMostrar = nombreCliente.trim() || 'Anónimo'
    
    try {
      await agregarCancion({ 
        bar_id: bar.id, video_id: video.id.videoId, titulo: video.snippet.title, 
        thumbnail: video.snippet.thumbnails.default.url, canal: video.snippet.channelTitle, 
        estado: 'aprobada', costo_creditos: 1, precio_venta: PRECIO_VENTA_CREDITO, 
        solicitado_por: nombreParaMostrar, posicion: cola.length 
      })
      
      const nuevosCreditos = creditosPiscina - 1
      await supabase.from('bares').update({ creditos_disponibles: nuevosCreditos }).eq('id', bar.id)
      await supabase.from('transacciones').insert([{ 
        bar_id: bar.id, tipo: 'consumo', cantidad: 1, 
        precio_unitario: PRECIO_VENTA_CREDITO, total: PRECIO_VENTA_CREDITO, 
        cancion_titulo: video.snippet.title, cliente_nombre: nombreParaMostrar,
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
    const csv = [headers.join(';'), ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(';'))].join('\n')
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
      const precioUnitario = PRECIO_COMPRA_CREDITO
      const total = t.cantidad * precioUnitario
      return { 
        Fecha: new Date(t.creado_en).toLocaleDateString('es-CR'), 
        Bar: bar?.nombre || 'N/A', Créditos: t.cantidad, 
        'Precio Unit.': `${precioUnitario} colones`, Total: `${total} colones` 
      }
    })
    exportarExcel(reporte, `reporte_ventas_${filtroPeriodo}`)
  }

  const generarReporteBar = () => {
    const reporte = transacciones.map(t => ({
      Fecha: new Date(t.creado_en).toLocaleDateString('es-CR'), Tipo: t.tipo, 
      Cantidad: t.cantidad, 'Precio Unit.': formatColones(t.precio_unitario), 
      Total: formatColones(t.total), Cliente: t.cliente_nombre || '-', Canción: t.cancion_titulo || '-'
    }))
    exportarExcel(reporte, `reporte_${bar?.nombre?.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`)
  }

  // ============= URLS =============
  const getUrlCliente = (id?: string) => `${currentUrl}?bar=${id || barId}&modo=cliente`
  const getUrlAdmin = (id?: string) => `${currentUrl}?bar=${id || barId}&modo=admin`
  const getUrlTV = (id?: string) => `${currentUrl}?bar=${id || barId}`
  const copiarUrl = (url: string) => { navigator.clipboard.writeText(url); alert('✅ Copiado!') }

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}


  // ============= PANTALLAS CARGA/ERROR =============
  if (!mounted || !urlProcessed) {
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
                localStorage.setItem('rockola_tv_activado', JSON.stringify({ activado: true, fecha: new Date().toISOString() }))
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
            <><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><Wifi className="w-4 h-4 text-green-400" /></>
          ) : (
            <><div className="w-2 h-2 bg-red-500 rounded-full"></div><WifiOff className="w-4 h-4 text-red-400" /></>
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
  // MODO CLIENTE
  // ================================================================
  if (modo === 'cliente') {
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
                } else { alert('❌ Ingresa tu nombre') }
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
              <p className="text-white/80 text-sm">{bar?.nombre}</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-1">
              <p className="text-xs">💳 Créditos</p>
              <p className="text-2xl font-black text-center">{bar?.creditos_disponibles || 0}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 max-w-2xl mx-auto w-full overflow-y-auto">
          {/* Buscador */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') buscarVideos() }}
                placeholder="🔍 Buscar canción o artista..."
                className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              <button
                onClick={buscarVideos}
                disabled={buscando}
                className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {buscando ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Resultados */}
          {videosBusqueda.length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className="text-lg font-bold text-green-400">🎵 Resultados ({videosBusqueda.length})</h3>
              {videosBusqueda.map((video) => (
                <div key={video.id.videoId} className="bg-gray-800/50 rounded-xl p-3 flex gap-3 items-center border border-gray-700 hover:border-green-500 transition-colors">
                  <img src={video.snippet.thumbnails.default.url} alt="" className="w-16 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-sm">{video.snippet.title}</p>
                    <p className="text-gray-400 text-xs truncate">{video.snippet.channelTitle}</p>
                    {video.duracionFormateada && (
                      <p className="text-gray-500 text-xs">⏱️ {video.duracionFormateada}</p>
                    )}
                  </div>
                  <button
                    onClick={() => agregarACola(video)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 rounded-lg hover:scale-110 transition-transform flex-shrink-0"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Cola actual */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">🎵 Cola de canciones ({cola.filter(c => c.estado === 'aprobada').length})</h3>
            {cola.filter(c => c.estado === 'aprobada').length === 0 ? (
              <p className="text-gray-400 text-center py-4">No hay canciones en cola</p>
            ) : (
              <div className="space-y-2">
                {cola.filter(c => c.estado === 'aprobada').map((cancion, idx) => (
                  <div key={cancion.id} className="bg-gray-800/50 rounded-xl p-3 flex gap-3 items-center">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center font-bold text-black">
                      {idx + 1}
                    </div>
                    <img src={cancion.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-sm">{cancion.titulo}</p>
                      <p className="text-gray-400 text-xs">👤 {cancion.solicitado_por}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cambiar nombre */}
          <button
            onClick={() => { setClienteActivo(false); setNombreCliente(''); localStorage.removeItem('rockola_nombre'); }}
            className="w-full bg-gray-700 text-white py-3 rounded-xl font-bold hover:bg-gray-600 transition-colors"
          >
            👤 Cambiar nombre
          </button>
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
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-pink-500/30 text-center">
            <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white mb-2">🔐 Admin: {bar?.nombre}</h2>
            <p className="text-gray-400 mb-6">Ingresa la clave de administrador</p>
            
            <input
              type="password"
              value={claveInput}
              onChange={(e) => setClaveInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && claveInput === (bar?.clave_admin || CLAVE_ADMIN)) setIsAuthed(true) }}
              placeholder="Clave..."
              className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white text-center text-lg mb-4 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              autoFocus
            />
            
            <button
              onClick={() => {
                if (claveInput === (bar?.clave_admin || CLAVE_ADMIN)) setIsAuthed(true)
                else alert('❌ Clave incorrecta')
              }}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black py-4 rounded-2xl text-xl"
            >
              🔓 ENTRAR
            </button>
            <Branding />
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex flex-col">
        <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-3 sticky top-0 z-10 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black">👑 Admin: {bar?.nombre}</h1>
              <p className="text-white/80 text-sm">Panel de administración</p>
            </div>
            <div className="flex gap-2">
              <div className="bg-white/20 rounded-xl px-3 py-1">
                <p className="text-xs">💳 Créditos</p>
                <p className="text-xl font-black text-center">{bar?.creditos_disponibles || 0}</p>
              </div>
              <button onClick={() => setIsAuthed(false)} className="bg-red-500 p-2 rounded-xl hover:bg-red-600">
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 max-w-4xl mx-auto w-full overflow-y-auto">
          {/* Comprar créditos al proveedor */}
          <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-2xl p-4 mb-4 border border-green-500/30">
            <h3 className="text-lg font-bold text-green-400 mb-3">💰 Comprar Créditos al Proveedor</h3>
            <p className="text-gray-400 text-sm mb-2">Precio por crédito: {formatColones(PRECIO_COMPRA_CREDITO)}</p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Cantidad..."
                className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                id="cantidadCreditos"
              />
              <button
                onClick={async () => {
                  const cantidad = parseInt((document.getElementById('cantidadCreditos') as HTMLInputElement)?.value || '0')
                  if (cantidad < 10) { alert('❌ Mínimo 10 créditos'); return }
                  try {
                    await comprarCreditosProveedor(barId, cantidad)
                    const barData = await obtenerBar(barId)
                    setBar(barData)
                    ;(document.getElementById('cantidadCreditos') as HTMLInputElement).value = ''
                    alert(`✅ ${cantidad} créditos comprados!\nTotal: ${formatColones(cantidad * PRECIO_COMPRA_CREDITO)}`)
                  } catch { alert('❌ Error al comprar') }
                }}
                className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 rounded-xl font-bold"
              >
                Comprar
              </button>
            </div>
          </div>

          {/* Links del bar */}
          <div className="bg-gray-800/50 rounded-2xl p-4 mb-4 border border-gray-700">
            <h3 className="text-lg font-bold text-purple-400 mb-3">🔗 Links de tu Bar</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16">Cliente:</span>
                <input readOnly value={getUrlCliente()} className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white truncate" />
                <button onClick={() => copiarUrl(getUrlCliente())} className="bg-purple-500 p-2 rounded-lg hover:bg-purple-600"><Copy className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16">TV:</span>
                <input readOnly value={getUrlTV()} className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white truncate" />
                <button onClick={() => copiarUrl(getUrlTV())} className="bg-purple-500 p-2 rounded-lg hover:bg-purple-600"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* Cola de canciones */}
          <div className="bg-gray-800/50 rounded-2xl p-4 mb-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-yellow-400">🎵 Cola de Canciones</h3>
              <button
                onClick={async () => {
                  if (confirm('¿Vaciar toda la cola?')) {
                    for (const c of cola) { await eliminarCancion(c.id) }
                    setCola([])
                  }
                }}
                className="bg-red-500 px-3 py-1 rounded-lg text-sm hover:bg-red-600"
              >
                Vaciar cola
              </button>
            </div>
            {cola.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No hay canciones en cola</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cola.map((cancion) => (
                  <div key={cancion.id} className={`rounded-xl p-3 flex gap-3 items-center ${cancion.estado === 'reproduciendo' ? 'bg-green-900/50 border border-green-500' : 'bg-gray-700/50'}`}>
                    <img src={cancion.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-sm">{cancion.titulo}</p>
                      <p className="text-gray-400 text-xs">👤 {cancion.solicitado_por} • {cancion.estado}</p>
                    </div>
                    {cancion.estado === 'reproduciendo' && (
                      <div className="flex gap-2">
                        <button onClick={togglePause} className="bg-yellow-500 p-2 rounded-lg hover:bg-yellow-600">
                          {pausado ? <Play className="w-4 h-4 text-black" /> : <Pause className="w-4 h-4 text-black" />}
                        </button>
                        <button onClick={skipSong} className="bg-red-500 p-2 rounded-lg hover:bg-red-600">
                          <SkipForward className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {cancion.estado !== 'reproduciendo' && (
                      <button onClick={async () => { await eliminarCancion(cancion.id); setCola(await obtenerCola(barId)) }} className="bg-red-500 p-2 rounded-lg hover:bg-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de transacciones */}
          <div className="bg-gray-800/50 rounded-2xl p-4 mb-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-blue-400">📊 Historial</h3>
              <button onClick={generarReporteBar} className="bg-blue-500 px-3 py-1 rounded-lg text-sm hover:bg-blue-600 flex items-center gap-1">
                <Download className="w-4 h-4" /> Excel
              </button>
            </div>
            {transacciones.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No hay transacciones</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {transacciones.slice(-10).reverse().map((t) => (
                  <div key={t.id} className="bg-gray-700/50 rounded-lg p-2 flex justify-between items-center">
                    <div>
                      <p className="text-sm">{t.descripcion || t.tipo}</p>
                      <p className="text-xs text-gray-400">{new Date(t.creado_en).toLocaleDateString('es-CR')}</p>
                    </div>
                    <span className={t.tipo === 'compra_software' ? 'text-green-400' : 'text-red-400'}>
                      {t.tipo === 'compra_software' ? '+' : '-'}{formatColones(t.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
    if (!isAuthed) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-red-500/30 text-center">
            <Crown className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white mb-2">👑 SUPER ADMIN</h2>
            <p className="text-gray-400 mb-6">Acceso exclusivo del proveedor</p>
            
            <input
              type="password"
              value={claveInput}
              onChange={(e) => setClaveInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && claveInput === CLAVE_SUPER_ADMIN) setIsAuthed(true) }}
              placeholder="Clave secreta..."
              className="w-full bg-gray-700 rounded-xl px-4 py-3 text-white text-center text-lg mb-4 focus:ring-2 focus:ring-red-500 focus:outline-none"
              autoFocus
            />
            
            <button
              onClick={() => {
                if (claveInput === CLAVE_SUPER_ADMIN) setIsAuthed(true)
                else alert('❌ Clave incorrecta')
              }}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-black py-4 rounded-2xl text-xl"
            >
              🔓 ENTRAR
            </button>
            <Branding />
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 text-white flex flex-col">
        <div className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 p-3 sticky top-0 z-10 flex-shrink-0">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black">👑 SUPER ADMIN <span className="text-xs bg-green-500 px-2 py-0.5 rounded-full">V1.0.6</span></h1>
              <p className="text-white/80 text-sm">Panel de Control Principal</p>
            </div>
            <div className="flex gap-2 items-center">
              <div className="bg-white/20 rounded-xl px-3 py-1">
                <p className="text-xs">🏢 Bares</p>
                <p className="text-xl font-black text-center">{bares.length}</p>
              </div>
              <button onClick={() => setIsAuthed(false)} className="bg-red-500 p-2 rounded-xl hover:bg-red-600">
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>


        <div className="flex-1 p-4 max-w-6xl mx-auto w-full overflow-y-auto">
          {/* Crear nuevo bar */}
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-4 mb-4 border border-purple-500/30">
            <h3 className="text-lg font-bold text-purple-400 mb-3">➕ Crear Nuevo Bar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={nuevoBarNombre}
                onChange={(e) => setNuevoBarNombre(e.target.value)}
                placeholder="Nombre del bar..."
                className="bg-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <input
                type="text"
                value={nuevoBarWhatsApp}
                onChange={(e) => setNuevoBarWhatsApp(e.target.value)}
                placeholder="WhatsApp (opcional)..."
                className="bg-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <input
                type="email"
                value={nuevoBarCorreo}
                onChange={(e) => setNuevoBarCorreo(e.target.value)}
                placeholder="Correo (opcional)..."
                className="bg-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <input
                type="text"
                value={nuevoBarClave}
                onChange={(e) => setNuevoBarClave(e.target.value)}
                placeholder="Clave admin (default: 1234)..."
                className="bg-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleCrearBar}
              disabled={creandoBar}
              className="mt-3 w-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {creandoBar ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : '🏢 Crear Bar'}
            </button>
          </div>

          {/* Bar creado exitosamente */}
          {nuevoBarCreado && (
            <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-2xl p-4 mb-4 border border-green-500">
              <h3 className="text-lg font-bold text-green-400 mb-3">✅ Bar Creado Exitosamente!</h3>
              <p className="text-white mb-2"><strong>{nuevoBarCreado.bar.nombre}</strong></p>
              <p className="text-gray-400 text-sm mb-3">Clave admin: <strong className="text-yellow-400">{nuevoBarCreado.claveAdmin}</strong></p>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-20">Cliente:</span>
                  <input readOnly value={getUrlCliente(nuevoBarCreado.bar.id)} className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white truncate" />
                  <button onClick={() => copiarUrl(getUrlCliente(nuevoBarCreado.bar.id))} className="bg-green-500 p-2 rounded-lg"><Copy className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-20">Admin:</span>
                  <input readOnly value={getUrlAdmin(nuevoBarCreado.bar.id)} className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white truncate" />
                  <button onClick={() => copiarUrl(getUrlAdmin(nuevoBarCreado.bar.id))} className="bg-green-500 p-2 rounded-lg"><Copy className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-20">TV:</span>
                  <input readOnly value={getUrlTV(nuevoBarCreado.bar.id)} className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white truncate" />
                  <button onClick={() => copiarUrl(getUrlTV(nuevoBarCreado.bar.id))} className="bg-green-500 p-2 rounded-lg"><Copy className="w-4 h-4" /></button>
                </div>
              </div>
              <button onClick={() => setNuevoBarCreado(null)} className="w-full bg-gray-600 py-2 rounded-xl text-sm">Cerrar</button>
            </div>
          )}

          {/* Vender paquetes de créditos */}
          <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-2xl p-4 mb-4 border border-yellow-500/30">
            <h3 className="text-lg font-bold text-yellow-400 mb-3">💰 Vender Paquetes de Créditos</h3>
            <p className="text-gray-400 text-sm mb-3">Precio por crédito: {formatColones(PRECIO_COMPRA_CREDITO)} | Venta sugerida: {formatColones(PRECIO_VENTA_CREDITO)}</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { creditos: 50, precio: 2000 },
                { creditos: 100, precio: 4000 },
                { creditos: 200, precio: 8000 },
                { creditos: 500, precio: 20000 },
                { creditos: 1000, precio: 40000 }
              ].map((paquete) => (
                <button
                  key={paquete.creditos}
                  onClick={async () => {
                    if (!barExpandido) { alert('❌ Selecciona un bar primero'); return }
                    try {
                      const barActual = bares.find(b => b.id === barExpandido)
                      if (!barActual) return
                      await supabase.from('bares').update({ 
                        creditos_disponibles: (barActual.creditos_disponibles || 0) + paquete.creditos 
                      }).eq('id', barExpandido)
                      await supabase.from('transacciones').insert([{
                        bar_id: barExpandido, tipo: 'compra_software',
                        cantidad: paquete.creditos, precio_unitario: PRECIO_COMPRA_CREDITO,
                        total: paquete.precio, descripcion: `💰 Paquete ${paquete.creditos} créditos`
                      }])
                      const baresData = await obtenerTodosLosBares()
                      setBares(baresData)
                      const transData = await obtenerTodasTransacciones()
                      setTodasTransacciones(transData)
                      alert(`✅ ${paquete.creditos} créditos vendidos a ${barActual.nombre}!\nTotal: ${formatColones(paquete.precio)}`)
                    } catch { alert('❌ Error') }
                  }}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 p-3 rounded-xl hover:scale-105 transition-transform"
                >
                  <p className="text-2xl font-black">{paquete.creditos}</p>
                  <p className="text-xs">créditos</p>
                  <p className="text-sm font-bold mt-1">{formatColones(paquete.precio)}</p>
                </button>
              ))}
            </div>
          </div>


          {/* Lista de bares */}
          <div className="bg-gray-800/50 rounded-2xl p-4 mb-4 border border-gray-700">
            <h3 className="text-lg font-bold text-blue-400 mb-3">🏢 Lista de Bares ({bares.length})</h3>
            {bares.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No hay bares creados</p>
            ) : (
              <div className="space-y-2">
                {bares.map((b) => (
                  <div key={b.id} className="bg-gray-700/50 rounded-xl overflow-hidden">
                    <div 
                      className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-600/50"
                      onClick={() => setBarExpandido(barExpandido === b.id ? null : b.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${b.activo !== false ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <p className="font-bold">{b.nombre}</p>
                          <p className="text-gray-400 text-xs">Creado: {new Date(b.creado_en).toLocaleDateString('es-CR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-yellow-500/20 rounded-lg px-3 py-1">
                          <p className="text-xs text-yellow-400">💳 Créditos</p>
                          <p className="text-xl font-black text-center">{b.creditos_disponibles || 0}</p>
                        </div>
                      </div>
                    </div>
                    
                    {barExpandido === b.id && (
                      <div className="p-3 border-t border-gray-600 bg-gray-800/50">
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-20">Cliente:</span>
                            <input readOnly value={getUrlCliente(b.id)} className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white truncate" />
                            <button onClick={() => copiarUrl(getUrlCliente(b.id))} className="bg-blue-500 p-2 rounded-lg"><Copy className="w-4 h-4" /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-20">Admin:</span>
                            <input readOnly value={getUrlAdmin(b.id)} className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white truncate" />
                            <button onClick={() => copiarUrl(getUrlAdmin(b.id))} className="bg-blue-500 p-2 rounded-lg"><Copy className="w-4 h-4" /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-20">TV:</span>
                            <input readOnly value={getUrlTV(b.id)} className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white truncate" />
                            <button onClick={() => copiarUrl(getUrlTV(b.id))} className="bg-blue-500 p-2 rounded-lg"><Copy className="w-4 h-4" /></button>
                          </div>
                        </div>
                        {b.whatsapp && <p className="text-gray-400 text-sm">📱 WhatsApp: {b.whatsapp}</p>}
                        {b.correo && <p className="text-gray-400 text-sm">📧 Correo: {b.correo}</p>}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={async () => {
                              await actualizarEstadoBar(b.id, !b.activo)
                              setBares(await obtenerTodosLosBares())
                            }}
                            className={`flex-1 py-2 rounded-lg font-bold ${b.activo !== false ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                          >
                            {b.activo !== false ? '⏸️ Desactivar' : '▶️ Activar'}
                          </button>
                          <button
                            onClick={() => setBarParaEliminar(b)}
                            className="bg-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-800"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Reporte de ventas */}
          <div className="bg-gray-800/50 rounded-2xl p-4 mb-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-green-400">📊 Reporte de Ventas</h3>
              <button onClick={generarReporteVentas} className="bg-green-500 px-3 py-1 rounded-lg text-sm hover:bg-green-600 flex items-center gap-1">
                <Download className="w-4 h-4" /> Excel
              </button>
            </div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <button onClick={() => setFiltroPeriodo('hoy')} className={`px-3 py-1 rounded-lg text-sm ${filtroPeriodo === 'hoy' ? 'bg-green-500' : 'bg-gray-600'}`}>Hoy</button>
              <button onClick={() => setFiltroPeriodo('semana')} className={`px-3 py-1 rounded-lg text-sm ${filtroPeriodo === 'semana' ? 'bg-green-500' : 'bg-gray-600'}`}>Semana</button>
              <button onClick={() => setFiltroPeriodo('mes')} className={`px-3 py-1 rounded-lg text-sm ${filtroPeriodo === 'mes' ? 'bg-green-500' : 'bg-gray-600'}`}>Mes</button>
              <button onClick={() => setFiltroPeriodo('todo')} className={`px-3 py-1 rounded-lg text-sm ${filtroPeriodo === 'todo' ? 'bg-green-500' : 'bg-gray-600'}`}>Todo</button>
            </div>
            
            {/* Resumen */}
            {(() => {
              let transFiltradas = todasTransacciones.filter(t => t.tipo === 'compra_software')
              const ahora = new Date()
              if (filtroPeriodo === 'hoy') transFiltradas = transFiltradas.filter(t => new Date(t.creado_en).toDateString() === ahora.toDateString())
              else if (filtroPeriodo === 'semana') transFiltradas = transFiltradas.filter(t => new Date(t.creado_en) >= new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000))
              else if (filtroPeriodo === 'mes') transFiltradas = transFiltradas.filter(t => new Date(t.creado_en) >= new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000))
              
              const totalCreditos = transFiltradas.reduce((sum, t) => sum + t.cantidad, 0)
              const totalVentas = transFiltradas.reduce((sum, t) => sum + (t.cantidad * PRECIO_COMPRA_CREDITO), 0)
              
              return (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-900/30 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-xs">Transacciones</p>
                    <p className="text-2xl font-black text-green-400">{transFiltradas.length}</p>
                  </div>
                  <div className="bg-yellow-900/30 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-xs">Créditos</p>
                    <p className="text-2xl font-black text-yellow-400">{totalCreditos}</p>
                  </div>
                  <div className="bg-blue-900/30 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-xs">Total</p>
                    <p className="text-2xl font-black text-blue-400">{formatColones(totalVentas)}</p>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
        <Branding />
      </div>
    )
  }

  // Modo no reconocido
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4">❌ Modo no reconocido</h2>
        <p className="text-gray-600 mb-4">Modo: {modo}</p>
        <button onClick={() => window.location.href = '/'} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-xl">🏠 Ir al inicio</button>
        <Branding />
      </div>
    </div>
  )
}

// Modal para confirmar eliminación de bar
const ModalEliminarBar = ({ bar, onConfirm, onCancel }: { bar: Bar | null, onConfirm: () => void, onCancel: () => void }) => {
  if (!bar) return null
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border-2 border-red-500">
        <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ ¿Eliminar bar?</h3>
        <p className="text-white mb-2">Estás a punto de eliminar:</p>
        <p className="text-yellow-400 font-bold text-lg mb-4">{bar.nombre}</p>
        <p className="text-gray-400 text-sm mb-6">Esta acción no se puede deshacer. Se eliminarán todos los datos asociados.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-gray-600 py-3 rounded-xl font-bold hover:bg-gray-500">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 py-3 rounded-xl font-bold hover:bg-red-600">Eliminar</button>
        </div>
      </div>
    </div>
  )
}

// Wrapper con Suspense
export default function Home() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RockolaContent />
      <ModalEliminarBar 
        bar={barParaEliminar}
        onConfirm={async () => {
          if (barParaEliminar) {
            await eliminarBar(barParaEliminar.id)
            setBares(await obtenerTodosLosBares())
            setBarParaEliminar(null)
          }
        }}
        onCancel={() => setBarParaEliminar(null)}
      />
    </Suspense>
  )
}


