'use client'

import { useEffect, useState } from 'react'
import { getSalesHistory, getSalesSummary } from '@/actions/sales'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, DollarSign, TrendingUp, Package, Search } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

type Sale = {
  id: string
  quantity: number
  unitPrice: number
  total: number
  isRental: boolean
  createdAt: Date
  booking: {
    customerName: string
    courtNumber: number
    date: Date
  }
  inventoryItem: {
    name: string
    sku: string
  }
}

type SalesSummary = {
  totalRevenue: number
  totalTransactions: number
  topItems: Array<{
    inventoryItemId: string
    name: string
    _sum: { quantity: number | null; total: number | null }
  }>
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo])

  async function loadData() {
    setIsLoading(true)
    const filters: { dateFrom?: string; dateTo?: string } = {}

    if (dateFrom) {
      filters.dateFrom = dateFrom
    }
    if (dateTo) {
      filters.dateTo = dateTo
    }

    const [salesData, summaryData] = await Promise.all([
      getSalesHistory(filters),
      getSalesSummary(dateFrom, dateTo),
    ])

    setSales(salesData)
    setSummary(summaryData)
    setIsLoading(false)
  }

  const filteredSales = sales.filter((sale) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      sale.inventoryItem.name.toLowerCase().includes(query) ||
      sale.inventoryItem.sku.toLowerCase().includes(query) ||
      sale.booking.customerName.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
        <p className="text-gray-500">Track all sales and rentals across bookings</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs.{summary.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">
                From {summary.totalTransactions} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Transactions
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTransactions}</div>
              <p className="text-xs text-gray-500 mt-1">
                Items sold/rented
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Avg per Transaction
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${summary.totalTransactions > 0
                  ? (summary.totalRevenue / summary.totalTransactions).toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Average sale value
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Items */}
      {summary && summary.topItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Selling Items
            </CardTitle>
            <CardDescription>Best performing products by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.topItems.map((item, index) => (
                <div
                  key={item.inventoryItemId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-medium text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {item._sum.quantity || 0} units sold
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">
                    Rs.{(item._sum.total || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by item name, SKU, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full"
              />
            </div>
            {(dateFrom || dateTo || searchQuery) && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDateFrom('')
                    setDateTo('')
                    setSearchQuery('')
                  }}
                  className="w-full sm:w-auto"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            {filteredSales.length} transaction{filteredSales.length !== 1 ? 's' : ''} found
            {searchQuery && ` matching "${searchQuery}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading sales...</div>
          ) : filteredSales.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No sales found{searchQuery ? ` matching "${searchQuery}"` : ' for the selected period'}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
            <Table className="min-w-[650px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {format(new Date(sale.createdAt), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sale.inventoryItem.name}</span>
                        {sale.isRental && (
                          <Badge variant="outline" className="text-xs">
                            Rental
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{sale.inventoryItem.sku}</p>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/bookings`}
                        className="text-blue-600 hover:underline"
                      >
                        {sale.booking.customerName}
                      </Link>
                      <p className="text-xs text-gray-500">
                        Court {sale.booking.courtNumber} •{' '}
                        {format(new Date(sale.booking.date), 'MMM d')}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">{sale.quantity}</TableCell>
                    <TableCell className="text-right">
                      Rs.{sale.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      Rs.{sale.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
