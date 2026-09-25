import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { addMasterRowAction, deleteMasterRowAction, importMasterDatabaseAction, updateMasterRowAction } from './actions'
import DatabaseActionPreview from '@/components/database-action-preview'
import DatabaseEditPreview from '@/components/database-edit-preview'

async function importMasterDatabaseFormAction(formData: FormData) {
  'use server'
  await importMasterDatabaseAction(formData)
}

async function addMasterRowFormAction(formData: FormData) {
  'use server'
  await addMasterRowAction(formData)
}

async function updateMasterRowFormAction(formData: FormData) {
  'use server'
  await updateMasterRowAction(formData)
}

async function deleteMasterRowFormAction(formData: FormData) {
  'use server'
  await deleteMasterRowAction(formData)
}

const databases = [
  { key: 'schedules', label: 'Schedule', identifier: 'schedule_id' },
  { key: 'executors', label: 'Executor', identifier: 'executor_nik' },
  { key: 'fleets', label: 'Armada', identifier: 'plat_number' },
  { key: 'locations', label: 'Lokasi', identifier: 'location' },
  { key: 'products', label: 'Produk', identifier: 'product' },
  { key: 'maintenance_lists', label: 'List Maintenance', identifier: 'maintenance_list' },
] as const

function displayDatabaseValue(column: string, value: unknown) {
  if (value === null || value === undefined) return '-'
  if (column === 'std' || column === 'sta') {
    const text = String(value)
    return /^\d{2}:\d{2}/.test(text) ? text.slice(0, 5) : text
  }
  return String(value)
}

function databaseInputType(column: string) {
  return column === 'std' || column === 'sta' ? 'time' : 'text'
}
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
    <>
    <div className="page-heading">
        <div>
          <h1>Kelola Database</h1>
          <p>Kelola master data satu per satu atau melalui import CSV/XLSX.</p>
        </div>
      </div>

      <section className="section-block database-management-filter">
        <form className="data-form" method="get">
          <div className="form-row">
            <label>Pilih Database
              <select name="db" defaultValue={db}>
                {databases.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
            <label>Cari berdasarkan ID {meta.identifier}
              <input name="q" defaultValue={query} placeholder="Ketik ID yang mau dicari" />
            </label>
          </div>
          <button type="submit">Cari</button>
        </form>
      </section>

      <section className="database-management-actions section-block">
        <DatabaseActionPreview title="Import banyak data">
          <p className="muted">Data dengan ID yang sama akan diperbarui, ID baru akan ditambahkan, dan data lain tetap aman.</p>
          <form action={importMasterDatabaseFormAction} className="data-form database-action-form">
            <input type="hidden" name="database" value={db} />
            <label>File CSV / XLSX<input type="file" name="file" accept=".csv,.xlsx" required /></label>
            <button type="submit">Import data</button>
          </form>
        </DatabaseActionPreview>

        <DatabaseActionPreview title="Tambah data">
          <form action={addMasterRowFormAction} className="data-form compact-form database-action-form">
            <input type="hidden" name="database" value={db} />
            {config.map((column) => (
              <label key={column}>{column}<input name={'field__' + column} type={databaseInputType(column)} required={column === meta.identifier} /></label>
            ))}
            <button type="submit">Tambah data</button>
          </form>
        </DatabaseActionPreview>
      </section>

      <section className="data-table-card section-block">
        <div className="section-heading">
          <div>
            <h2>{meta.label}</h2>
            <p>Identifier: {meta.identifier}. Menampilkan maksimal 50 data. Jika mau, cari data berdasarkan ID.</p>
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
                    <td key={column}>{displayDatabaseValue(column, row[column])}</td>
                  ))}
                  <td>
                    <div className="admin-row-actions">
                    <DatabaseEditPreview>
                      <form action={updateMasterRowFormAction} className="compact-form database-action-form">
                        <input type="hidden" name="database" value={db} />
                        <input type="hidden" name="identifier" value={String(row[meta.identifier])} />
                        {config.map((column) => (
                          <label key={column}>{column}<input name={'field__' + column} type={databaseInputType(column)} defaultValue={row[column] === null || row[column] === undefined ? '' : displayDatabaseValue(column, row[column])} disabled={column === meta.identifier} /></label>
                        ))}
                        <button type="submit">Simpan perubahan</button>
                      </form>
                    </DatabaseEditPreview>
                    <form action={deleteMasterRowFormAction} className="admin-row-action-secondary">
                      <input type="hidden" name="database" value={db} />
                      <input type="hidden" name="identifier" value={String(row[meta.identifier])} />
                      <button type="submit" className="secondary-button">Hapus data</button>
                    </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!(rows ?? []).length ? <tr><td colSpan={config.length + 1}><div className="empty-state">Belum ada data untuk ditampilkan.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
