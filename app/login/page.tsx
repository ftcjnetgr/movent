'use client'

import { useActionState } from 'react'

import { loginAction } from './actions'

const initialState: { error?: string } = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <main className="login-page">
      <section className="login-card" aria-label="Login MOVENT">
        <div className="login-brand">movent</div>
        <h1>Masuk ke MOVENT</h1>
        <p className="login-subtitle">Siap bantu operasional kamu berjalan lebih rapi.</p>

        <form action={formAction} className="login-form">
          <label>
            Username
            <input name="username" autoComplete="username" autoFocus />
          </label>

          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" />
          </label>

          {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}

          <button type="submit" disabled={pending}>
            {pending ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>

        <div className="login-footer">
          <span>Part of FTC Go Project</span>
          <span>Developed by Fleet Traffic Control</span>
        </div>
      </section>
    </main>
  )
}
