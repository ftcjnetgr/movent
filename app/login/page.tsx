'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'

const initialState: { error?: string } = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <main className="login-page">
      <section className="login-simple-shell" aria-label="Login MOVENT">
        <aside className="login-simple-visual">
          <div className="login-simple-content">
            <img src="/assets/branding/movent-dark.svg" alt="MOVENT" className="login-simple-logo" />
            <div className="login-simple-message">
              <h1>Setiap<br />pergerakan<br />Satu<br />kendali</h1>
            </div>
          </div>
          <div className="login-simple-left-footer">Part of FTC Go Project</div>
        </aside>

        <div className="login-simple-form-panel">
          <div className="login-simple-form">
            <div className="login-simple-form-heading">
              <h2>Halo, balik lagi 👋</h2>
              <p>Masuk dulu, biar operasional hari ini tetap jalan.</p>
            </div>

            <form action={formAction}>
              <label>
                Username
                <input name="username" autoComplete="username" autoFocus placeholder="Username kamu" />
              </label>
              <label>
                Password
                <input name="password" type="password" autoComplete="current-password" placeholder="Password kamu" />
              </label>
              {state.error ? <p className="form-error login-error" role="alert">{state.error}</p> : null}
              <button type="submit" className="login-simple-submit" disabled={pending}>
                {pending ? 'Sebentar ya...' : 'Masuk'}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>
          <div className="login-simple-right-footer">Developed by Fleet Traffic Control</div>
        </div>
      </section>
    </main>
  )
}
