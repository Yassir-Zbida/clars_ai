import type { Metadata } from "next"
import "./globals.css"
import { DM_Sans } from "next/font/google"
import { cn } from "@/lib/utils"
import { Providers } from "@/app/providers"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Clars.ai — Intelligent CRM",
  description: "CRM for Freelancers & Solopreneurs",
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("font-sans", dmSans.variable)}>
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <TooltipProvider>
          <Providers>
            {children}
          </Providers>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  )
}
