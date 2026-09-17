import AppShell from '@/components/app-shell'

export default function RequestExtraSchedulePage() {
  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Operation</span><h1>Request Extra Schedule</h1><p>Ajukan kebutuhan perjalanan tambahan ke Dispatcher.</p></div></div>
      <section className="section-block">
        <div className="metric-card" style={{ maxWidth: 720 }}>
          <strong>Form request</strong>
          <p>Start Point, Destinasi, STD, dan STA akan menjadi bagian dari request Extra Schedule.</p>
          <div className="login-form" style={{ marginTop: 8 }}>
            <label>Start Point<input placeholder="Pilih Start Point" /></label>
            <label>Destinasi<input placeholder="Pilih Destinasi" /></label>
            <label>STD<input type="time" /></label>
            <label>STA<input type="time" /></label>
            <button type="button">Ajukan request</button>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
