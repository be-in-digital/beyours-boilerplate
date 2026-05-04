import { StoreDetailPage } from "@be-in-digital/admin"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const remappedParams = params.then(({ id }) => ({ storeId: id }))
  return <StoreDetailPage params={remappedParams} />
}
