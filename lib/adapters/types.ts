/**
 * 各チェーン専用アダプターが抽出した生情報レコード
 */
export interface RawItem {
  title: string
  url: string
  imageUrl?: string | null
  description?: string | null
  publishedAt?: Date | null
  startsAt?: Date | null
  endsAt?: Date | null
  types?: string[]
  rawPayload?: Record<string, unknown>
}

/**
 * ブランド別クローラーアダプターの共通インターフェース
 *
 * この小さなインターフェースが、公式サイトごとのHTML/API差分を
 * 共通の保存パイプラインから隠す seam になります。
 */
export interface BrandAdapter {
  brandSlug: string
  fetchItems(options?: { signal?: AbortSignal }): Promise<RawItem[]>
}
