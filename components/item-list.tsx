'use client'

import {
  Suspense,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSearchParams } from 'next/navigation'
import useSWRInfinite from 'swr/infinite'
import type { ItemListItem } from '@/lib/item-types'

const PAGE_SIZE = 20
const BOOKMARK_STORAGE_KEY = 'chainbite_bookmarks'

const ITEM_TYPE_LABELS: Record<string, string> = {
  NEW_ITEM: '新商品',
  SEASONAL: '季節商品',
  LIMITED_TIME: '期間限定',
  CAMPAIGN: 'キャンペーン',
  DISCOUNT: '割引・お得',
  GIVEAWAY: 'プレゼント・抽選',
  COLLABORATION: 'コラボ',
  NEW_STORE: '新店舗',
  STORE_RENEWAL: '店舗リニューアル',
  IMPORTANT: '重要なお知らせ',
}

const fetcher = async (url: string): Promise<ItemListItem[]> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch items')
  return response.json() as Promise<ItemListItem[]>
}

function formatDate(dateInput: string | null | undefined) {
  if (!dateInput) return '公開日不明'

  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return '公開日不明'

  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function typeLabel(type: string) {
  return ITEM_TYPE_LABELS[type] ?? type.replaceAll('_', ' ')
}

function readBookmarks(): ItemListItem[] {
  try {
    const saved = window.localStorage.getItem(BOOKMARK_STORAGE_KEY)
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? (parsed as ItemListItem[]) : []
  } catch {
    return []
  }
}

function ItemListContent() {
  const searchParams = useSearchParams()
  const filterKey = searchParams.toString()
  const showingBookmarks = searchParams.get('view') === 'bookmarks'
  const currentGenre = searchParams.get('genre') || 'all'
  const currentBrand = searchParams.get('brand') || 'all'
  const currentType = searchParams.get('type') || 'all'

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [mounted, setMounted] = useState(false)
  const [bookmarks, setBookmarks] = useState<ItemListItem[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const observerRef = useRef<HTMLDivElement>(null)
  const trimmedSearchQuery = searchQuery.trim()

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMounted(true)
      setBookmarks(readBookmarks())
    })

    return () => cancelAnimationFrame(handle)
  }, [])

  useEffect(() => {
    const delay = searchInput.trim() === '' ? 0 : 300
    const handle = window.setTimeout(() => {
      setSearchQuery(searchInput)
    }, delay)

    return () => window.clearTimeout(handle)
  }, [searchInput])

  const getKey = (
    pageIndex: number,
    previousPageData: ItemListItem[] | null
  ) => {
    if (showingBookmarks) return null
    if (previousPageData && previousPageData.length < PAGE_SIZE) return null

    const params = new URLSearchParams()
    if (currentGenre !== 'all') params.set('genre', currentGenre)
    if (currentBrand !== 'all') params.set('brand', currentBrand)
    if (currentType !== 'all') params.set('type', currentType)
    if (trimmedSearchQuery) params.set('q', trimmedSearchQuery)
    params.set('page', String(pageIndex + 1))
    params.set('limit', String(PAGE_SIZE))

    return `/api/items?${params.toString()}`
  }

  const { data, error, size, setSize } = useSWRInfinite<ItemListItem[]>(
    getKey,
    fetcher,
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      persistSize: false,
    }
  )

  useEffect(() => {
    setSize(1)
  }, [filterKey, trimmedSearchQuery, setSize])

  const filteredBookmarks = useMemo(() => {
    if (!trimmedSearchQuery) return bookmarks
    const query = trimmedSearchQuery.toLocaleLowerCase('ja-JP')

    return bookmarks.filter((item) => {
      const searchable = [
        item.title,
        item.description ?? '',
        item.brand.name,
      ].join(' ')
      return searchable.toLocaleLowerCase('ja-JP').includes(query)
    })
  }, [bookmarks, trimmedSearchQuery])

  const items = useMemo(() => {
    const fetchedItems = data?.flat() ?? []
    const source = showingBookmarks
      ? mounted
        ? filteredBookmarks
        : []
      : fetchedItems
    const seen = new Set<string>()

    return source.filter((item) => {
      if (!item?.id || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }, [data, filteredBookmarks, mounted, showingBookmarks])

  const isLoadingInitial = !showingBookmarks && !data && !error
  const isLoadingMore = Boolean(
    !showingBookmarks &&
      (isLoadingInitial || (size > 0 && data && !data[size - 1]))
  )
  const lastPage = data?.[data.length - 1]
  const isReachingEnd = showingBookmarks || Boolean(lastPage && lastPage.length < PAGE_SIZE)
  const isEmpty = showingBookmarks
    ? mounted && items.length === 0
    : !isLoadingInitial && items.length === 0

  useEffect(() => {
    const target = observerRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore && !isReachingEnd) {
          setSize((currentSize) => currentSize + 1)
        }
      },
      { rootMargin: '400px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [isLoadingMore, isReachingEnd, setSize])

  const toggleBookmark = (item: ItemListItem) => {
    const isBookmarked = bookmarks.some((bookmark) => bookmark.id === item.id)
    const updated = isBookmarked
      ? bookmarks.filter((bookmark) => bookmark.id !== item.id)
      : [...bookmarks, item]

    setBookmarks(updated)
    window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(updated))
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearchQuery(searchInput)
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-card-border pb-3">
        <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground/45">
          {showingBookmarks
            ? '後で読む'
            : trimmedSearchQuery
              ? '検索結果'
              : '最新の情報'}
        </h2>

        <button
          type="button"
          onClick={() => setIsSearchOpen((isOpen) => !isOpen)}
          className={`h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 ${
            isSearchOpen
              ? 'bg-accent/15 border-accent/35 text-accent shadow-sm shadow-accent/5'
              : 'bg-card-bg border-card-border text-foreground/60 hover:text-foreground hover:bg-foreground/5'
          }`}
          aria-label={isSearchOpen ? '検索窓を閉じる' : '検索窓を開く'}
          aria-expanded={isSearchOpen}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.197 5.197a7.5 7.5 0 0 0 10.606 10.606Z"
            />
          </svg>
          {isSearchOpen ? '検索を閉じる' : '情報を検索'}
        </button>
      </div>

      {isSearchOpen && (
        <section className="bg-white/95 dark:bg-neutral-900/95 border border-card-border rounded-2xl p-4 shadow-lg">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              ref={searchInputRef}
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="商品名・キャンペーン名を検索"
              className="w-full rounded-xl border border-card-border bg-background/70 px-4 py-3 pr-20 text-base outline-none transition-colors placeholder:text-foreground/35 focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-11 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full flex items-center justify-center text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground"
                aria-label="検索キーワードをクリア"
              >
                ×
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full flex items-center justify-center text-foreground/50 transition-colors hover:bg-accent/10 hover:text-accent"
              aria-label="検索する"
            >
              <span aria-hidden="true">⌕</span>
            </button>
          </form>
        </section>
      )}

      {trimmedSearchQuery && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-card-bg px-4 py-3 text-sm text-foreground/60">
          <span className="min-w-0 truncate">「{trimmedSearchQuery}」の検索結果</span>
          <button
            type="button"
            onClick={clearSearch}
            className="shrink-0 text-accent transition-opacity hover:opacity-80 rounded-md px-2 py-1"
          >
            解除
          </button>
        </div>
      )}

      <div className="space-y-6">
        {items.map((item) => {
          const isBookmarked = bookmarks.some((bookmark) => bookmark.id === item.id)

          return (
            <article
              key={item.id}
              className="glass glass-hover rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-300 group"
            >
              <div className="flex gap-4 sm:gap-6 items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent/20 text-accent border border-accent/30">
                      {item.brand.name}
                    </span>
                    {item.types.map((type) => (
                      <span
                        key={type}
                        className="px-2.5 py-0.5 rounded-full bg-foreground/5 text-foreground/60 border border-foreground/10 text-[10px] font-medium"
                      >
                        {typeLabel(type)}
                      </span>
                    ))}
                    <div className="flex items-center gap-3 ml-auto shrink-0">
                      <time className="text-xs sm:text-sm text-foreground/40 font-medium">
                        {formatDate(item.publishedAt)}
                      </time>
                      <button
                        type="button"
                        onClick={() => toggleBookmark(item)}
                        className={`p-1.5 rounded-lg border transition-all duration-300 ${
                          isBookmarked
                            ? 'bg-accent/15 border-accent/30 text-accent hover:bg-accent/25'
                            : 'bg-card-bg border-card-border text-foreground/40 hover:text-accent hover:border-accent/40 hover:bg-accent/5'
                        }`}
                        aria-label={isBookmarked ? 'ブックマークを解除' : '後で読む'}
                        title={isBookmarked ? 'ブックマークを解除' : '後で読む'}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill={isBookmarked ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth={2}
                          className="h-[18px] w-[18px]"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group-hover:text-accent transition-colors"
                  >
                    <h3 className="text-lg sm:text-xl md:text-2xl font-semibold leading-snug mb-2 break-words [overflow-wrap:anywhere]">
                      {item.title}
                    </h3>
                  </a>

                  {item.description && (
                    <p className="text-xs sm:text-sm text-foreground/60 line-clamp-3 mt-2 break-words [overflow-wrap:anywhere]">
                      {item.description}
                    </p>
                  )}

                  <div className="flex justify-end mt-4">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium"
                    >
                      公式サイトで見る
                      <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </div>

                <div className="w-20 h-20 sm:w-28 sm:h-28 shrink-0 rounded-xl sm:rounded-2xl overflow-hidden border border-card-border relative bg-card-bg self-start mt-1 select-none">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-accent/5 to-accent/15 text-accent/30">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 sm:h-8 sm:w-8 mb-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                        />
                      </svg>
                      <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider opacity-70">
                        ChainBite
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div ref={observerRef} className="pt-6 pb-12 flex flex-col items-center justify-center">
        {isLoadingMore && (
          <div className="w-full space-y-6">
            {[1, 2, 3].map((index) => (
              <div key={index} className="glass rounded-2xl p-6 animate-pulse">
                <div className="h-6 w-28 bg-foreground/10 rounded-full mb-4" />
                <div className="space-y-2">
                  <div className="h-6 w-full bg-foreground/10 rounded" />
                  <div className="h-6 w-2/3 bg-foreground/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="glass border-red-500/30 text-red-500 rounded-2xl p-6 text-center w-full max-w-md">
            <p className="font-semibold mb-2">情報の読み込みに失敗しました。</p>
            <button
              type="button"
              onClick={() => setSize(size)}
              className="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg text-sm transition-colors border border-accent/30"
            >
              再試行する
            </button>
          </div>
        )}

        {!isLoadingMore && isReachingEnd && !isEmpty && !error && (
          <div className="text-center py-6 text-foreground/40">
            <span className="text-sm font-medium tracking-wide">すべての情報を読み込みました</span>
          </div>
        )}

        {!isLoadingMore && isEmpty && (
          <div className="glass rounded-2xl p-12 text-center w-full flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-accent/10 text-accent rounded-full border border-accent/25">
              <span className="text-3xl" aria-hidden="true">🍔</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground/80">
                {showingBookmarks && !trimmedSearchQuery
                  ? '保存された情報はありません'
                  : '表示する情報がありません'}
              </h3>
              <p className="text-foreground/50 text-sm max-w-sm mx-auto">
                {showingBookmarks && !trimmedSearchQuery
                  ? 'カードのブックマークボタンから、後で読みたい情報を保存できます。'
                  : '条件を変えるか、ブランド別アダプターが情報を取得するまでお待ちください。'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ItemList() {
  return (
    <Suspense fallback={<div className="min-h-[400px]">Loading items...</div>}>
      <ItemListContent />
    </Suspense>
  )
}
