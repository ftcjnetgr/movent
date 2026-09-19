'use client'

import { useActionState } from 'react'

import { loginAction } from './actions'

const initialState: { error?: string } = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="Login MOVENT">
        <div className="login-panel login-panel-form">
          <div className="login-form-inner">
            <div className="login-brand-wrap">
              <img
                src="/assets/branding/movent-dark.svg"
                alt="MOVENT"
                className="login-brand-logo"
              />
            </div>

            <div className="login-heading">
              <h1>Masuk ke akun kamu</h1>
              <p>Kelola operasional, penugasan, dan armada dalam satu tempat.</p>
            </div>

            <form action={formAction} className="login-form">
              <label>
                Username
                <div className="login-input-wrap">
                  <input
                    name="username"
                    autoComplete="username"
                    autoFocus
                    placeholder="Masukkan username"
                  />
                </div>
              </label>

              <label>
                Password
                <div className="login-input-wrap">
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                  />
                </div>
              </label>

              {state.error ? (
                <p className="form-error login-error" role="alert">
                  {state.error}
                </p>
              ) : null}

              <button type="submit" className="login-submit" disabled={pending}>
                {pending ? 'Memeriksa...' : 'Masuk ke MOVENT'}
              </button>
            </form>
          </div>

          <div className="login-footer">
            <span>Part of FTC Go Project</span>
            <span>Developed by Fleet Traffic Control</span>
          </div>
        </div>

        <aside className="login-panel login-panel-visual" aria-hidden="true">
          <div className="login-visual-glow login-visual-glow-one" />
          <div className="login-visual-glow login-visual-glow-two" />


          <div className="login-visual-copy">
            <div className="login-visual-eyebrow">OPERASI LEBIH TERKONTROL</div>
            <h2>Semua pergerakan.<br />Satu kendali.</h2>
            <p>
              Pantau jadwal, penugasan, ticketing, dan perjalanan armada
              dengan alur kerja yang tetap rapi.
            </p>
          </div>

          <div className="login-visual-board">
            <div className="login-board-toolbar">
              <div className="login-board-brand">MOVENT</div>
              <div className="login-board-dots">
                <span />
                <span />
                <span />
              </div>
              <span>Dashboard / Operasional</span>
            </div>

            <div className="login-board-body">
              <div className="login-board-sidebar">
                <span className="login-board-logo" />
                <span className="login-board-line long" />
                <span className="login-board-line" />
                <span className="login-board-line" />
                <span className="login-board-line short" />
              </div>

              <div className="login-board-content">
                <div className="login-board-heading">
                  <span />
                  <span />
                </div>

                <div className="login-board-cards">
                  <div>
                    <small>Penugasan</small>
                    <strong>12 Assigned</strong>
                    <i />
                  </div>
                  <div>
                    <small>Perjalanan</small>
                    <strong>8 Driving</strong>
                    <i />
                  </div>
                  <div>
                    <small>Ticketing</small>
                    <strong>Maintenance</strong>
                    <i />
                  </div>
                </div>

                <div className="login-board-chart">
                  <span className="chart-bar bar-one" />
                  <span className="chart-bar bar-two" />
                  <span className="chart-bar bar-three" />
                  <span className="chart-bar bar-four" />
                  <span className="chart-bar bar-five" />
                </div>
              </div>
            </div>
          </div>

          <div className="login-float-card login-float-card-one">
            <span className="login-float-icon">✓</span>
            <div>
              <small>Status</small>
              <strong>Operasional terpantau</strong>
            </div>
          </div>

          <div className="login-float-card login-float-card-two">
            <span className="login-float-icon">↗</span>
            <div>
              <small>Alur kerja</small>
              <strong>Lebih terstruktur</strong>
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
