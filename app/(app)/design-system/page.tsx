import { notFound } from 'next/navigation'
import DesignSystemPage from './_client'

export default function Page() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return <DesignSystemPage />
}
