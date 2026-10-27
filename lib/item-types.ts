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

const NEW_ITEM_ALLOWLIST = [
  /新商品/,
  /新発売/,
  /新登場/,
  /新メニュー/,
  /(?:[0-9０-９]{1,4}年\s*)?[0-9０-９]{1,2}月\s*[0-9０-９]{1,2}日\s*(?:から|より)\s*発売/,
  /期間限定(?:で)?販売/,
  /販売開始/,
  /発売開始/,
]

const NEW_ITEM_DENYLIST = [/(?:販売|発売)(?:終了|停止|中止)/]

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

  const hasNewItemPhrase = NEW_ITEM_ALLOWLIST.some((pattern) =>
    pattern.test(text)
  )
  const hasNewItemExclusion = NEW_ITEM_DENYLIST.some((pattern) =>
    pattern.test(text)
  )

  if (hasNewItemPhrase && !hasNewItemExclusion) {
    types.add('NEW_ITEM')
  }

  return [...types]
}
