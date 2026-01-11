'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test basic queries
    const results: Record<string, unknown> = {}

    // Test 1: Count bookings
    try {
      const bookingCount = await prisma.booking.count()
      results.bookings = { success: true, count: bookingCount }
    } catch (e: unknown) {
      const error = e as Error
      results.bookings = { success: false, error: error.message }
    }

    // Test 2: Count sales
    try {
      const saleCount = await prisma.sale.count()
      results.sales = { success: true, count: saleCount }
    } catch (e: unknown) {
      const error = e as Error
      results.sales = { success: false, error: error.message }
    }

    // Test 3: Count inventory
    try {
      const itemCount = await prisma.inventoryItem.count()
      results.inventory = { success: true, count: itemCount }
    } catch (e: unknown) {
      const error = e as Error
      results.inventory = { success: false, error: error.message }
    }

    // Test 4: Bookings with relations
    try {
      const bookings = await prisma.booking.findMany({
        take: 1,
        include: {
          createdBy: { select: { name: true } },
          sales: { include: { inventoryItem: true } },
        },
      })
      results.bookingsWithRelations = { success: true, count: bookings.length }
    } catch (e: unknown) {
      const error = e as Error
      results.bookingsWithRelations = { success: false, error: error.message }
    }

    // Test 5: Sales with relations
    try {
      const sales = await prisma.sale.findMany({
        take: 1,
        include: {
          booking: { select: { customerName: true, courtNumber: true, date: true } },
          inventoryItem: { select: { name: true, sku: true } },
        },
      })
      results.salesWithRelations = { success: true, count: sales.length }
    } catch (e: unknown) {
      const error = e as Error
      results.salesWithRelations = { success: false, error: error.message }
    }

    // Test 6: Raw query
    try {
      const rawResult = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>('SELECT COUNT(*) as cnt FROM Booking')
      results.rawQuery = { success: true, result: rawResult }
    } catch (e: unknown) {
      const error = e as Error
      results.rawQuery = { success: false, error: error.message }
    }

    return NextResponse.json(results)
  } catch (e: unknown) {
    const error = e as Error
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
