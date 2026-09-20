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
          <div className="login-simple-pattern" />
          <div className="login-simple-content">
            <img src="/assets/branding/movent-dark.svg" alt="MOVENT" className="login-simple-logo" />

            <div className="login-simple-message">
              <span>movement management</span>
              <h1>Setiap pergerakan.<br />Satu kendali.</h1>
              <p>
                Pantau jadwal, penugasan, ticketing, dan armada.
                Semua dalam satu tempat.
              </p>
            </div>
          </div>

          <div className="login-simple-left-footer">
            <span>Part of FTC Go Project</span>
          </div>
        </aside>

        <div className="login-simple-form-panel">
          <div className="login-simple-form">
            <div className="login-simple-form-heading">
              <span className="login-simple-kicker">MOVENT</span>
              <h2>Halo, balik lagi 👋</h2>
              <p>Masuk dulu, biar operasional hari ini tetap jalan.</p>
            </div>

            <form action={formAction}>
              <label>
                Username
                <input
                  name="username"
                  autoComplete="username"
                  autoFocus
                  placeholder="Username kamu"
                />
              </label>

              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password kamu"
                />
              </label>

              {state.error ? (
                <p className="form-error login-error" role="alert">{state.error}</p>
              ) : null}

              <button type="submit" className="login-simple-submit" disabled={pending}>
                {pending ? 'Sebentar ya...' : 'Masuk ke MOVENT'}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>

          <div className="login-simple-right-footer">
            <span>Developed by Fleet Traffic Control</span>
          </div>
        </div>
      </section>
    </main>
  )
}
