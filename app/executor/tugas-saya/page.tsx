import AppShell from '@/components/app-shell'

export default function ExecutorTugasSayaPage() {
  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Executor</span><h1>Tugas Saya</h1><p>Tugas aktif yang diberikan ke kamu.</p></div></div>
      <section className="section-block">
        <div className="metric-card">
          <span>Belum ada tugas aktif</span>
          <strong>0</strong>
          <p>Tugas Completed masuk ke Riwayat Tugas. Tugas Dibatalkan tidak masuk ke daftar aktif.</p>
        </div>
      </section>
    </AppShell>
  )
}
