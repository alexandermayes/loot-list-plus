import ExpansionDetailPage from './_client'

export default function Page({ params }: { params: Promise<{ expansionId: string }> }) {
  return <ExpansionDetailPage params={params} />
}
