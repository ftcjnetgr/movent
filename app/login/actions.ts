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
    return { error: 'Username dan password perlu diisi dulu, ya.' }
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('id, username, email, role, status, must_change_password, failed_login_attempts, auth_user_id')
    .eq('username', username)
    .maybeSingle()

  if (profileError || !profile) {
    return { error: 'Username atau kata sandi salah. Coba lagi, ya.' }
  }

  if (profile.status === 'Locked') {
    return { error: 'Akun kamu sedang terkunci. Hubungi Super User untuk membukanya lagi.' }
  }

  let authUserId = profile.auth_user_id as string | null

  if (password === '123456' && profile.must_change_password) {
    if (authUserId) {
      const { error: resetAuthError } = await admin.auth.admin.updateUserById(authUserId, {
        password: '123456',
        email_confirm: true,
      })

      if (resetAuthError) {
        return { error: 'Akun kamu belum siap untuk masuk. Hubungi Super User, ya.' }
      }
    } else {
      const { data: createdAuth, error: createAuthError } = await admin.auth.admin.createUser({
        email: profile.email,
        password: '123456',
        email_confirm: true,
      })

      if (createAuthError || !createdAuth.user) {
        return { error: 'Akun kamu belum siap untuk masuk. Hubungi Super User, ya.' }
      }

      authUserId = createdAuth.user.id
      const { error: linkError } = await admin
        .from('user_profiles')
        .update({ auth_user_id: authUserId })
        .eq('id', profile.id)

      if (linkError) {
        return { error: 'Akun kamu belum siap untuk masuk. Hubungi Super User, ya.' }
      }
    }
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
        return { error: 'Akun kamu terkunci karena 3 kali salah memasukkan kata sandi. Hubungi Super User untuk membukanya lagi.' }
      }
    }

    return { error: 'Username atau kata sandi salah. Coba lagi, ya.' }
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
