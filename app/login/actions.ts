'use server'

import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type LoginState = {
  error?: string
}

const roleHome: Record<string, string> = {
  'Controller': '/controller/beranda',
  'Dispatcher': '/dispatcher/beranda',
  'Operation': '/operation/request-extra-schedule',
  'Executor': '/executor/tugas-saya',
  'Maintainer': '/maintainer/beranda',
  'Super User': '/controller/beranda',
}

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!username || !password) {
    return { error: 'Username dan password wajib diisi.' }
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('id, username, email, role, status, must_change_password, failed_login_attempts')
    .eq('username', username)
    .maybeSingle()

  if (profileError || !profile) {
    return { error: 'Username atau password salah.' }
  }

  if (profile.status === 'Locked') {
    return { error: 'Akun sedang terkunci. Hubungi Super User untuk membuka kembali.' }
  }

  const supabase = await createClient()
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  })

  if (signInError || !authData.user) {
    if (profile.role !== 'Super User') {
      const nextAttempts = Number(profile.failed_login_attempts ?? 0) + 1
      await admin
        .from('user_profiles')
        .update({
          failed_login_attempts: nextAttempts,
          status: nextAttempts >= 3 ? 'Locked' : profile.status,
          locked_at: nextAttempts >= 3 ? new Date().toISOString() : null,
        })
        .eq('id', profile.id)

      if (nextAttempts >= 3) {
        return { error: 'Akun terkunci karena 3 kali salah password. Hubungi Super User untuk membuka kembali.' }
      }
    }

    return { error: 'Username atau password salah.' }
  }

  await admin
    .from('user_profiles')
    .update({
      auth_user_id: authData.user.id,
      failed_login_attempts: 0,
    })
    .eq('id', profile.id)

  if (profile.must_change_password) {
    redirect('/ganti-password?first=1')
  }

  redirect(roleHome[profile.role] ?? '/login')
}
