import { describe, expect, it } from 'vitest'
import { inferItemTypes } from '../item-types'

describe('item type inference', () => {
  it('assigns multiple useful tags from a product campaign title', () => {
    expect(
      inferItemTypes('新商品を期間限定販売するキャンペーン', ['キャンペーン'])
    ).toEqual(['CAMPAIGN', 'LIMITED_TIME', 'NEW_ITEM'])
  })

  it('marks store openings as new stores', () => {
    expect(inferItemTypes('東京都の新店舗がグランドオープン')).toContain(
      'NEW_STORE'
    )
  })
})
