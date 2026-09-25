'use client'

import { useEffect, useState, type ReactNode } from 'react'

export default function DatabaseActionPreview({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button type="button" className="database-action-card" onClick={() => setOpen(true)}>
        <span>{title}</span>
        <small>+</small>
      </button>

      {open ? (
        <div className="database-action-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <div
            className="database-action-modal"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="database-action-modal-heading">
              <div>
                <h2>{title}</h2>
                <p>Kelola data <strong> {title === 'Tambah data' ? 'satu per satu' : 'secara massal'}</strong> di sini.</p>
              </div>
              <button
                type="button"
                className="database-action-modal-close"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
            <div className="database-action-modal-body">
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
