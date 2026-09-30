import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import SessionActivity from "@/components/auth/session-activity";
import ToastProvider from "@/components/shared/toast-provider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MOVENT",
  description: "Manajemen Pergerakan",
  icons: {
    icon: "/assets/branding/movent-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={poppins.className}>
        <SessionActivity />
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
