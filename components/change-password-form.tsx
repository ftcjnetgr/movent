'use client'

import { useActionState } from 'react'
import { changePasswordAction } from '@/app/ganti-password/actions'

const initialState: { error?: string } = {}

export default function ChangePasswordForm({ first }: { first: boolean }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState)

  return (
    <section className={first ? 'password-page password-page-first' : 'password-card-wrap'}>
      <div className="password-card">
        <div className="password-card-heading">
          <span className="eyebrow">SETTING</span>
          <h1>Buat kata sandi baru</h1>
          <p>Kata sandi bawaan cuma sementara. Ganti dulu sebelum lanjut, ya.</p>
        </div>

        <form action={formAction} className="password-form">
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

        <div className="password-card-footer">
          <span>Minimal 6 karakter</span>
          <span>Kata sandi bawaan nggak bisa dipakai lagi.</span>
        </div>
      </div>
    </section>
  )
}
