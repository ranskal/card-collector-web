// src/app/card/[id]/page.tsx
import ClientDetails from './ClientDetails'

export default function Page({ params }: { params: { id: string } }) {
  return <ClientDetails id={params.id} />
}