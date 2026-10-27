import { prisma } from './prisma'
import { upsertItems, type UpsertItemsResult } from './items'
import { yoshinoyaAdapter } from './adapters/yoshinoya'

export interface SyncYoshinoyaResult extends UpsertItemsResult {
  brandSlug: string
  fetchedCount: number
}

/**
 * 吉野家の公式RSSを取得し、seed済みのBrandへItemとして保存します。
 */
export async function syncYoshinoya(options: {
  signal?: AbortSignal
} = {}): Promise<SyncYoshinoyaResult> {
  const brand = await prisma.brand.findUnique({
    where: { slug: yoshinoyaAdapter.brandSlug },
    select: { id: true, slug: true },
  })

  if (!brand) {
    throw new Error(
      'Brand yoshinoya was not found. Run the Prisma seed before syncing.'
    )
  }

  const rawItems = await yoshinoyaAdapter.fetchItems(options)
  const result = await upsertItems(brand.id, rawItems)

  return {
    brandSlug: brand.slug,
    fetchedCount: rawItems.length,
    ...result,
  }
}
