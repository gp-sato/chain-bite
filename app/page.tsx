import { Metadata } from 'next'
import { ThemeToggle } from '@/components/theme-toggle'
import { ItemContainer } from '@/components/item-container'
import { prisma } from '@/lib/prisma'

// Prismaへのブランド取得はビルド時ではなくリクエスト時に行います。
// ローカルDB未起動でもアプリのビルドと静的アセット生成を妨げません。
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ChainBite - 外食・コンビニの公式情報ウォッチャー',
  description:
    '外食チェーンやコンビニの新商品、期間限定商品、キャンペーンを一か所で発見できる情報ウォッチャー',
}

export default async function HomePage() {
  const brands = await prisma.brand.findMany({
    where: { enabled: true },
    select: {
      id: true,
      name: true,
      slug: true,
      genre: true,
      logoUrl: true,
    },
    orderBy: [{ genre: 'asc' }, { name: 'asc' }],
  })

  return (
    <main className="min-h-screen w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex justify-end mb-4">
        <ThemeToggle />
      </div>

      <header className="mb-8 text-center sm:mb-12">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 sm:mb-4 text-gradient tracking-tight">
          ChainBite
        </h1>
        <p className="text-foreground/70 text-sm sm:text-base md:text-lg">
          外食チェーン・コンビニの最新商品・キャンペーン情報ウォッチャー
        </p>
      </header>

      <ItemContainer brands={brands} />

      <footer className="mt-16 text-center text-foreground/40 text-sm border-t border-card-border pt-8">
        &copy; {new Date().getFullYear()} ChainBite.
      </footer>
    </main>
  )
}
