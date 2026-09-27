'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Option = {
  value: string
  label: string
  searchText?: string
}

export default function SearchableMasterSelect({
  label,
  name,
  options,
  placeholder,
  required = false,
  defaultValue = '',
  value,
  onValueChange,
}: {
  label: string
  name: string
  options: Option[]
  placeholder: string
  required?: boolean
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [internalValue, setInternalValue] = useState(defaultValue)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const selectedValue = value ?? internalValue
  const selected = options.find((option) => option.value === selectedValue)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) =>
      `${option.label} ${option.searchText ?? ''}`.toLowerCase().includes(needle)
    )
  }, [options, query])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  function choose(nextValue: string) {
    setInternalValue(nextValue)
    onValueChange?.(nextValue)
    setQuery('')
    setOpen(false)
  }

  return (
    <label className="master-select-field">
      {label}
      <div className="master-select" ref={wrapperRef}>
        <input type="hidden" name={name} value={selectedValue} required={required} />
        <button
          type="button"
          className={`master-select-trigger ${open ? 'open' : ''} ${selected ? 'has-value' : ''}`}
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span>{selected?.label ?? placeholder}</span>
          <span className="master-select-chevron" aria-hidden="true">⌄</span>
        </button>

        {open ? (
          <div className="master-select-menu">
            <input
              type="search"
              className="master-select-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Cari ${label.toLowerCase()}...`}
              autoFocus
              aria-label={`Cari ${label.toLowerCase()}`}
            />
            <div className="master-select-options" role="listbox">
              {filtered.map((option) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === selectedValue}
                  className={option.value === selectedValue ? 'master-select-option selected' : 'master-select-option'}
                  key={option.value}
                  onClick={() => choose(option.value)}
                >
                  {option.label}
                </button>
              ))}
              {!filtered.length ? <div className="master-select-empty">Data yang kamu cari nggak ditemukan.</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </label>
  )
}
