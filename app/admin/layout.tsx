import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'НЕМА ФҮҮДС | Админ Удирдлагын Систем',
  description: 'Нема Фүүдс ХХК - Бараа бүтээгдэхүүн, ангилал, үлдэгдэл удирдах админ систем',
  icons: {
    icon: '/nema-foods-logo.svg',
    shortcut: '/nema-foods-logo.svg',
    apple: '/nema-foods-logo.svg',
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
