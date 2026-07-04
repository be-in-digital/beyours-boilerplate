import { StoreDetailPage } from "@be-in-digital/admin"

export default function Page({
  params,
}: {
  params: Promise<{ storeId: string }>
}) {
  return <StoreDetailPage params={params} />
}
