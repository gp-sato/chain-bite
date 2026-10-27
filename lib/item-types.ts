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

/**
 * タイトルと公式サイトのカテゴリから、一覧表示用の情報タイプを判定します。
 * 判定できる表現だけをタグにし、曖昧なものは無理に分類しません。
 */
export function inferItemTypes(title: string, categories: string[] = []): string[] {
  const text = [title, ...categories].join(' ')
  const types = new Set<string>()

  if (/キャンペーン|クーポン|ポイント|お得/.test(text)) {
    types.add('CAMPAIGN')
  }

  if (/割引|値引|[0-9０-９][0-9０-９,，]*\s*円引き|OFF|オフ/.test(text)) {
    types.add('DISCOUNT')
  }

  if (/期間限定|数量限定|限定販売|限定で販売/.test(text)) {
    types.add('LIMITED_TIME')
  }

  if (/コラボ|コラボレーション/.test(text)) {
    types.add('COLLABORATION')
  }

  if (/グランドオープン|新店舗.*(?:オープン|開店)|新規(?:開店|オープン|出店)/.test(text)) {
    types.add('NEW_STORE')
  }

  if (/不正アクセス|個人情報|お詫び|重要なお知らせ/.test(text)) {
    types.add('IMPORTANT')
  }

  if (/新商品|新発売|新登場|新メニュー|販売開始|発売開始/.test(text)) {
    types.add('NEW_ITEM')
  }

  return [...types]
}
