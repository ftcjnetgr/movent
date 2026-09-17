import AppShell from '@/components/app-shell'

export default function ControllerReportPage() {
  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Controller</span><h1>Penarikan Report</h1><p>Tarik report berdasarkan STD, STA, atau tugas dibatalkan.</p></div></div>
      <section className="section-block">
        <div className="metric-card" style={{ maxWidth: 860 }}>
          <strong>Filter report</strong>
          <div className="login-form" style={{ marginTop: 12 }}>
            <label>Jenis report<select><option>STD</option><option>STA</option><option>Tugas Dibatalkan</option></select></label>
            <label>Dari tanggal<input type="date" /></label>
            <label>Sampai tanggal<input type="date" /></label>
            <label>Start Point<select><option>Semua</option></select></label>
            <label>Destinasi<select><option>Semua</option></select></label>
            <label>Executor<select><option>Semua</option></select></label>
            <button type="button">Tarik report</button>
          </div>
          <p>Rentang waktu maksimal 7 hari. Hasil report menggunakan Bahasa Inggris yang formal.</p>
        </div>
      </section>
    </AppShell>
  )
}
