import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Package, ShoppingCart, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { unstable_cache } from 'next/cache'

// Force dynamic rendering for auth
export const dynamic = 'force-dynamic'

// Helper to convert BigInt values to numbers (SQLite raw queries return BigInt)
function toNumber(val: unknown): number {
  if (typeof val === 'bigint') return Number(val)
  if (typeof val === 'number') return val
  return Number(val) || 0
}

// Cache dashboard stats for 30 seconds
const getCachedDashboardStats = unstable_cache(
  async (todayStr: string, tomorrowStr: string) => {
    // Use LIKE pattern for date comparison to handle both formats
    // (2026-01-11T00:00:00.000Z and 2026-01-11T00:00:00+00:00)
    const todayISO = `${todayStr}T00:00:00.000Z`
    const tomorrowISO = `${tomorrowStr}T00:00:00.000Z`

    // Single optimized query for all counts and aggregates
    const stats = await prisma.$queryRawUnsafe<Array<{
      todayBookings: bigint | number
      activeBookings: bigint | number
      totalItems: bigint | number
      todayRevenue: bigint | number | null
    }>>(`
      SELECT
        (SELECT COUNT(*) FROM Booking WHERE date LIKE '${todayStr}%') as todayBookings,
        (SELECT COUNT(*) FROM Booking WHERE status = 'ACTIVE') as activeBookings,
        (SELECT COUNT(*) FROM InventoryItem) as totalItems,
        (SELECT COALESCE(SUM(total), 0) FROM Sale WHERE createdAt >= '${todayISO}' AND createdAt < '${tomorrowISO}') as todayRevenue
    `)
    const row = stats[0]
    // Convert BigInt to Number for JSON serialization
    return {
      todayBookings: toNumber(row?.todayBookings),
      activeBookings: toNumber(row?.activeBookings),
      totalItems: toNumber(row?.totalItems),
      todayRevenue: toNumber(row?.todayRevenue)
    }
  },
  ['dashboard-stats'],
  { revalidate: 30 } // Cache for 30 seconds
)

// Cache recent bookings for 30 seconds
const getCachedRecentBookings = unstable_cache(
  async () => {
    return prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { createdBy: true },
    })
  },
  ['recent-bookings'],
  { revalidate: 30 }
)

// Cache low stock items for 60 seconds (changes less frequently)
const getCachedLowStockItems = unstable_cache(
  async () => {
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string
      name: string
      quantity: bigint | number
      minStock: bigint | number
      categoryName: string
    }>>(`
      SELECT i.id, i.name, i.quantity, i.minStock, c.name as categoryName
      FROM InventoryItem i
      JOIN InventoryCategory c ON i.categoryId = c.id
      WHERE i.quantity <= i.minStock
      LIMIT 5
    `)
    // Convert BigInt values to numbers for JSON serialization
    return items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: toNumber(item.quantity),
      minStock: toNumber(item.minStock),
      categoryName: item.categoryName
    }))
  },
  ['low-stock-items'],
  { revalidate: 60 }
)

async function getDashboardData() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayStr = today.toISOString().split('T')[0]
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Fetch all data in parallel with caching
  const [stats, recentBookings, lowStockItems] = await Promise.all([
    getCachedDashboardStats(todayStr, tomorrowStr),
    getCachedRecentBookings(),
    getCachedLowStockItems(),
  ])

  return {
    todayBookings: stats.todayBookings,
    activeBookings: stats.activeBookings,
    totalInventoryItems: stats.totalItems,
    lowStockItems,
    recentBookings,
    todayRevenue: stats.todayRevenue,
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  let data
  try {
    data = await getDashboardData()
  } catch (error) {
    console.error('Dashboard data error:', error)
    // Return default values on error
    data = {
      todayBookings: 0,
      activeBookings: 0,
      totalInventoryItems: 0,
      lowStockItems: [],
      recentBookings: [],
      todayRevenue: 0,
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Today&apos;s Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todayBookings}</div>
            <p className="text-xs text-gray-500 mt-1">
              {data.activeBookings} active total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Today&apos;s Revenue
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs.{data.todayRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">From sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Inventory Items
            </CardTitle>
            <Package className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalInventoryItems}</div>
            <p className="text-xs text-gray-500 mt-1">Total products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {data.lowStockItems.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Items need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Bookings</CardTitle>
            <Link href="/bookings">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentBookings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No bookings yet. Create your first booking!
              </p>
            ) : (
              <div className="space-y-4">
                {data.recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {booking.customerName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Court {booking.courtNumber} • {booking.startTime} - {booking.endTime}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          booking.status === 'ACTIVE'
                            ? 'default'
                            : booking.status === 'COMPLETED'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {booking.status}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(booking.date), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Low Stock Alerts</CardTitle>
            <Link href="/inventory">
              <Button variant="ghost" size="sm">
                View inventory
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.lowStockItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                All items are well stocked!
              </p>
            ) : (
              <div className="space-y-4">
                {data.lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-orange-600">
                        {item.quantity} left
                      </p>
                      <p className="text-xs text-gray-500">
                        Min: {item.minStock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/bookings/new">
              <Button>
                <Calendar className="mr-2 h-4 w-4" />
                New Booking
              </Button>
            </Link>
            <Link href="/inventory">
              <Button variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Manage Inventory
              </Button>
            </Link>
            {session?.user?.role === 'ADMIN' && (
              <Link href="/admin/users">
                <Button variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
