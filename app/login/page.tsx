'use client'

import { useActionState, useState } from 'react'
import { loginAction } from './actions'

const initialState: { error?: string } = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className="login-page">
      <section className="login-simple-shell" aria-label="Login MOVENT">
        <aside className="login-simple-visual">
          <div className="login-simple-content">
            <img src="/assets/branding/movent-dark.svg" alt="MOVENT" className="login-simple-logo" />
            <div className="login-simple-message">
              <h1>setiap<br />pergerakan,<br />satu<br />kendali.</h1>
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
                <span className="login-password-field">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Password kamu"
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {showPassword ? (
                        <>
                          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="2.5" />
                        </>
                      ) : (
                        <>
                          <path d="M3 3l18 18" />
                          <path d="M10.6 6.2A11.4 11.4 0 0 1 12 6c6.5 0 10 6 10 6a18.6 18.6 0 0 1-4.1 4.3" />
                          <path d="M6.2 8.1C3.5 9.8 2 12 2 12s3.5 6 10 6a10.9 10.9 0 0 0 4.1-.8" />
                        </>
                      )}
                    </svg>
                  </button>
                </span>
              </label>
              {state.error ? <p className="form-error login-error" role="alert">{state.error}</p> : null}
              <button type="submit" className="login-simple-submit" disabled={pending}>
                {pending ? 'Sebentar ya...' : 'Masuk'}
              </button>
            </form>
          </div>
          <div className="login-simple-right-footer">Developed by Fleet Traffic Control</div>
        </div>
      </section>
    </main>
  )
}
