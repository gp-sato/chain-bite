export interface ItemBrandSummary {
  id: string
  name: string
  slug: string
  genre: string
  logoUrl: string | null
}

/** APIレスポンスとしてクライアントへ渡す、DateをISO文字列にしたItemです。 */
export interface ItemListItem {
  id: string
  title: string
  url: string
  imageUrl: string | null
  description: string | null
  types: string[]
  startsAt: string | null
  endsAt: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  brand: ItemBrandSummary
}
