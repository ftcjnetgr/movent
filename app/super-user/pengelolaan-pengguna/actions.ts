'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import * as XLSX from 'sheetjs_xlsx'

type Result = { error?: string; success?: string }

async function requireSuperUser() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'Super User') throw new Error('Akses tidak tersedia.')
  return profile
}

export async function lockUserAction(formData: FormData): Promise<Result> {
  try { await requireSuperUser() } catch { return { error: 'Akses tidak tersedia.' } }
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { error: 'User tidak ditemukan.' }

  const admin = createAdminClient()
  const { data: user } = await admin.from('user_profiles').select('id, role').eq('id', id).maybeSingle()
  if (!user) return { error: 'User tidak ditemukan.' }

  const { error } = await admin.from('user_profiles').update({ status: 'Locked', locked_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: 'Akun belum berhasil dikunci.' }

  revalidatePath('/super-user/pengelolaan-pengguna')
  return { success: 'Akun berhasil dikunci.' }
}

export async function unlockUserAction(formData: FormData): Promise<Result> {
  try { await requireSuperUser() } catch { return { error: 'Akses tidak tersedia.' } }
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { error: 'User tidak ditemukan.' }

  const admin = createAdminClient()
  const { data: user } = await admin
    .from('user_profiles')
    .select('id, auth_user_id')
    .eq('id', id)
    .maybeSingle()
  if (!user) return { error: 'User tidak ditemukan.' }

  const authUserId = user.auth_user_id as string | null
  if (authUserId) {
    const { error } = await admin.auth.admin.updateUserById(authUserId, { password: '123456' })
    if (error) return { error: 'Password default belum berhasil di-reset.' }
  }

  const { error } = await admin.from('user_profiles').update({
    status: 'Active',
    failed_login_attempts: 0,
    locked_at: null,
    must_change_password: true,
  }).eq('id', id)

  if (error) return { error: 'Akun belum berhasil dibuka.' }

  revalidatePath('/super-user/pengelolaan-pengguna')
  return { success: authUserId ? 'Akun dibuka dan password di-reset ke 123456.' : 'Akun dibuka dan akan memakai password default 123456 saat first login.' }
}

export async function updateUserProfileAction(formData: FormData): Promise<Result> {
  try { await requireSuperUser() } catch { return { error: 'Akses tidak tersedia.' } }

  const id = String(formData.get('id') ?? '').trim()
  const username = String(formData.get('username') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const nik = String(formData.get('nik') ?? '').trim()
  const fullName = String(formData.get('fullName') ?? '').trim()
  const phoneNumber = String(formData.get('phoneNumber') ?? '').trim()
  const role = String(formData.get('role') ?? '').trim()

  if (!id || !username || !email || !nik || !fullName || !role) return { error: 'Data pengguna wajib lengkap.' }
  if (!['Controller','Dispatcher','Operation','Executor','Maintainer','Super User'].includes(role)) return { error: 'Role tidak tersedia.' }

  const admin = createAdminClient()
  const { data: existing } = await admin.from('user_profiles').select('id, auth_user_id').eq('id', id).maybeSingle()
  if (!existing) return { error: 'User tidak ditemukan.' }

  const { error } = await admin.from('user_profiles').update({
    username, email, nik, full_name: fullName, phone_number: phoneNumber || null, role,
  }).eq('id', id)
  if (error) return { error: 'Data pengguna belum berhasil disimpan.' }

  if (existing.auth_user_id) {
    const { error: authError } = await admin.auth.admin.updateUserById(existing.auth_user_id, { email })
    if (authError) return { error: 'Data user tersimpan, tetapi email Auth belum berhasil diperbarui.' }
  }

  revalidatePath('/super-user/pengelolaan-pengguna')
  return { success: 'Data pengguna berhasil disimpan.' }
}


const allowedRoles = ['Controller','Dispatcher','Operation','Executor','Maintainer','Super User']
const allowedStatuses = ['Active','Locked']

function fieldText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function validateUserInput(input: {
  username: string
  email: string
  nik: string
  fullName: string
  role: string
  status: string
}) {
  if (!input.username || !input.email || !input.nik || !input.fullName || !input.role) {
    return 'Username, email, NIK, nama lengkap, dan role wajib diisi.'
  }
  if (!allowedRoles.includes(input.role)) return 'Role tidak tersedia.'
  if (!allowedStatuses.includes(input.status)) return 'Status tidak tersedia.'
  return null
}

export async function addUserAction(formData: FormData): Promise<Result> {
  try { await requireSuperUser() } catch { return { error: 'Akses tidak tersedia.' } }

  const input = {
    username: fieldText(formData, 'username'),
    email: fieldText(formData, 'email'),
    nik: fieldText(formData, 'nik'),
    fullName: fieldText(formData, 'fullName'),
    phoneNumber: fieldText(formData, 'phoneNumber'),
    role: fieldText(formData, 'role'),
    status: fieldText(formData, 'status') || 'Active',
  }

  const validation = validateUserInput(input)
  if (validation) return { error: validation }

  const admin = createAdminClient()
  const { data: existingUsers } = await admin
    .from('user_profiles')
    .select('username,email,nik')

  const duplicate = (existingUsers ?? []).some((user) =>
    user.username === input.username || user.email === input.email || user.nik === input.nik
  )

  if (duplicate) return { error: 'Username, email, atau NIK sudah digunakan.' }

  const { error } = await admin.from('user_profiles').insert({
    username: input.username,
    email: input.email,
    nik: input.nik,
    full_name: input.fullName,
    phone_number: input.phoneNumber || null,
    role: input.role,
    status: input.status,
    must_change_password: true,
    failed_login_attempts: 0,
    auth_user_id: null,
  })

  if (error) return { error: 'Data pengguna belum berhasil ditambahkan.' }

  revalidatePath('/super-user/pengelolaan-pengguna')
  return { success: 'User berhasil ditambahkan.' }
}

export async function importUsersAction(formData: FormData): Promise<Result> {
  try { await requireSuperUser() } catch { return { error: 'Akses tidak tersedia.' } }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'File CSV atau XLSX wajib dipilih.' }

  let rows: Record<string, unknown>[] = []
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })
  } catch {
    return { error: 'File belum berhasil dibaca. Gunakan CSV atau XLSX.' }
  }

  if (!rows.length) return { error: 'File tidak memiliki data.' }

  const normalized = rows.map((row) => ({
    username: String(row.username ?? '').trim(),
    email: String(row.email ?? '').trim(),
    nik: String(row.nik ?? '').trim(),
    full_name: String(row.full_name ?? row.fullName ?? '').trim(),
    phone_number: String(row.phone_number ?? row.phoneNumber ?? '').trim() || null,
    role: String(row.role ?? '').trim(),
    status: String(row.status ?? 'Active').trim() || 'Active',
    must_change_password: true,
    failed_login_attempts: 0,
    auth_user_id: null,
  }))

  for (const row of normalized) {
    const validation = validateUserInput({
      username: row.username,
      email: row.email,
      nik: row.nik,
      fullName: row.full_name,
      role: row.role,
      status: row.status,
    })
    if (validation) return { error: 'Data ' + (row.username || '(tanpa username)') + ': ' + validation }
  }

  const usernames = new Set<string>()
  const emails = new Set<string>()
  const niks = new Set<string>()

  for (const row of normalized) {
    if (usernames.has(row.username) || emails.has(row.email) || niks.has(row.nik)) {
      return { error: 'File memiliki username, email, atau NIK yang duplikat.' }
    }
    usernames.add(row.username)
    emails.add(row.email)
    niks.add(row.nik)
  }

  const admin = createAdminClient()
  const { data: existingUsers } = await admin
    .from('user_profiles')
    .select('username,email,nik')

  const existingUsername = new Set((existingUsers ?? []).map((user) => user.username))
  const existingEmail = new Set((existingUsers ?? []).map((user) => user.email))
  const existingNik = new Set((existingUsers ?? []).map((user) => user.nik))

  if (normalized.some((row) => existingUsername.has(row.username) || existingEmail.has(row.email) || existingNik.has(row.nik))) {
    return { error: 'Sebagian username, email, atau NIK di file sudah ada.' }
  }

  const { error } = await admin.from('user_profiles').insert(normalized)
  if (error) return { error: 'Import data user belum berhasil diproses.' }

  revalidatePath('/super-user/pengelolaan-pengguna')
  return { success: normalized.length + ' user berhasil diimpor.' }
}
