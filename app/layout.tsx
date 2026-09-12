import './globals.css';
import type { Metadata } from 'next';
import AuthGuard from './auth-guard';

export const metadata: Metadata = { title:'Movent — Movement Management', description:'Movement Management' };

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="id"><body><AuthGuard>{children}</AuthGuard></body></html>
}
