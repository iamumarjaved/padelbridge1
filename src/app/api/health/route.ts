import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toNumber(val: unknown): number {
  if (typeof val === 'bigint') return Number(val)
  if (typeof val === 'number') return val
  return Number(val) || 0
}

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const todayStr = today.toISOString().split('T')[0]
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const status: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    dateDebug: {
      todayStr,
      tomorrowStr,
      todayISO: today.toISOString(),
    },
    env: {
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      tursoUrlPrefix: process.env.TURSO_DATABASE_URL?.substring(0, 30) || null,
    },
    database: {
      connected: false,
      bookingCount: null,
      inventoryCount: null,
      activeBookings: null,
      todayBookings: null,
      sampleBookingDates: null,
      error: null,
    }
  }

  try {
    const bookingCount = await prisma.booking.count()
    const inventoryCount = await prisma.inventoryItem.count()
    const activeBookings = await prisma.booking.count({ where: { status: 'ACTIVE' } })

    // Get sample booking dates
    const sampleBookings = await prisma.booking.findMany({
      select: { date: true },
      take: 3
    })

    // Test today's bookings query
    const todayBookingsResult = await prisma.$queryRawUnsafe<Array<{ cnt: bigint | number }>>(`
      SELECT COUNT(*) as cnt FROM Booking WHERE date >= '${todayStr}' AND date < '${tomorrowStr}'
    `)

    status.database = {
      connected: true,
      bookingCount,
      inventoryCount,
      activeBookings,
      todayBookings: toNumber(todayBookingsResult[0]?.cnt),
      sampleBookingDates: sampleBookings.map(b => String(b.date)),
      error: null,
    }
  } catch (err) {
    status.database = {
      connected: false,
      bookingCount: null,
      inventoryCount: null,
      activeBookings: null,
      todayBookings: null,
      sampleBookingDates: null,
      error: String(err),
    }
  }

  return NextResponse.json(status)
}
