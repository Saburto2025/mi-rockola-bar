'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

// ============================================
// MERKA 4.0 - Rockola SaaS - V1.0.6
// Busqueda de musica oficial mejorada
// ============================================

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration?: string;
  viewCount?: string;
}

interface Song {
  id: number;
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration?: string;
  viewCount?: string;
  requesterName?: string;
  requesterTable?: string;
  status: 'pending' | 'playing' | 'played';
  addedAt: Date;
}

interface Session {
  id: string;
  venueCode: string;
  createdAt: Date;
  credits: number;
  songs: Song[];
  currentSongIndex: number;
}

export default function Home() {
  const [step, setStep] = useState<'venue' | 'name' | 'credits' | 'search' | 'queue'>('venue');
  const [venueCode, setVenueCode] = useState('');
  const [venueName, setVenueName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [credits, setCredits] = useState(0);
  const [creditsCost, setCreditsCost] = useState(1);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Video[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<Song | null>(null);
  const [nextSongs, setNextSongs] = useState<Song[]>([]);
  
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerError, setPlayerError] = useState('');
  
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [selectedPackage, setSelectedPackage] = useState<{credits: number, price: number, name: string} | null>(null);
  
  const playerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const creditPackages = [
    { credits: 50, price: 5000, name: 'Basico' },
    { credits: 100, price: 9000, name: 'Popular' },
    { credits: 200, price: 16000, name: 'Fiesteros' },
    { credits: 500, price: 35000, name: 'VIP' },
    { credits: 1000, price: 60000, name: 'Empresarial' },
  ];
















  const verifyVenueCode = async () => {
    if (venueCode.length < 3) {
      alert('El codigo debe tener al menos 3 caracteres');
      return;
    }

    try {
      const response = await fetch('/api/venue/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: venueCode.toUpperCase() })
      });

      const data = await response.json();

      if (data.valid) {
        setVenueName(data.venueName || 'Venue');
        setCreditsCost(data.creditsCost || 1);
        setStep('name');
      } else {
        alert('Codigo de venue no valido. Verifica con el establecimiento.');
      }
    } catch (error) {
      console.error('Error verifying venue:', error);
      setVenueName('Rockola Demo');
      setCreditsCost(1);
      setStep('name');
    }
  };

  const startSession = () => {
    if (!customerName.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }

    const sessionId = `${venueCode}-${Date.now()}`;
    const newSession: Session = {
      id: sessionId,
      venueCode: venueCode.toUpperCase(),
      createdAt: new Date(),
      credits: credits,
      songs: [],
      currentSongIndex: 0
    };

    setSession(newSession);
    setStep('credits');
  };

  const processPayment = async () => {
    if (!selectedPackage) return;

    setPaymentStatus('processing');

    try {
      const response = await fetch('/api/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session?.id,
          amount: selectedPackage.price,
          credits: selectedPackage.credits,
          customerName,
          tableNumber
        })
      });

      const data = await response.json();

      if (data.success) {
        setCredits(prev => prev + selectedPackage.credits);
        setPaymentStatus('success');
        setTimeout(() => {
          setStep('search');
        }, 1500);
      } else {
        throw new Error(data.error || 'Error en el pago');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setCredits(prev => prev + selectedPackage.credits);
      setPaymentStatus('success');
      setTimeout(() => {
        setStep('search');
      }, 1500);
    }
  };

  const formatViewCount = (count: string): string => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return count;
  };














































  const searchVideos = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const enhancedQuery = `${query} oficial -karaoke -cover -tribute -remix`;
      
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(enhancedQuery)}&type=video&maxResults=20&videoEmbeddable=true&videoCategoryId=10&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
      );

      const data = await response.json();

      if (data.error) {
        console.error('YouTube API error:', data.error);
        setSearchError('Error al buscar videos. Intenta de nuevo.');
        setSearchResults([]);
        return;
      }

      if (data.items && data.items.length > 0) {
        const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
        
        const detailsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
        );
        const detailsData = await detailsResponse.json();
        
        const detailsMap: { [key: string]: any } = {};
        if (detailsData.items) {
          detailsData.items.forEach((item: any) => {
            detailsMap[item.id] = item;
          });
        }

        const processedResults: Video[] = data.items
          .map((item: any) => {
            const details = detailsMap[item.id.videoId];
            let duration = '0:00';
            let viewCount = '0';
            
            if (details) {
              const durationMatch = details.contentDetails?.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              if (durationMatch) {
                const hours = parseInt(durationMatch[1] || '0');
                const mins = parseInt(durationMatch[2] || '0');
                const secs = parseInt(durationMatch[3] || '0');
                
                if (hours > 0) {
                  duration = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                } else {
                  duration = `${mins}:${secs.toString().padStart(2, '0')}`;
                }
              }
              
              viewCount = details.statistics?.viewCount || '0';
            }
            
            return {
              id: item.id.videoId,
              title: item.snippet.title,
              thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
              channelTitle: item.snippet.channelTitle,
              duration,
              viewCount: formatViewCount(viewCount)
            };
          })
          .filter((video: Video) => {
            const titleLower = video.title.toLowerCase();
            const channelLower = video.channelTitle.toLowerCase();
            
            const excludedTerms = [
              'karaoke', 'cover', 'tribute', 'remix', 'mashup',
              'parody', 'parodia', 'instrumental', 'backing track',
              'no copyright', 'ncs', 'copyright free', 'royalty free',
              'porn', 'xxx', 'adult', 'sex', 'nude', 'naked',
              'sexto', 'pornografia', 'erotic', '18+'
            ];
            
            const hasExcludedTerm = excludedTerms.some(term => 
              titleLower.includes(term) || channelLower.includes(term)
            );
            
            if (hasExcludedTerm) {
              return false;
            }
            
            const durationParts = video.duration?.split(':') || ['0', '00'];
            let durationMinutes = 0;
            if (durationParts.length === 3) {
              durationMinutes = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
            } else if (durationParts.length === 2) {
              durationMinutes = parseInt(durationParts[0]);
            }
            
            if (durationMinutes > 10) {
              return false;
            }
            
            return true;
          })
          .slice(0, 12);

        setSearchResults(processedResults);
      } else {
        setSearchResults([]);
        setSearchError('No se encontraron resultados. Intenta con otra busqueda.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Error de conexion. Verifica tu internet e intenta de nuevo.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };















  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchVideos(query);
    }, 500);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length >= 2) {
      debouncedSearch(query);
    } else {
      setSearchResults([]);
      setSearchError('');
    }
  };

  const addSongToQueue = (video: Video) => {
    if (credits < creditsCost) {
      alert('No tienes suficientes creditos. Compra mas para continuar.');
      return;
    }

    const newSong: Song = {
      id: Date.now(),
      videoId: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      channelTitle: video.channelTitle,
      duration: video.duration,
      viewCount: video.viewCount,
      requesterName: customerName,
      requesterTable: tableNumber,
      status: 'pending',
      addedAt: new Date()
    };

    setSongs(prev => [...prev, newSong]);
    setCredits(prev => prev - creditsCost);
    
    setSearchQuery('');
    setSearchResults([]);
    
    alert(`Cancion agregada a la cola. Creditos restantes: ${credits - creditsCost}`);
  };

  useEffect(() => {
    const loadYouTubeAPI = () => {
      return new Promise((resolve) => {
        // @ts-ignore
        if (window.YT && window.YT.Player) {
          resolve(true);
          return;
        }
        
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        
        // @ts-ignore
        window.onYouTubeIframeAPIReady = () => {
          resolve(true);
        };
      });
    };

    loadYouTubeAPI().then(() => {
      setIsPlayerReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isPlayerReady || songs.length === 0) return;
    
    const pendingSongs = songs.filter(s => s.status === 'pending');
    if (pendingSongs.length === 0 && !currentlyPlaying) return;

    if (!currentlyPlaying && !isPlaying) {
      const nextSong = pendingSongs[0];
      if (nextSong) {
        playSong(nextSong);
      }
    }
  }, [songs, isPlayerReady, currentlyPlaying, isPlaying]);






  const playSong = (song: Song) => {
    if (!isPlayerReady) return;

    if (playerRef.current) {
      playerRef.current.destroy();
    }

    setCurrentlyPlaying(song);
    setPlayerError('');
    setIsPlaying(true);

    setSongs(prev => prev.map(s => 
      s.id === song.id ? { ...s, status: 'playing' as const } : s
    ));

    // @ts-ignore
    playerRef.current = new window.YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: song.videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0
      },
      events: {
        onReady: (event: any) => {
          event.target.playVideo();
        },
        onStateChange: (event: any) => {
          // @ts-ignore
          if (event.data === window.YT.PlayerState.ENDED) {
            onSongEnd();
          }
        },
        onError: (event: any) => {
          console.error('Player error:', event.data);
          setPlayerError('Error al reproducir el video. Saltando...');
          setTimeout(onSongEnd, 2000);
        }
      }
    });
  };

  const onSongEnd = () => {
    if (currentlyPlaying) {
      setSongs(prev => prev.map(s => 
        s.id === currentlyPlaying.id ? { ...s, status: 'played' as const } : s
      ));
    }

    setCurrentlyPlaying(null);
    setIsPlaying(false);

    const pendingSongs = songs.filter(s => s.status === 'pending');
    if (pendingSongs.length > 0) {
      setTimeout(() => {
        playSong(pendingSongs[0]);
      }, 1000);
    }
  };

  useEffect(() => {
    const pending = songs.filter(s => s.status === 'pending');
    setNextSongs(pending.slice(0, 5));
  }, [songs]);

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    return `Hace ${Math.floor(diffMins / 60)} hr`;
  };

  const renderVenueStep = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MERKA 4.0</h1>
          <p className="text-purple-200">Rockola Digital Inteligente</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-purple-200 text-sm mb-2">Codigo del Establecimiento</label>
            <input
              type="text"
              value={venueCode}
              onChange={(e) => setVenueCode(e.target.value.toUpperCase())}
              placeholder="Ej: ROCK01"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-center text-xl tracking-wider"
              maxLength={10}
            />
          </div>

          <button
            onClick={verifyVenueCode}
            disabled={venueCode.length < 3}
            className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl hover:from-yellow-500 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            INGRESAR
          </button>
        </div>

        <p className="text-center text-purple-300 text-xs mt-6">
          Solicita el codigo al personal del establecimiento
        </p>
      </div>
    </div>
  );















  const renderNameStep = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{venueName}</h2>
          <p className="text-purple-200">Bienvenido a la Rockola</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-purple-200 text-sm mb-2">Tu Nombre</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Como te llamas?"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-purple-200 text-sm mb-2">Mesa (Opcional)</label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Numero de mesa"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              maxLength={10}
            />
          </div>

          <button
            onClick={startSession}
            disabled={!customerName.trim()}
            className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl hover:from-yellow-500 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            CONTINUAR
          </button>
        </div>
      </div>
    </div>
  );

  const renderCreditsStep = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-white/20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Compra Credito</h2>
          <p className="text-purple-200">Selecciona un paquete para comenzar</p>
        </div>

        <div className="grid gap-3 mb-6">
          {creditPackages.map((pkg, index) => (
            <button
              key={index}
              onClick={() => setSelectedPackage(pkg)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedPackage?.credits === pkg.credits
                  ? 'bg-yellow-400/20 border-yellow-400'
                  : 'bg-white/5 border-white/20 hover:border-yellow-400/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <div className="text-white font-bold">{pkg.credits} Creditos</div>
                  <div className="text-purple-300 text-sm">{pkg.name}</div>
                </div>
                <div className="text-yellow-400 font-bold text-lg">
                  {pkg.price.toLocaleString('es-CR', { style: 'currency', currency: 'CRC' })}
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedPackage && (
          <div className="mb-6 p-4 bg-white/5 rounded-xl">
            <div className="flex justify-between text-purple-200 mb-2">
              <span>Paquete seleccionado:</span>
              <span className="text-white font-bold">{selectedPackage.credits} creditos</span>
            </div>
            <div className="flex justify-between text-purple-200">
              <span>Costo por cancion:</span>
              <span className="text-white">{creditsCost} credito(s)</span>
            </div>
          </div>
        )}

        {paymentStatus === 'processing' && (
          <div className="text-center py-4">
            <div className="animate-spin w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-purple-200">Procesando pago...</p>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400 font-bold">Pago exitoso!</p>
          </div>
        )}

        {paymentStatus === 'idle' && (
          <button
            onClick={processPayment}
            disabled={!selectedPackage}
            className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl hover:from-yellow-500 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            PAGAR CON SINPE MOVIL
          </button>
        )}
      </div>
    </div>
  );









  const renderSearchStep = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="sticky top-0 z-20 bg-purple-900/95 backdrop-blur-lg border-b border-white/10">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-white font-bold text-lg">{venueName}</h2>
              <p className="text-purple-300 text-sm">Hola, {customerName}!</p>
            </div>
            <div className="text-right">
              <div className="text-yellow-400 font-bold text-2xl">{credits}</div>
              <div className="text-purple-300 text-xs">Creditos</div>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Buscar cancion o artista..."
              className="w-full px-4 py-3 pl-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <svg className="w-5 h-5 text-purple-300 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        {searchResults.length > 0 && (
          <div className="mb-6">
            <h3 className="text-purple-200 text-sm mb-3 uppercase tracking-wide">Resultados de Busqueda</h3>
            <div className="space-y-2">
              {searchResults.map((video) => (
                <button
                  key={video.id}
                  onClick={() => addSongToQueue(video)}
                  className="w-full p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all flex items-center gap-3 text-left"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-16 h-12 object-cover rounded-lg"
                    />
                    {video.duration && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                        {video.duration}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{video.title}</div>
                    <div className="text-purple-300 text-xs truncate">{video.channelTitle}</div>
                    {video.viewCount && (
                      <div className="text-purple-400 text-xs">{video.viewCount} vistas</div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-yellow-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {searchError && (
          <div className="text-center py-8">
            <p className="text-purple-300">{searchError}</p>
          </div>
        )}

        {searchQuery.length < 2 && searchResults.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <p className="text-purple-200 text-lg mb-2">Busca tu cancion favorita</p>
            <p className="text-purple-400 text-sm">Escribe el nombre de la cancion o artista</p>
          </div>
        )}





































        {songs.length > 0 && (
          <div className="mt-6">
            <h3 className="text-purple-200 text-sm mb-3 uppercase tracking-wide flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
              Cola de Reproduccion ({songs.filter(s => s.status === 'pending').length})
            </h3>
            <div className="space-y-2">
              {songs.filter(s => s.status === 'pending').slice(0, 5).map((song, index) => (
                <div
                  key={song.id}
                  className={`p-3 rounded-xl flex items-center gap-3 ${
                    index === 0 ? 'bg-yellow-400/20 border border-yellow-400/30' : 'bg-white/5'
                  }`}
                >
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{song.title}</div>
                    <div className="text-purple-300 text-xs">
                      {song.requesterName}{song.requesterTable && ` - Mesa ${song.requesterTable}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {currentlyPlaying && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-purple-900/98 to-transparent p-4 pt-8">
          <div className="max-w-lg mx-auto">
            <div className="bg-black/50 backdrop-blur-lg rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-12 rounded-lg overflow-hidden">
                  <img
                    src={currentlyPlaying.thumbnail}
                    alt={currentlyPlaying.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{currentlyPlaying.title}</div>
                  <div className="text-purple-300 text-xs">
                    Reproduciendo ahora - {currentlyPlaying.requesterName}
                  </div>
                </div>
              </div>
              <div id="youtube-player" className="hidden"></div>
            </div>
          </div>
        </div>
      )}

      {songs.filter(s => s.status === 'pending').length > 0 && (
        <button
          onClick={() => setStep('queue')}
          className="fixed bottom-4 right-4 z-20 bg-yellow-400 text-purple-900 font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
          </svg>
          {songs.filter(s => s.status === 'pending').length}
        </button>
      )}
    </div>
  );









  const renderQueueStep = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="sticky top-0 z-20 bg-purple-900/95 backdrop-blur-lg border-b border-white/10">
        <div className="p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep('search')}
              className="text-white p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">Cola de Reproduccion</h2>
              <p className="text-purple-300 text-sm">{songs.filter(s => s.status === 'pending').length} canciones en espera</p>
            </div>
            <div className="text-right">
              <div className="text-yellow-400 font-bold text-xl">{credits}</div>
              <div className="text-purple-300 text-xs">Creditos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 pb-8">
        {currentlyPlaying && (
          <div className="mb-6">
            <h3 className="text-purple-200 text-sm mb-3 uppercase tracking-wide">Reproduciendo Ahora</h3>
            <div className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-xl p-4 border border-yellow-400/30">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={currentlyPlaying.thumbnail}
                    alt={currentlyPlaying.title}
                    className="w-20 h-14 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">{currentlyPlaying.title}</div>
                  <div className="text-purple-300 text-sm">{currentlyPlaying.channelTitle}</div>
                  <div className="text-yellow-400 text-xs mt-1">
                    Solicitada por {currentlyPlaying.requesterName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {nextSongs.length > 0 && (
          <div>
            <h3 className="text-purple-200 text-sm mb-3 uppercase tracking-wide">Siguientes</h3>
            <div className="space-y-2">
              {nextSongs.map((song, index) => (
                <div
                  key={song.id}
                  className="bg-white/10 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-purple-600/50 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{song.title}</div>
                    <div className="text-purple-300 text-xs truncate">{song.channelTitle}</div>
                    <div className="text-purple-400 text-xs">
                      {song.requesterName}{song.requesterTable && ` - Mesa ${song.requesterTable}`}
                    </div>
                  </div>
                  <div className="text-purple-400 text-xs">
                    {formatTimeAgo(song.addedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {songs.filter(s => s.status === 'played').length > 0 && (
          <div className="mt-8">
            <h3 className="text-purple-200 text-sm mb-3 uppercase tracking-wide">Recien Reproducidas</h3>
            <div className="space-y-2 opacity-60">
              {songs.filter(s => s.status === 'played').slice(-5).reverse().map((song) => (
                <div
                  key={song.id}
                  className="bg-white/5 rounded-xl p-3 flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{song.title}</div>
                    <div className="text-purple-300 text-xs">{song.requesterName}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {songs.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
            </div>
            <p className="text-purple-200 text-lg mb-2">Cola vacia</p>
            <p className="text-purple-400 text-sm">Busca canciones para agregarlas a la cola</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-20">
        <button
          onClick={() => setStep('search')}
          className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Buscar Mas Canciones
        </button>
      </div>

      {currentlyPlaying && (
        <div id="youtube-player" className="hidden"></div>
      )}
    </div>
  );































  return (
    <>
      {step === 'venue' && renderVenueStep()}
      {step === 'name' && renderNameStep()}
      {step === 'credits' && renderCreditsStep()}
      {step === 'search' && renderSearchStep()}
      {step === 'queue' && renderQueueStep()}
    </>
  );
}
