'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const saleSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  inventoryItemId: z.string().min(1, 'Item is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
})

export async function addSaleToBooking(formData: FormData) {
  const rawData = {
    bookingId: formData.get('bookingId') as string,
    inventoryItemId: formData.get('inventoryItemId') as string,
    quantity: parseInt(formData.get('quantity') as string) || 1,
  }

  const validatedData = saleSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: validatedData.data.inventoryItemId },
  })

  if (!item) {
    return { error: 'Item not found' }
  }

  // For non-rental items, check and reduce stock
  if (!item.isRental) {
    if (item.quantity < validatedData.data.quantity) {
      return { error: `Insufficient stock. Only ${item.quantity} available.` }
    }
  }

  const total = item.sellPrice * validatedData.data.quantity

  await prisma.$transaction(async (tx) => {
    // Create sale record
    await tx.sale.create({
      data: {
        bookingId: validatedData.data.bookingId,
        inventoryItemId: validatedData.data.inventoryItemId,
        quantity: validatedData.data.quantity,
        unitPrice: item.sellPrice,
        total,
        isRental: item.isRental,
      },
    })

    // Reduce inventory for non-rental items
    if (!item.isRental) {
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: {
            decrement: validatedData.data.quantity,
          },
        },
      })
    }
  })

  revalidatePath('/bookings')
  revalidatePath(`/bookings/${validatedData.data.bookingId}`)
  revalidatePath('/inventory')
  return { success: true }
}

export async function removeSaleFromBooking(saleId: string, bookingId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { inventoryItem: true },
  })

  if (!sale) {
    return { error: 'Sale not found' }
  }

  await prisma.$transaction(async (tx) => {
    // Delete sale
    await tx.sale.delete({ where: { id: saleId } })

    // Return stock for non-rental items
    if (!sale.isRental) {
      await tx.inventoryItem.update({
        where: { id: sale.inventoryItemId },
        data: {
          quantity: {
            increment: sale.quantity,
          },
        },
      })
    }
  })

  revalidatePath('/bookings')
  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath('/inventory')
  return { success: true }
}

export async function getSalesHistory(filters?: {
  dateFrom?: string
  dateTo?: string
}) {
  try {
    const where: Record<string, unknown> = {}

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {}
      if (filters?.dateFrom) {
        (where.createdAt as Record<string, Date>).gte = new Date(filters.dateFrom)
      }
      if (filters?.dateTo) {
        const endDate = new Date(filters.dateTo)
        endDate.setHours(23, 59, 59, 999)
        ;(where.createdAt as Record<string, Date>).lte = endDate
      }
    }

    return await prisma.sale.findMany({
      where,
      include: {
        booking: {
          select: {
            customerName: true,
            courtNumber: true,
            date: true,
          },
        },
        inventoryItem: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('getSalesHistory error:', error)
    return []
  }
}

export async function getSalesSummary(dateFrom?: string, dateTo?: string) {
  // Build date filter for raw query
  let dateFilter = ''
  if (dateFrom && dateTo) {
    dateFilter = `WHERE s.createdAt >= '${new Date(dateFrom).toISOString()}' AND s.createdAt <= '${new Date(dateTo + 'T23:59:59.999Z').toISOString()}'`
  } else if (dateFrom) {
    dateFilter = `WHERE s.createdAt >= '${new Date(dateFrom).toISOString()}'`
  } else if (dateTo) {
    dateFilter = `WHERE s.createdAt <= '${new Date(dateTo + 'T23:59:59.999Z').toISOString()}'`
  }

  try {
    // Get totals
    const totalsResult = await prisma.$queryRawUnsafe<Array<{
      totalRevenue: number
      totalTransactions: number
    }>>(`
      SELECT
        COALESCE(SUM(total), 0) as totalRevenue,
        COUNT(*) as totalTransactions
      FROM Sale s
      ${dateFilter}
    `)

    // Get top items using raw query (groupBy with orderBy _sum not supported in LibSQL)
    const topItemsResult = await prisma.$queryRawUnsafe<Array<{
      inventoryItemId: string
      name: string
      totalQuantity: number
      totalAmount: number
    }>>(`
      SELECT
        s.inventoryItemId,
        i.name,
        SUM(s.quantity) as totalQuantity,
        SUM(s.total) as totalAmount
      FROM Sale s
      JOIN InventoryItem i ON s.inventoryItemId = i.id
      ${dateFilter ? dateFilter.replace('WHERE s.', 'WHERE s.') : ''}
      GROUP BY s.inventoryItemId, i.name
      ORDER BY totalAmount DESC
      LIMIT 5
    `)

    const totals = totalsResult[0] || { totalRevenue: 0, totalTransactions: 0 }

    return {
      totalRevenue: Number(totals.totalRevenue) || 0,
      totalTransactions: Number(totals.totalTransactions) || 0,
      topItems: topItemsResult.map(item => ({
        inventoryItemId: item.inventoryItemId,
        name: item.name,
        _sum: {
          quantity: Number(item.totalQuantity) || 0,
          total: Number(item.totalAmount) || 0
        },
      })),
    }
  } catch (error) {
    console.error('getSalesSummary error:', error)
    return {
      totalRevenue: 0,
      totalTransactions: 0,
      topItems: [],
    }
  }
}
