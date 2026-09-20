'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { changePasswordAction } from './actions'
import AppShell from '@/components/app-shell'

const initialState: { error?: string } = {}

function ChangePasswordCard({ first }: { first: boolean }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState)

  return (
    <div className={first ? 'password-page password-page-first' : 'password-page'}>
      {!first ? (
        <div className="password-page-topbar">
          <Link href="/controller/beranda" className="password-back">← Kembali</Link>
        </div>
      ) : null}

      <section className="password-card">
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
      </section>
    </div>
  )
}

export default function ChangePasswordPage() {
  const searchParams = useSearchParams()
  const first = searchParams.get('first') === '1'

  if (first) return <ChangePasswordCard first />

  return (
    <AppShell>
      <ChangePasswordCard first={false} />
    </AppShell>
  )
}
