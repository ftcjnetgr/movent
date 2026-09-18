'use server'

import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const roleHome: Record<string, string> = {
  'Controller': '/controller/beranda',
  'Dispatcher': '/dispatcher/beranda',
  'Operation': '/operation/request-extra-schedule',
  'Executor': '/executor/tugas-saya',
  'Maintainer': '/maintainer/beranda',
  'Super User': '/controller/beranda',
}

export async function changePasswordAction(_state: { error?: string }, formData: FormData) {
  const newPassword = String(formData.get('newPassword') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (newPassword.length < 6) {
    return { error: 'Password baru minimal 6 karakter.' }
  }

  if (newPassword === '123456') {
    return { error: 'Password baru tidak boleh menggunakan password default 123456.' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Konfirmasi password belum sama.' }
  }

  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    redirect('/login')
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, role')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()

  if (!profile) {
    return { error: 'Data profil pengguna belum ditemukan.' }
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword })

  if (passwordError) {
    return { error: 'Password belum berhasil diubah. Coba lagi.' }
  }

  await admin
    .from('user_profiles')
    .update({
      must_change_password: false,
      failed_login_attempts: 0,
      status: 'Active',
      locked_at: null,
    })
    .eq('id', profile.id)

  redirect(roleHome[profile.role] ?? '/login')
}
