'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'STAFF']),
})

const updateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'STAFF']),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
})

export async function getUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })
  return users
}

export async function createUser(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
    role: formData.get('role') as string,
  }

  const validatedData = userSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  const existing = await prisma.user.findUnique({
    where: { email: validatedData.data.email },
  })

  if (existing) {
    return { error: 'A user with this email already exists' }
  }

  const hashedPassword = await bcrypt.hash(validatedData.data.password, 10)

  await prisma.user.create({
    data: {
      ...validatedData.data,
      password: hashedPassword,
    },
  })

  revalidatePath('/admin/users')
  return { success: true }
}

export async function updateUser(id: string, formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    name: formData.get('name') as string,
    role: formData.get('role') as string,
    password: formData.get('password') as string,
  }

  const validatedData = updateUserSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.errors[0].message }
  }

  const existing = await prisma.user.findFirst({
    where: {
      email: validatedData.data.email,
      NOT: { id },
    },
  })

  if (existing) {
    return { error: 'A user with this email already exists' }
  }

  const updateData: Record<string, unknown> = {
    email: validatedData.data.email,
    name: validatedData.data.name,
    role: validatedData.data.role,
  }

  if (validatedData.data.password && validatedData.data.password.length > 0) {
    updateData.password = await bcrypt.hash(validatedData.data.password, 10)
  }

  await prisma.user.update({
    where: { id },
    data: updateData,
  })

  revalidatePath('/admin/users')
  return { success: true }
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } })

  if (!user) {
    return { error: 'User not found' }
  }

  // Don't allow deleting the last admin
  if (user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
    if (adminCount <= 1) {
      return { error: 'Cannot delete the last admin user' }
    }
  }

  await prisma.user.delete({ where: { id } })

  revalidatePath('/admin/users')
  return { success: true }
}
