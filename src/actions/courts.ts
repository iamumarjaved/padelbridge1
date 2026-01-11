'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const courtSchema = z.object({
  name: z.string().min(2, 'Court name must be at least 2 characters'),
  courtNumber: z.number().int().min(1, 'Court number must be at least 1'),
  basePrice: z.number().min(0, 'Base price must be 0 or more'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function getCourts() {
  try {
    return await prisma.court.findMany({
      orderBy: { courtNumber: 'asc' },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    })
  } catch (error) {
    console.error('getCourts error:', error)
    return []
  }
}

export async function getActiveCourts() {
  try {
    return await prisma.court.findMany({
      where: { isActive: true },
      orderBy: { courtNumber: 'asc' },
    })
  } catch (error) {
    console.error('getActiveCourts error:', error)
    return []
  }
}

export async function getCourt(id: string) {
  try {
    return await prisma.court.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    })
  } catch (error) {
    console.error('getCourt error:', error)
    return null
  }
}

export async function createCourt(formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    courtNumber: parseInt(formData.get('courtNumber') as string) || 0,
    basePrice: parseFloat(formData.get('basePrice') as string) || 0,
    description: formData.get('description') as string || undefined,
    isActive: formData.get('isActive') === 'true',
  }

  const validatedData = courtSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  try {
    // Check if court number already exists
    const existingCourt = await prisma.court.findUnique({
      where: { courtNumber: validatedData.data.courtNumber }
    })

    if (existingCourt) {
      return { error: 'Court number already exists' }
    }

    await prisma.court.create({
      data: validatedData.data,
    })

    revalidatePath('/courts')
    revalidatePath('/bookings/new')
    return { success: true }
  } catch (error) {
    console.error('createCourt error:', error)
    return { error: 'Failed to create court' }
  }
}

export async function updateCourt(id: string, formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    courtNumber: parseInt(formData.get('courtNumber') as string) || 0,
    basePrice: parseFloat(formData.get('basePrice') as string) || 0,
    description: formData.get('description') as string || undefined,
    isActive: formData.get('isActive') === 'true',
  }

  const validatedData = courtSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  try {
    // Check if court number is being changed and if it conflicts
    const court = await prisma.court.findUnique({ where: { id } })
    if (court && court.courtNumber !== validatedData.data.courtNumber) {
      const existingCourt = await prisma.court.findUnique({
        where: { courtNumber: validatedData.data.courtNumber }
      })
      if (existingCourt) {
        return { error: 'Court number already exists' }
      }
    }

    await prisma.court.update({
      where: { id },
      data: validatedData.data,
    })

    revalidatePath('/courts')
    revalidatePath('/bookings/new')
    return { success: true }
  } catch (error) {
    console.error('updateCourt error:', error)
    return { error: 'Failed to update court' }
  }
}

export async function deleteCourt(id: string) {
  try {
    // Check if court has bookings
    const court = await prisma.court.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    })

    if (court && court._count.bookings > 0) {
      return { error: 'Cannot delete court with existing bookings. Deactivate it instead.' }
    }

    await prisma.court.delete({ where: { id } })

    revalidatePath('/courts')
    revalidatePath('/bookings/new')
    return { success: true }
  } catch (error) {
    console.error('deleteCourt error:', error)
    return { error: 'Failed to delete court' }
  }
}

export async function toggleCourtStatus(id: string) {
  try {
    const court = await prisma.court.findUnique({ where: { id } })
    if (!court) {
      return { error: 'Court not found' }
    }

    await prisma.court.update({
      where: { id },
      data: { isActive: !court.isActive },
    })

    revalidatePath('/courts')
    revalidatePath('/bookings/new')
    return { success: true }
  } catch (error) {
    console.error('toggleCourtStatus error:', error)
    return { error: 'Failed to toggle court status' }
  }
}
