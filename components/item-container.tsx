'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ItemList } from './item-list'

export interface BrandFilterOption {
  id: string
  name: string
  slug: string
  genre: string
  logoUrl: string | null
}

const TYPE_FILTERS = [
  { value: 'NEW_ITEM', label: '新商品' },
  { value: 'LIMITED_TIME', label: '期間限定' },
  { value: 'CAMPAIGN', label: 'キャンペーン' },
  { value: 'DISCOUNT', label: '割引・お得' },
]

function createFilterHref(
  currentSearchParams: URLSearchParams,
  changes: Record<string, string | null>
) {
  const params = new URLSearchParams(currentSearchParams.toString())

  for (const [key, value] of Object.entries(changes)) {
    if (!value || value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }

  const query = params.toString()
  return query ? `/?${query}` : '/'
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap border-b-2 ${
        active
          ? 'border-accent text-accent'
          : 'text-foreground/50 hover:text-foreground/80 border-transparent'
      }`}
    >
      {label}
    </Link>
  )
}

function ItemContainerContent({
  brands,
}: {
  brands: BrandFilterOption[]
}) {
  const searchParams = useSearchParams()
  const currentGenre = searchParams.get('genre') || 'all'
  const currentBrand = searchParams.get('brand') || 'all'
  const currentType = searchParams.get('type') || 'all'
  const showingBookmarks = searchParams.get('view') === 'bookmarks'
  const genres = [...new Set(brands.map((brand) => brand.genre))]

  return (
    <div className="space-y-5">
      <nav className="flex space-x-2 border-b border-card-border overflow-x-auto overflow-y-hidden no-scrollbar">
        <FilterLink
          href={createFilterHref(searchParams, {
            genre: null,
            brand: null,
            type: null,
            view: null,
          })}
          label="すべて"
          active={!showingBookmarks && currentGenre === 'all' && currentBrand === 'all'}
        />
        {genres.map((genre) => (
          <FilterLink
            key={genre}
            href={createFilterHref(searchParams, {
              genre,
              brand: null,
              view: null,
            })}
            label={genre}
            active={!showingBookmarks && currentGenre === genre}
          />
        ))}
        <FilterLink
          href={createFilterHref(searchParams, {
            genre: null,
            brand: null,
            type: null,
            view: 'bookmarks',
          })}
          label="後で読む"
          active={showingBookmarks}
        />
      </nav>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold text-foreground/40 self-center mr-1">
          ブランド
        </span>
        <FilterLink
          href={createFilterHref(searchParams, { brand: null, genre: null, view: null })}
          label="すべて"
          active={!showingBookmarks && currentBrand === 'all'}
        />
        {brands.map((brand) => (
          <FilterLink
            key={brand.id}
            href={createFilterHref(searchParams, {
              brand: brand.slug,
              genre: null,
              view: null,
            })}
            label={brand.name}
            active={!showingBookmarks && currentBrand === brand.slug}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold text-foreground/40 self-center mr-1">
          情報タイプ
        </span>
        <FilterLink
          href={createFilterHref(searchParams, { type: null, view: null })}
          label="すべて"
          active={!showingBookmarks && currentType === 'all'}
        />
        {TYPE_FILTERS.map((type) => (
          <FilterLink
            key={type.value}
            href={createFilterHref(searchParams, {
              type: type.value,
              view: null,
            })}
            label={type.label}
            active={!showingBookmarks && currentType === type.value}
          />
        ))}
      </div>

      <ItemList />
    </div>
  )
}

export interface ItemContainerProps {
  brands: BrandFilterOption[]
}

export function ItemContainer({ brands }: ItemContainerProps) {
  return (
    <Suspense fallback={<div className="min-h-[400px]">Loading filters...</div>}>
      <ItemContainerContent brands={brands} />
    </Suspense>
  )
}
