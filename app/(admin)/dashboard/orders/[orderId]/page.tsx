import { OrderDetailPage } from "@be-in-digital/admin"

export default function Page({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  return <OrderDetailPage params={params} />
}
