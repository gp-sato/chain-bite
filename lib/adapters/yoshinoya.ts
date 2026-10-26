import Parser from 'rss-parser'
import { fetchWithRetry } from '../http'
import { resolveUrl } from '../content'
import { RobotsTxtCache } from '../robots'
import { inferItemTypes } from '../item-types'
import type { BrandAdapter, RawItem } from './types'

export const YOSHINOYA_FEED_URL = 'https://www.yoshinoya.com/feed/'

interface YoshinoyaFeedItem extends Parser.Item {
  categories?: string[]
}

const rssParser = new Parser<unknown, YoshinoyaFeedItem>()

function parseDate(value: string | undefined): Date | null {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeDescription(value: string | undefined): string | null {
  const description = value?.trim()
  if (!description) return null

  // 吉野家のRSS本文は、記事本文ではなくWordPressの定型文だけの場合がある。
  if (description.includes('最初に表示されました')) return null

  return description
}

function toRawPayload(item: YoshinoyaFeedItem, url: string, categories: string[]) {
  return {
    title: item.title?.trim() ?? null,
    link: url,
    guid: item.guid ?? null,
    pubDate: item.pubDate ?? null,
    isoDate: item.isoDate ?? null,
    creator: item.creator ?? null,
    categories,
  }
}

/**
 * 吉野家公式RSSをRawItemへ変換します。
 * ネットワークアクセスを持たないため、アダプター単体テストにも利用できます。
 */
export async function parseYoshinoyaFeed(xml: string): Promise<RawItem[]> {
  const feed = await rssParser.parseString(xml)

  return feed.items.flatMap((item) => {
    const title = item.title?.trim() ?? ''
    const url = item.link ? resolveUrl(item.link.trim(), YOSHINOYA_FEED_URL) : ''
    if (!title || !url) return []

    const categories = (item.categories ?? [])
      .map((category) => category.trim())
      .filter(Boolean)

    return [
      {
        title,
        url,
        imageUrl: item.enclosure?.url
          ? resolveUrl(item.enclosure.url, YOSHINOYA_FEED_URL)
          : null,
        description: normalizeDescription(item.contentSnippet ?? item.summary),
        publishedAt: parseDate(item.isoDate ?? item.pubDate),
        types: inferItemTypes(title, categories),
        rawPayload: toRawPayload(item, url, categories),
      },
    ]
  })
}

export const yoshinoyaAdapter: BrandAdapter = {
  brandSlug: 'yoshinoya',

  async fetchItems(options = {}) {
    const allowed = await RobotsTxtCache.isAllowed(
      YOSHINOYA_FEED_URL,
      'ChainBite/0.1'
    )
    if (!allowed) {
      throw new Error(`Robots.txt disallows fetching ${YOSHINOYA_FEED_URL}`)
    }

    const response = await fetchWithRetry(YOSHINOYA_FEED_URL, {
      timeoutMs: 8_000,
      maxRetries: 1,
      signal: options.signal,
      headers: {
        accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8',
      },
    })

    return parseYoshinoyaFeed(await response.text())
  },
}
