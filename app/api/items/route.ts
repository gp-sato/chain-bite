import { NextRequest, NextResponse } from 'next/server'
import { getItemsFromDb } from '@/lib/items'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_LIMIT = 20

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const genre = searchParams.get('genre') || 'all'
  const brandSlug = searchParams.get('brand') || 'all'
  const type = searchParams.get('type') || 'all'
  const query = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)

  const validatedPage = Math.max(1, Number.isNaN(page) ? 1 : page)
  const validatedLimit = Math.max(
    1,
    Math.min(100, Number.isNaN(limit) ? DEFAULT_LIMIT : limit)
  )
  const skip = (validatedPage - 1) * validatedLimit

  try {
    const items = await getItemsFromDb({
      genre,
      brandSlug,
      type,
      query,
      skip,
      take: validatedLimit,
    })

    const cacheControl =
      process.env.NODE_ENV === 'production'
        ? 'public, s-maxage=60, stale-while-revalidate=30'
        : 'no-store, max-age=0, must-revalidate'

    return NextResponse.json(items, {
      headers: {
        'Cache-Control': cacheControl,
      },
    })
  } catch (error) {
    console.error('Failed to fetch items in API route:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}
