import type { Metadata } from 'next'
import './globals.css'
import './movent-visual.css'
import { Poppins } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

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
      <body className={poppins.className}>{children}</body>
    </html>
  )
}
