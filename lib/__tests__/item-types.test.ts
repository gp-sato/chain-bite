import { describe, expect, it } from 'vitest'
import { inferItemTypes } from '../item-types'

describe('item type inference', () => {
  it('assigns multiple useful tags from a product campaign title', () => {
    expect(
      inferItemTypes('新商品を期間限定販売するキャンペーン', ['キャンペーン'])
    ).toEqual(['CAMPAIGN', 'LIMITED_TIME', 'NEW_ITEM'])
  })

  it.each(['100円引き', '1,000円引き', '１００円引き', '100 円引き'])(
    'marks fixed-yen discount "%s" as a discount',
    (title) => {
      expect(inferItemTypes(title)).toContain('DISCOUNT')
    }
  )

  it('does not mark an end-of-sale notice as a new item', () => {
    expect(inferItemTypes('牛丼の販売終了のお知らせ')).not.toContain('NEW_ITEM')
  })

  it('does not treat a generic menu category as a new item', () => {
    expect(inferItemTypes('価格改定のお知らせ', ['メニュー'])).not.toContain(
      'NEW_ITEM'
    )
  })

  it.each(['新発売のお知らせ', '販売開始のお知らせ'])(
    'marks an explicit new-item phrase "%s" as a new item',
    (title) => {
      expect(inferItemTypes(title)).toContain('NEW_ITEM')
    }
  )

  it('does not mark generic store information as a new store', () => {
    expect(inferItemTypes('店舗情報')).not.toContain('NEW_STORE')
  })

  it('does not mark a renewal opening as a new store', () => {
    expect(inferItemTypes('既存店舗のリニューアルオープン')).not.toContain(
      'NEW_STORE'
    )
  })

  it.each([
    '新店舗オープンのお知らせ',
    '新規開店のお知らせ',
    '新規出店のお知らせ',
  ])(
    'marks an explicit new-store phrase "%s" as a new store',
    (title) => {
      expect(inferItemTypes(title)).toContain('NEW_STORE')
    }
  )

  it('marks store openings as new stores', () => {
    expect(inferItemTypes('東京都の新店舗がグランドオープン')).toContain(
      'NEW_STORE'
    )
  })
})
