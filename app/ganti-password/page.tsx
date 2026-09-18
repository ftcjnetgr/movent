'use client'

import { useActionState } from 'react'

import { changePasswordAction } from './actions'

const initialState: { error?: string } = {}

export default function ChangePasswordPage() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState)

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">movent</div>
        <h1>Buat kata sandi baru</h1>
        <p className="login-subtitle">Kata sandi bawaan cuma sementara. Ganti dulu sebelum lanjut, ya.</p>

        <form action={formAction} className="login-form">
          <label>
            Password baru
            <input name="newPassword" type="password" autoComplete="new-password" autoFocus />
          </label>

          <label>
            Ulangi kata sandi baru
            <input name="confirmPassword" type="password" autoComplete="new-password" />
          </label>

          {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}

          <button type="submit" disabled={pending}>
            {pending ? 'Menyimpan...' : 'Simpan kata sandi'}
          </button>
        </form>

        <div className="login-footer">
          <span>Minimal 6 karakter, ya</span>
          <span>Kata sandi bawaan nggak bisa dipakai lagi.</span>
        </div>
      </section>
    </main>
  )
}
