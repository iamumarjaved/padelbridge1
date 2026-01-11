import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'STAFF',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Categories
CREATE TABLE IF NOT EXISTS InventoryCategory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL
);

-- Inventory Items
CREATE TABLE IF NOT EXISTS InventoryItem (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  quantity INTEGER DEFAULT 0,
  costPrice REAL NOT NULL,
  sellPrice REAL NOT NULL,
  minStock INTEGER DEFAULT 5,
  isRental INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  categoryId TEXT NOT NULL,
  FOREIGN KEY (categoryId) REFERENCES InventoryCategory(id) ON DELETE CASCADE
);

-- Bookings
CREATE TABLE IF NOT EXISTS Booking (
  id TEXT PRIMARY KEY,
  courtNumber INTEGER NOT NULL,
  customerName TEXT NOT NULL,
  customerPhone TEXT,
  date DATETIME NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  basePrice REAL NOT NULL,
  extraHours REAL DEFAULT 0,
  extraHourPrice REAL DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdById TEXT NOT NULL,
  FOREIGN KEY (createdById) REFERENCES User(id)
);

-- Sales
CREATE TABLE IF NOT EXISTS Sale (
  id TEXT PRIMARY KEY,
  quantity INTEGER NOT NULL,
  unitPrice REAL NOT NULL,
  total REAL NOT NULL,
  isRental INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  bookingId TEXT NOT NULL,
  inventoryItemId TEXT NOT NULL,
  FOREIGN KEY (bookingId) REFERENCES Booking(id) ON DELETE CASCADE,
  FOREIGN KEY (inventoryItemId) REFERENCES InventoryItem(id)
);

-- Stock Transactions
CREATE TABLE IF NOT EXISTS StockTransaction (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  inventoryItemId TEXT NOT NULL,
  createdById TEXT NOT NULL,
  FOREIGN KEY (inventoryItemId) REFERENCES InventoryItem(id) ON DELETE CASCADE,
  FOREIGN KEY (createdById) REFERENCES User(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_category ON InventoryItem(categoryId);
CREATE INDEX IF NOT EXISTS idx_booking_user ON Booking(createdById);
CREATE INDEX IF NOT EXISTS idx_sale_booking ON Sale(bookingId);
CREATE INDEX IF NOT EXISTS idx_sale_item ON Sale(inventoryItemId);
CREATE INDEX IF NOT EXISTS idx_stock_item ON StockTransaction(inventoryItemId);
CREATE INDEX IF NOT EXISTS idx_stock_user ON StockTransaction(createdById);
`

async function setupDatabase() {
  console.log('Setting up Turso database...')

  const statements = schema.split(';').filter(s => s.trim())

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await client.execute(statement)
        console.log('✓ Executed:', statement.substring(0, 50) + '...')
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          console.error('Error:', error.message)
        }
      }
    }
  }

  console.log('Database schema created successfully!')
}

setupDatabase().catch(console.error)
