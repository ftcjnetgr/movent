'use client'

import { useActionState } from 'react'

import { loginAction } from './actions'

const initialState: { error?: string } = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="Login MOVENT">
        <aside className="login-panel login-panel-visual">
          <div className="login-visual-scene" />
          <div className="login-visual-overlay" />

          <div className="login-visual-top">
            <div className="login-logo-lockup">
              <img src="/assets/branding/movent-dark.svg" alt="MOVENT" className="login-visual-logo" />
              <span>MOVEMENT MANAGEMENT</span>
            </div>
            <div className="login-project-label"><span />Part of FTC Go Project</div>
          </div>

          <div className="login-visual-copy">
            <div className="login-visual-eyebrow">OPERASI LEBIH TERKONTROL</div>
            <h2>Setiap<br />pergerakan<br />membawa<br />lebih jauh.</h2>
            <p>Pantau jadwal, penugasan, ticketing, dan perjalanan armada dengan satu kendali.</p>
          </div>

          <div className="login-visual-features">
            <div><span className="login-feature-icon">↗</span><div><small>Operasional</small><strong>Terpantau</strong></div></div>
            <div><span className="login-feature-icon">♢</span><div><small>Keputusan</small><strong>Lebih cepat</strong></div></div>
            <div><span className="login-feature-icon">♙</span><div><small>Armada</small><strong>Lebih produktif</strong></div></div>
          </div>

          <div className="login-visual-bottom">
            <div className="login-scene-indicator"><span className="active" /><span /><span /></div>
            <span>Fleet Traffic Control</span>
          </div>
        </aside>

        <div className="login-panel login-panel-form">
          <div className="login-system-status">
            <span className="login-system-name">MOVENT SYSTEM</span>
            <span className="login-online-dot" />
            <span>ONLINE</span>
          </div>

          <div className="login-form-inner">
            <div className="login-heading">
              <h1>Halo, balik lagi 👋</h1>
              <p>Masuk dulu, biar operasional hari ini tetap jalan.</p>
            </div>

            <form action={formAction} className="login-form">
              <label>
                Username
                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">♙</span>
                  <input name="username" autoComplete="username" autoFocus placeholder="Username kamu" />
                </div>
              </label>

              <label>
                Password
                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">♧</span>
                  <input name="password" type="password" autoComplete="current-password" placeholder="Password kamu" />
                  <span className="login-password-hint" aria-hidden="true">◉</span>
                </div>
              </label>

              {state.error ? <p className="form-error login-error" role="alert">{state.error}</p> : null}

              <button type="submit" className="login-submit" disabled={pending}>
                <span>{pending ? 'Memeriksa...' : 'Masuk ke MOVENT'}</span>
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>

          <div className="login-footer"><span /><span>Developed by Fleet Traffic Control</span></div>
        </div>
      </section>
    </main>
  )
}
