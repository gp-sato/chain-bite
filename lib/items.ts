import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import type { RawItem } from './adapters/types'

export interface GetItemsOptions {
  genre?: string
  brandSlug?: string
  type?: string
  query?: string
  skip?: number
  take?: number
}

export const itemListSelect = {
  id: true,
  title: true,
  url: true,
  imageUrl: true,
  description: true,
  types: true,
  startsAt: true,
  endsAt: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
      genre: true,
      logoUrl: true,
    },
  },
} as const

export type ItemListRecord = Prisma.ItemGetPayload<{
  select: typeof itemListSelect
}>

/**
 * 同じ同期実行内の重複と、空のレコードを保存前に除外します。
 * NexusFeedのRSS保存処理で得た「先に重複を落とす」知見を、Itemへ移植したものです。
 */
export function deduplicateRawItems(rawItems: RawItem[]): RawItem[] {
  const itemsByUrl = new Map<string, RawItem>()

  for (const rawItem of rawItems) {
    const url = rawItem.url.trim()
    const title = rawItem.title.trim()
    if (!url || !title || itemsByUrl.has(url)) continue

    itemsByUrl.set(url, {
      ...rawItem,
      title,
      url,
      description: rawItem.description?.trim() || null,
    })
  }

  return [...itemsByUrl.values()]
}

export async function getItemsFromDb(
  options: GetItemsOptions = {}
): Promise<ItemListRecord[]> {
  const {
    genre,
    brandSlug,
    type,
    query,
    skip = 0,
    take = 30,
  } = options

  const trimmedQuery = query?.trim()
  const where: Prisma.ItemWhereInput = {}

  if (brandSlug && brandSlug !== 'all') {
    where.brand = { is: { slug: brandSlug } }
  } else if (genre && genre !== 'all') {
    where.brand = { is: { genre } }
  }

  if (type && type !== 'all') {
    where.types = { has: type }
  }

  if (trimmedQuery) {
    where.OR = [
      { title: { contains: trimmedQuery, mode: 'insensitive' } },
      { description: { contains: trimmedQuery, mode: 'insensitive' } },
    ]
  }

  return prisma.item.findMany({
    where,
    select: itemListSelect,
    orderBy: [
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    skip: Math.max(0, skip),
    take: Math.max(1, Math.min(100, take)),
  })
}

export interface UpsertItemsResult {
  createdCount: number
  updatedCount: number
  skippedCount: number
}

function toItemData(rawItem: RawItem) {
  return {
    title: rawItem.title,
    url: rawItem.url,
    imageUrl: rawItem.imageUrl ?? null,
    description: rawItem.description ?? null,
    types: rawItem.types ?? [],
    startsAt: rawItem.startsAt ?? null,
    endsAt: rawItem.endsAt ?? null,
    publishedAt: rawItem.publishedAt ?? null,
    ...(rawItem.rawPayload === undefined
      ? {}
      : { rawPayload: rawItem.rawPayload as Prisma.InputJsonValue }),
  }
}

/**
 * ブランドアダプターの結果をURL単位でUPSERTします。
 *
 * 保存処理のインターフェースをブランド別アダプターから分離することで、
 * HTML構造が変わっても重複防止と更新規則は一箇所に留まります。
 */
export async function upsertItems(
  brandId: string,
  rawItems: RawItem[]
): Promise<UpsertItemsResult> {
  const uniqueItems = deduplicateRawItems(rawItems)

  return prisma.$transaction(async (tx) => {
    let createdCount = 0
    let updatedCount = 0

    for (const rawItem of uniqueItems) {
      const existingItem = await tx.item.findUnique({
        where: { url: rawItem.url },
        select: { id: true },
      })

      const data = {
        brandId,
        ...toItemData(rawItem),
      }

      if (existingItem) {
        await tx.item.update({
          where: { id: existingItem.id },
          data,
        })
        updatedCount += 1
      } else {
        await tx.item.create({ data })
        createdCount += 1
      }
    }

    return {
      createdCount,
      updatedCount,
      skippedCount: rawItems.length - uniqueItems.length,
    }
  })
}
