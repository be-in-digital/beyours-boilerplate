import { OrderDetailPage } from "@be-in-digital/admin"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const remappedParams = params.then(({ id }) => ({ orderId: id }))
  return <OrderDetailPage params={remappedParams} />
}
