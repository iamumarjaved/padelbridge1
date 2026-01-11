import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const status: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      tursoUrlPrefix: process.env.TURSO_DATABASE_URL?.substring(0, 30) || null,
    },
    database: {
      connected: false,
      bookingCount: null,
      inventoryCount: null,
      error: null,
    }
  }

  try {
    const bookingCount = await prisma.booking.count()
    const inventoryCount = await prisma.inventoryItem.count()

    status.database = {
      connected: true,
      bookingCount,
      inventoryCount,
      error: null,
    }
  } catch (err) {
    status.database = {
      connected: false,
      bookingCount: null,
      inventoryCount: null,
      error: String(err),
    }
  }

  return NextResponse.json(status)
}
