import { NextRequest, NextResponse } from 'next/server'
import { syncYoshinoya } from '@/lib/sync'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isAuthorized(request: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET

  // 本番ではCRON_SECRETを必須にし、ローカルでは未設定時だけ手動実行を許可します。
  if (!expectedSecret) return process.env.NODE_ENV !== 'production'

  return request.headers.get('authorization') === `Bearer ${expectedSecret}`
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncYoshinoya({ signal: request.signal })

    return NextResponse.json({
      syncedAt: new Date().toISOString(),
      results: [result],
    })
  } catch (error) {
    console.error('Failed to sync Yoshinoya items:', error)
    return NextResponse.json(
      { error: 'Failed to sync Yoshinoya items' },
      { status: 500 }
    )
  }
}
