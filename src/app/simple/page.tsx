export default function SimplePage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🎵 ROCKOLA - Página de prueba</h1>
      <p>Si ves esto, el servidor funciona correctamente.</p>
      <p>Fecha: {new Date().toLocaleString()}</p>
    </div>
  )
}
