import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

async function addData() {
  // Get admin user ID
  const users = await client.execute('SELECT id FROM User LIMIT 1')
  const adminId = users.rows[0]?.id as string

  if (!adminId) {
    console.log('No admin user found')
    return
  }

  console.log('Admin ID:', adminId)

  // Add sample bookings for today
  const today = new Date().toISOString().split('T')[0]
  const bookings = [
    { court: 1, customer: 'Ahmed Khan', phone: '+92 300 1234567', start: '09:00', end: '10:00', price: 50, status: 'COMPLETED' },
    { court: 2, customer: 'Sara Ali', phone: '+92 321 9876543', start: '10:00', end: '11:30', price: 75, status: 'COMPLETED' },
    { court: 1, customer: 'Usman Malik', phone: '+92 333 5551234', start: '14:00', end: '15:00', price: 50, status: 'ACTIVE' },
    { court: 3, customer: 'Fatima Hassan', phone: '+92 345 6789012', start: '16:00', end: '17:00', price: 50, status: 'ACTIVE' },
    { court: 2, customer: 'Bilal Ahmed', phone: '+92 312 3456789', start: '18:00', end: '19:30', price: 75, status: 'ACTIVE' },
  ]

  for (const b of bookings) {
    const id = generateId()
    try {
      await client.execute({
        sql: `INSERT INTO Booking (id, courtNumber, customerName, customerPhone, date, startTime, endTime, basePrice, extraHours, extraHourPrice, status, createdById, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 30, ?, ?, datetime('now'), datetime('now'))`,
        args: [id, b.court, b.customer, b.phone, today, b.start, b.end, b.price, b.status, adminId]
      })
      console.log('Created booking for:', b.customer)
    } catch (e: any) {
      console.log('Booking error:', e.message)
    }
  }

  // Get inventory items for sales
  const items = await client.execute('SELECT id, sellPrice, isRental FROM InventoryItem')
  const bookingRows = await client.execute('SELECT id FROM Booking WHERE status = "COMPLETED"')

  // Add some sales to completed bookings
  for (const booking of bookingRows.rows) {
    const item = items.rows[Math.floor(Math.random() * items.rows.length)]
    const saleId = generateId()
    const qty = Math.floor(Math.random() * 3) + 1
    const total = Number(item.sellPrice) * qty

    try {
      await client.execute({
        sql: `INSERT INTO Sale (id, quantity, unitPrice, total, isRental, bookingId, inventoryItemId, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [saleId, qty, item.sellPrice, total, item.isRental || 0, booking.id, item.id]
      })
      console.log('Created sale for booking:', booking.id)
    } catch (e: any) {
      console.log('Sale error:', e.message)
    }
  }

  console.log('\nData added successfully!')
}

addData().catch(console.error)
