import { describe, expect, it } from 'vitest'
import {
  extractFirstImage,
  extractMetaTagContent,
  extractOpenGraphImage,
  resolveUrl,
} from '../content'

describe('content extraction helpers', () => {
  it('resolves relative links against the source page', () => {
    expect(resolveUrl('/campaign/summer', 'https://example.com/news/1')).toBe(
      'https://example.com/campaign/summer'
    )
  })

  it('reads meta attributes regardless of their order', () => {
    const html = '<meta content="/images/item.jpg" property="og:image">'
    expect(extractMetaTagContent(html, 'og:image')).toBe('/images/item.jpg')
    expect(extractOpenGraphImage(html, 'https://example.com/news/1')).toBe(
      'https://example.com/images/item.jpg'
    )
  })

  it('falls back to the first inline image', () => {
    const html = '<p><img alt="item" src="/images/first.jpg"></p>'
    expect(extractFirstImage(html, 'https://example.com/news/1')).toBe(
      'https://example.com/images/first.jpg'
    )
  })
})
