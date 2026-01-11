'use client'

import { useEffect, useState } from 'react'
import { getBookings, deleteBooking, updateBookingStatus } from '@/actions/bookings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Plus, Eye, Trash2, Calendar, CheckCircle, XCircle, Search } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'

type Booking = {
  id: string
  courtNumber: number
  customerName: string
  customerPhone: string | null
  date: Date
  startTime: string
  endTime: string
  basePrice: number
  extraHours: number
  extraHourPrice: number
  status: string
  notes: string | null
  createdBy: { name: string }
  sales: Array<{
    id: string
    total: number
  }>
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadBookings()
  }, [statusFilter, dateFrom, dateTo])

  async function loadBookings() {
    setIsLoading(true)
    const filters: { status?: string; dateFrom?: string; dateTo?: string } = {}

    if (statusFilter !== 'all') {
      filters.status = statusFilter
    }
    if (dateFrom) {
      filters.dateFrom = dateFrom
    }
    if (dateTo) {
      filters.dateTo = dateTo
    }

    const data = await getBookings(filters)
    setBookings(data)
    setIsLoading(false)
  }

  async function handleStatusChange(bookingId: string, newStatus: string) {
    try {
      await updateBookingStatus(bookingId, newStatus)
      toast.success(`Booking marked as ${newStatus.toLowerCase()}`)
      loadBookings()
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function handleDelete() {
    if (!selectedBooking) return
    setIsSubmitting(true)

    try {
      await deleteBooking(selectedBooking.id)
      toast.success('Booking deleted successfully')
      setIsDeleteOpen(false)
      setSelectedBooking(null)
      loadBookings()
    } catch {
      toast.error('Failed to delete booking')
    }

    setIsSubmitting(false)
  }

  function calculateTotal(booking: Booking) {
    const extraTotal = booking.extraHours * booking.extraHourPrice
    const salesTotal = booking.sales.reduce((sum, sale) => sum + sale.total, 0)
    return booking.basePrice + extraTotal + salesTotal
  }

  const filteredBookings = bookings.filter((booking) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      booking.customerName.toLowerCase().includes(query) ||
      (booking.customerPhone && booking.customerPhone.toLowerCase().includes(query))
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500">Manage court bookings and track costs</p>
        </div>
        <Link href="/bookings/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full"
              />
            </div>
            {(statusFilter !== 'all' || dateFrom || dateTo || searchQuery) && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatusFilter('all')
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

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bookings
          </CardTitle>
          <CardDescription>
            {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
            {searchQuery && ` matching "${searchQuery}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No bookings found.{' '}
              <Link href="/bookings/new" className="text-blue-600 hover:underline">
                Create your first booking
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{booking.customerName}</p>
                        {booking.customerPhone && (
                          <p className="text-sm text-gray-500">{booking.customerPhone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>Court {booking.courtNumber}</TableCell>
                    <TableCell>{format(new Date(booking.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{booking.startTime} - {booking.endTime}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${calculateTotal(booking).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/bookings/${booking.id}`}>
                          <Button variant="ghost" size="icon" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {booking.status === 'ACTIVE' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Mark Completed"
                              onClick={() => handleStatusChange(booking.id, 'COMPLETED')}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Mark Cancelled"
                              onClick={() => handleStatusChange(booking.id, 'CANCELLED')}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setSelectedBooking(booking)
                            setIsDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="py-4">
              <p className="text-sm text-gray-600">
                You are about to delete the booking for <strong>{selectedBooking.customerName}</strong> on{' '}
                {format(new Date(selectedBooking.date), 'MMM d, yyyy')}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
