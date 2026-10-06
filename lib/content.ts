/**
 * 相対URLを、取得元ページを基準に絶対URLへ解決します。
 * RSS由来のURLとHTML由来のURLの両方で使えるよう、取得処理から分離しています。
 */
export function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return ''

  try {
    return new URL(url, baseUrl).href
  } catch {
    return url
  }
}

/**
 * HTMLのmetaタグからproperty/nameに対応するcontentを抽出します。
 * 属性の順序に依存しないため、公式サイトごとのHTML差分を吸収できます。
 */
export function extractMetaTagContent(
  html: string,
  propertyOrName: string
): string | null {
  const expected = propertyOrName.toLowerCase()
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []

  for (const metaTag of metaTags) {
    const propertyMatch = metaTag.match(
      /\b(?:property|name)\s*=\s*["']([^"']+)["']/i
    )
    if (propertyMatch?.[1].toLowerCase() !== expected) continue

    const contentMatch = metaTag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)
    if (contentMatch?.[1]) return contentMatch[1]
  }

  return null
}

/**
 * OGP/Twitter Cardの代表画像を取得します。
 * アダプターが画像を直接抽出できない場合の低コストなフォールバックです。
 */
export function extractOpenGraphImage(html: string, pageUrl: string): string | null {
  const image =
    extractMetaTagContent(html, 'og:image') ??
    extractMetaTagContent(html, 'twitter:image')

  return image ? resolveUrl(image, pageUrl) : null
}

/** HTML本文の最初のimg要素から画像URLを取得します。 */
export function extractFirstImage(html: string, pageUrl: string): string | null {
  const imageMatch = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)
  return imageMatch?.[1] ? resolveUrl(imageMatch[1], pageUrl) : null
}
