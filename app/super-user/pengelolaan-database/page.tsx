import AppShell from '@/components/app-shell'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { addMasterRowAction, deleteMasterRowAction, importMasterDatabaseAction, updateMasterRowAction } from './actions'

const databases = [
  { key: 'schedules', label: 'Schedule', identifier: 'schedule_id' },
  { key: 'executors', label: 'Executor', identifier: 'executor_nik' },
  { key: 'fleets', label: 'Armada', identifier: 'plat_number' },
  { key: 'locations', label: 'Lokasi', identifier: 'location' },
  { key: 'products', label: 'Produk', identifier: 'product' },
  { key: 'maintenance_lists', label: 'List Maintenance', identifier: 'maintenance_list' },
] as const

const configs = {
  schedules: ['schedule_id','trip','schedule_hub_id','route','category','start_point','start_point_type','destination','destination_type','schedule_day','schedule_day_name','aging','std','sta','status'],
  executors: ['executor_nik','full_name','status'],
  fleets: ['plat_number','fleet_type','status'],
  locations: ['location','grouping','status'],
  products: ['product','status'],
  maintenance_lists: ['maintenance_list','status'],
} as const

export default async function DatabaseManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ db?: string; q?: string }>
}) {
  const profile = await getCurrentProfile()
  if (profile.role !== 'Super User') return null

  const params = await searchParams
  const rawDb = params.db
  const query = (params.q ?? '').trim()
  const db = databases.some((item) => item.key === rawDb) ? rawDb! : 'schedules'
  const config = configs[db as keyof typeof configs]
  const meta = databases.find((item) => item.key === db)!

  const admin = createAdminClient()
  let rowsQuery = admin.from(db).select('*').order(meta.identifier)
  if (query) rowsQuery = rowsQuery.ilike(meta.identifier, '%' + query + '%')
  const { data: rows } = await rowsQuery.limit(50)

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Super User</span>
          <h1>Pengelolaan Database</h1>
          <p>Kelola master data satu per satu atau melalui import CSV/XLSX.</p>
        </div>
      </div>

      <section className="section-block">
        <form className="data-form" method="get">
          <div className="form-row">
            <label>Pilih Database
              <select name="db" defaultValue={db}>
                {databases.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
            <label>Cari berdasarkan {meta.identifier}
              <input name="q" defaultValue={query} placeholder="Ketik identifier" />
            </label>
          </div>
          <button type="submit">Cari</button>
        </form>
      </section>

      <section className="section-grid two-column section-block">
        <div className="metric-card">
          <h2>Import Massal</h2>
          <p className="muted">Identifier yang sama akan diperbarui. Identifier baru akan dibuat. Data yang tidak ada di file tetap dipertahankan.</p>
          <form action={importMasterDatabaseAction} className="data-form">
            <input type="hidden" name="database" value={db} />
            <label>File CSV / XLSX<input type="file" name="file" accept=".csv,.xlsx" required /></label>
            <button type="submit">Import database</button>
          </form>
        </div>

        <div className="metric-card">
          <h2>Tambah Data</h2>
          <form action={addMasterRowAction} className="data-form compact-form">
            <input type="hidden" name="database" value={db} />
            {config.map((column) => (
              <label key={column}>{column}<input name={'field__' + column} required={column === meta.identifier} /></label>
            ))}
            <button type="submit">Tambah data</button>
          </form>
        </div>
      </section>

      <section className="data-table-card section-block">
        <div className="section-heading">
          <div>
            <h2>{meta.label}</h2>
            <p>Identifier: {meta.identifier}. Menampilkan maksimal 50 data pertama.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{config.map((column) => <th key={column}>{column}</th>)}<th>Aksi</th></tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row) => (
                <tr key={String(row[meta.identifier])}>
                  {config.map((column) => (
                    <td key={column}>{row[column] === null || row[column] === undefined ? '-' : String(row[column])}</td>
                  ))}
                  <td>
                    <details>
                      <summary className="link-button">Edit</summary>
                      <form action={updateMasterRowAction} className="compact-form" style={{marginTop:12}}>
                        <input type="hidden" name="database" value={db} />
                        <input type="hidden" name="identifier" value={String(row[meta.identifier])} />
                        {config.map((column) => (
                          <label key={column}>{column}<input name={'field__' + column} defaultValue={row[column] === null || row[column] === undefined ? '' : String(row[column])} disabled={column === meta.identifier} /></label>
                        ))}
                        <button type="submit">Simpan</button>
                      </form>
                    </details>
                    <form action={deleteMasterRowAction} style={{marginTop:8}}>
                      <input type="hidden" name="database" value={db} />
                      <input type="hidden" name="identifier" value={String(row[meta.identifier])} />
                      <button type="submit" className="secondary-button">Hapus</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!(rows ?? []).length ? <tr><td colSpan={config.length + 1}><div className="empty-state">Belum ada data.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
