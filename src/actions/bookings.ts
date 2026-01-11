'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const bookingSchema = z.object({
  courtNumber: z.number().int().min(1, 'Court number is required'),
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  customerPhone: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  basePrice: z.number().min(0, 'Base price must be 0 or more'),
  notes: z.string().optional(),
})

const updateBookingSchema = bookingSchema.extend({
  extraHours: z.number().min(0).optional(),
  extraHourPrice: z.number().min(0).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
})

export async function getBookings(filters?: {
  status?: string
  dateFrom?: string
  dateTo?: string
}) {
  const where: Record<string, unknown> = {}

  if (filters?.status) {
    where.status = filters.status
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.date = {}
    if (filters?.dateFrom) {
      (where.date as Record<string, Date>).gte = new Date(filters.dateFrom)
    }
    if (filters?.dateTo) {
      (where.date as Record<string, Date>).lte = new Date(filters.dateTo)
    }
  }

  return prisma.booking.findMany({
    where,
    include: {
      createdBy: {
        select: { name: true },
      },
      sales: {
        include: {
          inventoryItem: true,
        },
      },
    },
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
  })
}

export async function getBooking(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { name: true, email: true },
      },
      sales: {
        include: {
          inventoryItem: {
            include: { category: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function createBooking(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  const rawData = {
    courtNumber: parseInt(formData.get('courtNumber') as string) || 0,
    customerName: formData.get('customerName') as string,
    customerPhone: formData.get('customerPhone') as string,
    date: formData.get('date') as string,
    startTime: formData.get('startTime') as string,
    endTime: formData.get('endTime') as string,
    basePrice: parseFloat(formData.get('basePrice') as string) || 0,
    notes: formData.get('notes') as string,
  }

  const validatedData = bookingSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  const booking = await prisma.booking.create({
    data: {
      ...validatedData.data,
      date: new Date(validatedData.data.date),
      createdById: session.user.id,
    },
  })

  revalidatePath('/bookings')
  return { success: true, bookingId: booking.id }
}

export async function updateBooking(id: string, formData: FormData) {
  const rawData = {
    courtNumber: parseInt(formData.get('courtNumber') as string) || 0,
    customerName: formData.get('customerName') as string,
    customerPhone: formData.get('customerPhone') as string,
    date: formData.get('date') as string,
    startTime: formData.get('startTime') as string,
    endTime: formData.get('endTime') as string,
    basePrice: parseFloat(formData.get('basePrice') as string) || 0,
    extraHours: parseFloat(formData.get('extraHours') as string) || 0,
    extraHourPrice: parseFloat(formData.get('extraHourPrice') as string) || 0,
    status: formData.get('status') as string,
    notes: formData.get('notes') as string,
  }

  const validatedData = updateBookingSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  await prisma.booking.update({
    where: { id },
    data: {
      ...validatedData.data,
      date: new Date(validatedData.data.date),
    },
  })

  revalidatePath('/bookings')
  revalidatePath(`/bookings/${id}`)
  return { success: true }
}

export async function updateBookingStatus(id: string, status: string) {
  await prisma.booking.update({
    where: { id },
    data: { status },
  })

  revalidatePath('/bookings')
  revalidatePath(`/bookings/${id}`)
  return { success: true }
}

export async function deleteBooking(id: string) {
  await prisma.booking.delete({ where: { id } })
  revalidatePath('/bookings')
  return { success: true }
}

export async function addExtraHours(id: string, formData: FormData) {
  const hours = parseFloat(formData.get('hours') as string) || 0
  const pricePerHour = parseFloat(formData.get('pricePerHour') as string) || 0

  if (hours <= 0) {
    return { error: 'Hours must be greater than 0' }
  }

  const booking = await prisma.booking.findUnique({ where: { id } })

  if (!booking) {
    return { error: 'Booking not found' }
  }

  await prisma.booking.update({
    where: { id },
    data: {
      extraHours: booking.extraHours + hours,
      extraHourPrice: pricePerHour,
    },
  })

  revalidatePath('/bookings')
  revalidatePath(`/bookings/${id}`)
  return { success: true }
}
