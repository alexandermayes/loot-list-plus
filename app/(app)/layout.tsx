import AppLayout from './AppLayout.client'

export const dynamic = 'force-dynamic'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
