'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

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
