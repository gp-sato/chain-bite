import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { syncYoshinoya } from '../lib/sync'

async function main() {
  const result = await syncYoshinoya()
  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((error) => {
    console.error('Yoshinoya sync failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
