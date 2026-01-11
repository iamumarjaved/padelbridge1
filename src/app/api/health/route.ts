import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const status = {
    timestamp: new Date().toISOString(),
    database: {
      connected: false,
      bookingCount: 0,
      inventoryCount: 0,
      error: null as string | null,
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
      bookingCount: 0,
      inventoryCount: 0,
      error: String(err),
    }
  }

  return NextResponse.json(status)
}
