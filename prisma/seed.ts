import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@padel.com' },
    update: {},
    create: {
      email: 'admin@padel.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })

  console.log('Created admin user:', admin.email)

  // Create inventory categories
  const beverageCategory = await prisma.inventoryCategory.upsert({
    where: { id: 'beverages' },
    update: {},
    create: {
      id: 'beverages',
      name: 'Beverages & Snacks',
      type: 'BEVERAGE_SNACK',
    },
  })

  const rentalCategory = await prisma.inventoryCategory.upsert({
    where: { id: 'rentals' },
    update: {},
    create: {
      id: 'rentals',
      name: 'Equipment Rental',
      type: 'EQUIPMENT_RENTAL',
    },
  })

  const proShopCategory = await prisma.inventoryCategory.upsert({
    where: { id: 'proshop' },
    update: {},
    create: {
      id: 'proshop',
      name: 'Pro Shop',
      type: 'PRO_SHOP',
    },
  })

  console.log('Created categories:', beverageCategory.name, rentalCategory.name, proShopCategory.name)

  // Create sample inventory items
  const sampleItems = [
    // Beverages
    { name: 'Water Bottle', sku: 'BEV001', quantity: 50, costPrice: 0.5, sellPrice: 2, categoryId: 'beverages', isRental: false },
    { name: 'Energy Drink', sku: 'BEV002', quantity: 30, costPrice: 1.5, sellPrice: 4, categoryId: 'beverages', isRental: false },
    { name: 'Protein Bar', sku: 'BEV003', quantity: 25, costPrice: 1, sellPrice: 3, categoryId: 'beverages', isRental: false },
    // Rentals
    { name: 'Padel Racket', sku: 'RNT001', quantity: 10, costPrice: 50, sellPrice: 8, categoryId: 'rentals', isRental: true },
    { name: 'Padel Balls (3 pack)', sku: 'RNT002', quantity: 20, costPrice: 5, sellPrice: 5, categoryId: 'rentals', isRental: true },
    { name: 'Sports Shoes', sku: 'RNT003', quantity: 8, costPrice: 40, sellPrice: 10, categoryId: 'rentals', isRental: true },
    // Pro Shop
    { name: 'Premium Racket', sku: 'PRO001', quantity: 5, costPrice: 80, sellPrice: 150, categoryId: 'proshop', isRental: false },
    { name: 'Padel Bag', sku: 'PRO002', quantity: 8, costPrice: 25, sellPrice: 50, categoryId: 'proshop', isRental: false },
    { name: 'Grip Tape', sku: 'PRO003', quantity: 40, costPrice: 2, sellPrice: 6, categoryId: 'proshop', isRental: false },
  ]

  for (const item of sampleItems) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: {},
      create: item,
    })
  }

  console.log('Created sample inventory items')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
