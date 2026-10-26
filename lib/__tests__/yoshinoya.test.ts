import { describe, expect, it } from 'vitest'
import { parseYoshinoyaFeed } from '../adapters/yoshinoya'

describe('Yoshinoya RSS adapter', () => {
  it('converts official RSS items into RawItems', async () => {
    const xml = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>吉野家公式ホームページ</title>
          <item>
            <title>秋の新商品を期間限定販売</title>
            <link>/2026/2026100701/</link>
            <guid>official-guid-1</guid>
            <pubDate>Wed, 07 Oct 2026 02:00:44 +0000</pubDate>
            <category>プレスリリース</category>
            <category>キャンペーン</category>
            <description><![CDATA[<p>RSS本文</p>]]></description>
          </item>
        </channel>
      </rss>`

    const items = await parseYoshinoyaFeed(xml)

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      title: '秋の新商品を期間限定販売',
      url: 'https://www.yoshinoya.com/2026/2026100701/',
      types: ['CAMPAIGN', 'LIMITED_TIME', 'NEW_ITEM'],
      rawPayload: {
        guid: 'official-guid-1',
        categories: ['プレスリリース', 'キャンペーン'],
      },
    })
    expect(items[0].publishedAt?.toISOString()).toBe('2026-10-07T02:00:44.000Z')
  })

  it('ignores RSS entries without a title or link', async () => {
    const xml = `<rss version="2.0"><channel>
      <item><title>タイトルだけ</title></item>
      <item><link>https://www.yoshinoya.com/item/2</link></item>
    </channel></rss>`

    await expect(parseYoshinoyaFeed(xml)).resolves.toEqual([])
  })
})
