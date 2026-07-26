import type { Metadata } from "next"
import "./globals.css"
import Providers from "./components/Providers"

export const metadata: Metadata = {
  title: "TypeMaster - Keyboard Typing Practice",
  description: "Keyboard Typing Practice System for Grade 12 ICT Students at Lemery Senior High School",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
