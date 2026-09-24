import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'НЕМА ФҮҮДС | Бүтээгдэхүүний бөөний цахим каталог',
  description: 'Нема Фүүдс ХХК (NEMA FOODS) - Хүнс, амттан, бөөний худалдааны албан ёсны нэгдсэн цахим каталог.',
  keywords: ['Нема Фүүдс', 'Nema Foods', 'бөөний үнэ', 'хүнсний каталог', 'амттан', 'чихэр', 'жүүс', 'B2B каталог'],
  authors: [{ name: 'Нема Фүүдс ХХК' }],
  icons: {
    icon: '/nema-foods-logo.svg',
    apple: '/nema-foods-logo.svg',
  },
  openGraph: {
    title: 'НЕМА ФҮҮДС | Бүтээгдэхүүний бөөний цахим каталог',
    description: 'Нема Фүүдс ХХК - Албан ёсны бөөний үнийн сан, шинэ бүтээгдэхүүний каталог.',
    images: [{ url: '/nema-foods-logo.svg', width: 500, height: 500, alt: 'Нема Фүүдс Лого' }],
    locale: 'mn_MN',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="mn" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Rubik:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-teal-500/20 selection:text-teal-900">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
