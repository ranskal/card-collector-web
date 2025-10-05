'use client'
import ClientDetails from './ClientDetails'
export default function Page({ params }: { params: { id: string } }) {
  return <ClientDetails id={params.id} />
}