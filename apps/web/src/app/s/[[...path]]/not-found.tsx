export default function SiteNotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter, system-ui, sans-serif', background: '#F5F6FA' }}>
      <div style={{ maxWidth: 420, padding: 40, textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18 }}>
        <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Page not found</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>This site or page is not published yet.</p>
      </div>
    </div>
  );
}
