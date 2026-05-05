import { EditProductPage } from "@be-in-digital/admin"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const remappedParams = params.then(({ id }) => ({ productId: id }))
  return <EditProductPage params={remappedParams} />
}
