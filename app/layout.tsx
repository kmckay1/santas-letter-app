import type { Metadata } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
  title: "SantasLetter.ai — A personalised letter from Santa for your child",
  description: "Get a magical, personalised letter from Santa Claus for your child. Free to generate, beautiful to keep. From the Official North Pole Post Office.",
  keywords: "Santa letter, letter from Santa, personalised Santa letter, Christmas letter, Santa Claus letter, kids Christmas",
  openGraph: {
    title: "SantasLetter.ai — A letter from Santa, written just for them",
    description: "Magical, personalised letters from the North Pole. Free to read, beautiful to keep, delivered from the Official North Pole Post Office.",
    url: "https://www.santasletter.ai",
    siteName: "SantasLetter.ai",
    images: [
      {
        url: "https://www.santasletter.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "SantasLetter.ai — Official North Pole Post Office",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SantasLetter.ai — A letter from Santa, written just for them",
    description: "Magical, personalised letters from the North Pole. Free to generate.",
    images: ["https://www.santasletter.ai/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL("https://www.santasletter.ai"),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}