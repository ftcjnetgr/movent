import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MOVENT',
  description: 'Movement Management',
  icons: {
    icon: '/assets/branding/movent-icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
