'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const inventoryItemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(2, 'SKU must be at least 2 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  quantity: z.number().int().min(0, 'Quantity must be 0 or more'),
  costPrice: z.number().min(0, 'Cost price must be 0 or more'),
  sellPrice: z.number().min(0, 'Sell price must be 0 or more'),
  minStock: z.number().int().min(0, 'Minimum stock must be 0 or more'),
  isRental: z.boolean(),
})

const stockAdjustmentSchema = z.object({
  quantity: z.number().int(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  notes: z.string().optional(),
})

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['BEVERAGE_SNACK', 'EQUIPMENT_RENTAL', 'PRO_SHOP']),
})

export async function getCategories() {
  return prisma.inventoryCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { items: true }
      }
    }
  })
}

export async function createCategory(formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    type: formData.get('type') as string,
  }

  const validatedData = categorySchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  await prisma.inventoryCategory.create({
    data: validatedData.data,
  })

  revalidatePath('/inventory')
  return { success: true }
}

export async function updateCategory(id: string, formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    type: formData.get('type') as string,
  }

  const validatedData = categorySchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  await prisma.inventoryCategory.update({
    where: { id },
    data: validatedData.data,
  })

  revalidatePath('/inventory')
  return { success: true }
}

export async function deleteCategory(id: string) {
  // Check if category has items
  const itemCount = await prisma.inventoryItem.count({
    where: { categoryId: id }
  })

  if (itemCount > 0) {
    return { error: `Cannot delete category with ${itemCount} items. Move or delete items first.` }
  }

  await prisma.inventoryCategory.delete({ where: { id } })
  revalidatePath('/inventory')
  return { success: true }
}

export async function getInventoryItems(categoryId?: string) {
  return prisma.inventoryItem.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: { category: true },
    orderBy: { name: 'asc' },
  })
}

export async function getInventoryItem(id: string) {
  return prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      category: true,
      stockTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { createdBy: true },
      },
    },
  })
}

export async function createInventoryItem(formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    sku: formData.get('sku') as string,
    categoryId: formData.get('categoryId') as string,
    quantity: parseInt(formData.get('quantity') as string) || 0,
    costPrice: parseFloat(formData.get('costPrice') as string) || 0,
    sellPrice: parseFloat(formData.get('sellPrice') as string) || 0,
    minStock: parseInt(formData.get('minStock') as string) || 5,
    isRental: formData.get('isRental') === 'true',
  }

  const validatedData = inventoryItemSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  const existingSku = await prisma.inventoryItem.findUnique({
    where: { sku: validatedData.data.sku },
  })

  if (existingSku) {
    return { error: 'An item with this SKU already exists' }
  }

  await prisma.inventoryItem.create({
    data: validatedData.data,
  })

  revalidatePath('/inventory')
  revalidatePath('/') // Invalidate dashboard cache
  return { success: true }
}

export async function updateInventoryItem(id: string, formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    sku: formData.get('sku') as string,
    categoryId: formData.get('categoryId') as string,
    quantity: parseInt(formData.get('quantity') as string) || 0,
    costPrice: parseFloat(formData.get('costPrice') as string) || 0,
    sellPrice: parseFloat(formData.get('sellPrice') as string) || 0,
    minStock: parseInt(formData.get('minStock') as string) || 5,
    isRental: formData.get('isRental') === 'true',
  }

  const validatedData = inventoryItemSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  const existingSku = await prisma.inventoryItem.findFirst({
    where: {
      sku: validatedData.data.sku,
      NOT: { id },
    },
  })

  if (existingSku) {
    return { error: 'An item with this SKU already exists' }
  }

  await prisma.inventoryItem.update({
    where: { id },
    data: validatedData.data,
  })

  revalidatePath('/inventory')
  revalidatePath('/') // Invalidate dashboard cache
  return { success: true }
}

export async function deleteInventoryItem(id: string) {
  await prisma.inventoryItem.delete({ where: { id } })
  revalidatePath('/inventory')
  revalidatePath('/') // Invalidate dashboard cache
  return { success: true }
}

export async function adjustStock(itemId: string, formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  const rawData = {
    quantity: parseInt(formData.get('quantity') as string) || 0,
    type: formData.get('type') as string,
    notes: formData.get('notes') as string,
  }

  const validatedData = stockAdjustmentSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } })

  if (!item) {
    return { error: 'Item not found' }
  }

  let newQuantity = item.quantity

  if (validatedData.data.type === 'IN') {
    newQuantity += validatedData.data.quantity
  } else if (validatedData.data.type === 'OUT') {
    newQuantity -= validatedData.data.quantity
    if (newQuantity < 0) {
      return { error: 'Cannot reduce stock below 0' }
    }
  } else {
    newQuantity = validatedData.data.quantity
  }

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: newQuantity },
    }),
    prisma.stockTransaction.create({
      data: {
        inventoryItemId: itemId,
        type: validatedData.data.type,
        quantity: validatedData.data.quantity,
        notes: validatedData.data.notes,
        createdById: session.user.id,
      },
    }),
  ])

  revalidatePath('/inventory')
  revalidatePath('/') // Invalidate dashboard cache
  return { success: true }
}
