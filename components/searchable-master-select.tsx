'use client'

import { useMemo, useState } from 'react'

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
  const [query, setQuery] = useState('')
  const [internalValue, setInternalValue] = useState(defaultValue)
  const selectedValue = value ?? internalValue

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) =>
      `${option.label} ${option.searchText ?? ''}`.toLowerCase().includes(needle)
    )
  }, [options, query])

  return (
    <label>
      {label}
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Cari ${label.toLowerCase()}...`}
        aria-label={`Cari ${label.toLowerCase()}`}
      />
      <select
        name={name}
        value={selectedValue}
        onChange={(event) => {
          const nextValue = event.target.value
          setInternalValue(nextValue)
          onValueChange?.(nextValue)
        }}
        required={required}
      >
        <option value="">{placeholder}</option>
        {filtered.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {!filtered.length ? <span className="muted">Data yang dicari tidak ditemukan.</span> : null}
    </label>
  )
}
