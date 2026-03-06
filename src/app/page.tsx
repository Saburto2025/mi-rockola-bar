export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(to bottom right, #4c1d95, #1e1b4b, #1e3a8a)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎵 ROCKOLA 🎵</h1>
      <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>MERKA 4.0 - Sistema de Música</p>
      <p style={{ opacity: 0.7 }}>Si ves esto, el servidor funciona correctamente.</p>
      <p style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.5 }}>
        {new Date().toLocaleString('es-CR')}
      </p>
    </div>
  )
}
