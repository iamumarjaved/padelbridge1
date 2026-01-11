import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

async function seed() {
  console.log('Seeding Turso database...')

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Create admin user
  const adminId = generateId()
  try {
    await client.execute({
      sql: `INSERT INTO User (id, email, password, name, role, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [adminId, 'admin@padel.com', hashedPassword, 'Admin User', 'ADMIN']
    })
    console.log('✓ Created admin user: admin@padel.com / admin123')
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      console.log('Admin user already exists')
    } else {
      throw error
    }
  }

  // Create sample categories
  const categories = [
    { id: generateId(), name: 'Beverages', type: 'BEVERAGE_SNACK' },
    { id: generateId(), name: 'Snacks', type: 'BEVERAGE_SNACK' },
    { id: generateId(), name: 'Rackets', type: 'EQUIPMENT_RENTAL' },
    { id: generateId(), name: 'Balls', type: 'PRO_SHOP' },
  ]

  for (const cat of categories) {
    try {
      await client.execute({
        sql: `INSERT INTO InventoryCategory (id, name, type) VALUES (?, ?, ?)`,
        args: [cat.id, cat.name, cat.type]
      })
      console.log(`✓ Created category: ${cat.name}`)
    } catch (error: any) {
      if (!error.message?.includes('UNIQUE')) {
        console.log(`Category ${cat.name} may already exist`)
      }
    }
  }

  // Create sample inventory items
  const items = [
    { name: 'Water Bottle', sku: 'BEV-001', costPrice: 0.5, sellPrice: 2, quantity: 50, categoryName: 'Beverages' },
    { name: 'Energy Drink', sku: 'BEV-002', costPrice: 1.5, sellPrice: 4, quantity: 30, categoryName: 'Beverages' },
    { name: 'Protein Bar', sku: 'SNK-001', costPrice: 1, sellPrice: 3, quantity: 25, categoryName: 'Snacks' },
    { name: 'Pro Racket Rental', sku: 'RNT-001', costPrice: 0, sellPrice: 10, quantity: 8, isRental: true, categoryName: 'Rackets' },
    { name: 'Padel Balls (3 pack)', sku: 'PRO-001', costPrice: 5, sellPrice: 12, quantity: 20, categoryName: 'Balls' },
  ]

  // Get category IDs
  const catResult = await client.execute('SELECT id, name FROM InventoryCategory')
  const catMap = new Map(catResult.rows.map(r => [r.name as string, r.id as string]))

  for (const item of items) {
    const categoryId = catMap.get(item.categoryName)
    if (categoryId) {
      try {
        await client.execute({
          sql: `INSERT INTO InventoryItem (id, name, sku, costPrice, sellPrice, quantity, minStock, isRental, categoryId, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, 5, ?, ?, datetime('now'), datetime('now'))`,
          args: [generateId(), item.name, item.sku, item.costPrice, item.sellPrice, item.quantity, item.isRental ? 1 : 0, categoryId]
        })
        console.log(`✓ Created item: ${item.name}`)
      } catch (error: any) {
        if (error.message?.includes('UNIQUE')) {
          console.log(`Item ${item.name} already exists`)
        }
      }
    }
  }

  console.log('\nSeed completed!')
  console.log('\nLogin credentials:')
  console.log('  Email: admin@padel.com')
  console.log('  Password: admin123')
}

seed().catch(console.error)
