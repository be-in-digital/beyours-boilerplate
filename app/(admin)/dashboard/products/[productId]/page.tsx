import { EditProductPage } from "@be-in-digital/admin"

export default function Page({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  return <EditProductPage params={params} />
}
