import path from 'path'
import { PrismaClient } from '@prisma/client'

// SQLite path относительно cwd — фиксируем абсолютный путь, чтобы не плодить dev.db
const dbUrl = process.env.DATABASE_URL
if (dbUrl?.startsWith('file:')) {
  const filePath = dbUrl.slice('file:'.length)
  if (!path.isAbsolute(filePath)) {
    process.env.DATABASE_URL = `file:${path.join(process.cwd(), filePath)}`
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
