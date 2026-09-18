'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import * as XLSX from 'sheetjs_xlsx'

type Result = { error?: string; success?: string }

const configs = {
  schedules: { identifier: 'schedule_id', columns: ['schedule_id','trip','schedule_hub_id','route','category','start_point','start_point_type','destination','destination_type','schedule_day','schedule_day_name','aging','std','sta','status'] },
  executors: { identifier: 'executor_nik', columns: ['executor_nik','full_name','status'] },
  fleets: { identifier: 'plat_number', columns: ['plat_number','fleet_type','status'] },
  locations: { identifier: 'location', columns: ['location','grouping','status'] },
  products: { identifier: 'product', columns: ['product','status'] },
  maintenance_lists: { identifier: 'maintenance_list', columns: ['maintenance_list','status'] },
} as const

type DatabaseKey = keyof typeof configs

function getConfig(value: string) {
  return (value in configs ? configs[value as DatabaseKey] : null)
}

async function requireSuperUser() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'Super User') throw new Error('Akses tidak tersedia.')
}

function valueForColumn(formData: FormData, column: string) {
  const value = formData.get('field__' + column)
  if (value === null) return undefined
  const text = String(value).trim()
  if (text === '') return null
  return text
}

async function saveMasterRow(formData: FormData, mode: 'insert' | 'update'): Promise<Result> {
  try { await requireSuperUser() } catch { return { error: 'Akses tidak tersedia.' } }

  const db = String(formData.get('database') ?? '').trim()
  const config = getConfig(db)
  if (!config) return { error: 'Database tidak tersedia.' }

  const payload: Record<string, unknown> = {}
  for (const column of config.columns) {
    const value = valueForColumn(formData, column)
    if (value !== undefined) payload[column] = value
  }

  if (!payload[config.identifier]) return { error: 'Identifier wajib diisi.' }

  const admin = createAdminClient()
  if (mode === 'insert') {
    if (db !== 'schedules' && payload.status === undefined) payload.status = 'Active'
    const { error } = await admin.from(db).insert(payload)
    if (error) return { error: 'Data belum berhasil ditambahkan.' }
  } else {
    const identifier = String(formData.get('identifier') ?? '').trim()
    if (!identifier) return { error: 'Identifier tidak ditemukan.' }
    delete payload[config.identifier]
    const { error } = await admin.from(db).update(payload).eq(config.identifier, identifier)
    if (error) return { error: 'Data belum berhasil diperbarui.' }
  }

  revalidatePath('/super-user/pengelolaan-database')
  return { success: mode === 'insert' ? 'Data berhasil ditambahkan.' : 'Data berhasil diperbarui.' }
}

export async function addMasterRowAction(formData: FormData) {
  return saveMasterRow(formData, 'insert')
}

export async function updateMasterRowAction(formData: FormData) {
  return saveMasterRow(formData, 'update')
}

export async function deleteMasterRowAction(formData: FormData): Promise<Result> {
  try { await requireSuperUser() } catch { return { error: 'Akses tidak tersedia.' } }

  const db = String(formData.get('database') ?? '').trim()
  const config = getConfig(db)
  if (!config) return { error: 'Database tidak tersedia.' }

  const identifier = String(formData.get('identifier') ?? '').trim()
  if (!identifier) return { error: 'Identifier tidak ditemukan.' }

  const admin = createAdminClient()
  const { error } = await admin.from(db).delete().eq(config.identifier, identifier)
  if (error) return { error: 'Data belum berhasil dihapus.' }

  revalidatePath('/super-user/pengelolaan-database')
  return { success: 'Data berhasil dihapus.' }
}

function normalizeImportedRows(input: unknown[], config: { columns: readonly string[] }) {
  return input.map((row) => {
    const source = row as Record<string, unknown>
    const clean: Record<string, unknown> = {}
    for (const column of config.columns) {
      if (Object.prototype.hasOwnProperty.call(source, column)) {
        const value = source[column]
        clean[column] = value === '' || value === undefined ? null : value
      }
    }
    return clean
  }).filter((row) => Object.keys(row).length > 0)
}

export async function importMasterDatabaseAction(formData: FormData): Promise<Result> {
  try { await requireSuperUser() } catch { return { error: 'Akses tidak tersedia.' } }

  const db = String(formData.get('database') ?? '').trim()
  const config = getConfig(db)
  if (!config) return { error: 'Database tidak tersedia.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'File CSV atau XLSX wajib dipilih.' }

  const buffer = Buffer.from(await file.arrayBuffer())
  let rows: unknown[] = []

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(firstSheet, { defval: null })
  } catch {
    return { error: 'File belum berhasil dibaca. Gunakan CSV atau XLSX.' }
  }

  const normalized = normalizeImportedRows(rows, config)
  if (!normalized.length) return { error: 'File tidak memiliki data yang bisa diimpor.' }

  if (!normalized.every((row) => row[config.identifier])) {
    return { error: 'Setiap baris wajib memiliki identifier.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from(db).upsert(normalized, { onConflict: config.identifier })
  if (error) return { error: 'Import belum berhasil diproses.' }

  revalidatePath('/super-user/pengelolaan-database')
  return { success: normalized.length + ' data berhasil diimpor.' }
}
