import 'dotenv/config'
import { prisma } from '../lib/prisma'

const INITIAL_BRANDS = [
  {
    slug: 'mcdonalds',
    name: 'マクドナルド',
    genre: 'ハンバーガー',
    officialUrl: 'https://www.mcdonalds.co.jp/',
    logoUrl: null,
  },
  {
    slug: 'yoshinoya',
    name: '吉野家',
    genre: '牛丼',
    officialUrl: 'https://www.yoshinoya.com/',
    logoUrl: null,
  },
  {
    slug: 'seven-eleven',
    name: 'セブン-イレブン',
    genre: 'コンビニ',
    officialUrl: 'https://www.sej.co.jp/',
    logoUrl: null,
  },
  {
    slug: 'marugame-seimen',
    name: '丸亀製麺',
    genre: '麺類',
    officialUrl: 'https://jp.marugame.com/',
    logoUrl: null,
  },
]

async function main() {
  console.log('Seeding initial brands for ChainBite...')

  for (const brand of INITIAL_BRANDS) {
    const record = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        name: brand.name,
        genre: brand.genre,
        officialUrl: brand.officialUrl,
        logoUrl: brand.logoUrl,
        enabled: true,
      },
      create: {
        slug: brand.slug,
        name: brand.name,
        genre: brand.genre,
        officialUrl: brand.officialUrl,
        logoUrl: brand.logoUrl,
        enabled: true,
      },
    })
    console.log(`- Seeded brand: ${record.name} (${record.slug})`)
  }

  console.log('Seeding completed successfully.')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
