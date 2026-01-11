'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getBooking, updateBookingStatus, addExtraHours } from '@/actions/bookings'
import { getInventoryItems } from '@/actions/inventory'
import { addSaleToBooking, removeSaleFromBooking } from '@/actions/sales'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'

type Sale = {
  id: string
  quantity: number
  unitPrice: number
  total: number
  isRental: boolean
  inventoryItem: {
    id: string
    name: string
    sku: string
    category: { name: string }
  }
}

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
  createdBy: { name: string; email: string }
  sales: Sale[]
}

type InventoryItem = {
  id: string
  name: string
  sku: string
  quantity: number
  sellPrice: number
  isRental: boolean
  category: { name: string }
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false)
  const [isAddHoursOpen, setIsAddHoursOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [params.id])

  async function loadData() {
    setIsLoading(true)
    const [bookingData, itemsData] = await Promise.all([
      getBooking(params.id as string),
      getInventoryItems(),
    ])

    if (!bookingData) {
      toast.error('Booking not found')
      router.push('/bookings')
      return
    }

    setBooking(bookingData)
    setInventoryItems(itemsData)
    setIsLoading(false)
  }

  async function handleStatusChange(newStatus: string) {
    if (!booking) return

    try {
      await updateBookingStatus(booking.id, newStatus)
      toast.success(`Booking marked as ${newStatus.toLowerCase()}`)
      loadData()
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function handleAddSale(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!booking) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.set('bookingId', booking.id)

    const result = await addSaleToBooking(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Item added to booking')
      setIsAddSaleOpen(false)
      setSelectedItemId('')
      loadData()
    }

    setIsSubmitting(false)
  }

  async function handleRemoveSale(saleId: string) {
    if (!booking) return

    const result = await removeSaleFromBooking(saleId, booking.id)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Item removed from booking')
      loadData()
    }
  }

  async function handleAddExtraHours(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!booking) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const result = await addExtraHours(booking.id, formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Extra hours added')
      setIsAddHoursOpen(false)
      loadData()
    }

    setIsSubmitting(false)
  }

  if (isLoading) {
    return <div className="py-8 text-center text-gray-500">Loading booking...</div>
  }

  if (!booking) {
    return null
  }

  const selectedItem = inventoryItems.find((item) => item.id === selectedItemId)
  const extraTotal = booking.extraHours * booking.extraHourPrice
  const salesTotal = booking.sales.reduce((sum, sale) => sum + sale.total, 0)
  const grandTotal = booking.basePrice + extraTotal + salesTotal

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/bookings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
            <p className="text-gray-500">
              {booking.customerName} - Court {booking.courtNumber}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              booking.status === 'ACTIVE'
                ? 'default'
                : booking.status === 'COMPLETED'
                ? 'secondary'
                : 'destructive'
            }
            className="text-sm"
          >
            {booking.status}
          </Badge>
          {booking.status === 'ACTIVE' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('COMPLETED')}
                className="flex-1 sm:flex-none"
              >
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('CANCELLED')}
                className="flex-1 sm:flex-none"
              >
                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Booking Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Booking Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{booking.customerName}</p>
                </div>
              </div>
              {booking.customerPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{booking.customerPhone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {format(new Date(booking.date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">
                    {booking.startTime} - {booking.endTime}
                  </p>
                </div>
              </div>
            </div>
            {booking.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Notes</p>
                <p className="mt-1">{booking.notes}</p>
              </div>
            )}
            <div className="pt-4 border-t text-sm text-gray-500">
              Created by {booking.createdBy.name}
            </div>
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Price</span>
              <span className="font-medium">Rs.{booking.basePrice.toFixed(2)}</span>
            </div>
            {booking.extraHours > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Extra Hours ({booking.extraHours}h x Rs.{booking.extraHourPrice})
                </span>
                <span className="font-medium">Rs.{extraTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Items/Rentals</span>
              <span className="font-medium">Rs.{salesTotal.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>Rs.{grandTotal.toFixed(2)}</span>
            </div>
            {booking.status === 'ACTIVE' && (
              <Dialog open={isAddHoursOpen} onOpenChange={setIsAddHoursOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Extra Hours
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Extra Hours</DialogTitle>
                    <DialogDescription>
                      Add additional hours to this booking
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddExtraHours}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="hours">Hours to Add</Label>
                        <Input
                          id="hours"
                          name="hours"
                          type="number"
                          step="0.5"
                          min="0.5"
                          placeholder="1"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pricePerHour">Price per Hour (Rs.)</Label>
                        <Input
                          id="pricePerHour"
                          name="pricePerHour"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="30.00"
                          defaultValue={booking.extraHourPrice || ''}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddHoursOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Add Hours'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items/Sales */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Items & Rentals</CardTitle>
            <CardDescription>
              Products sold or rented during this booking
            </CardDescription>
          </div>
          {booking.status === 'ACTIVE' && (
            <Dialog open={isAddSaleOpen} onOpenChange={setIsAddSaleOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Item to Booking</DialogTitle>
                  <DialogDescription>
                    Select an item to add to this booking
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSale}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="inventoryItemId">Item</Label>
                      <Select
                        name="inventoryItemId"
                        value={selectedItemId}
                        onValueChange={setSelectedItemId}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((item) => (
                            <SelectItem
                              key={item.id}
                              value={item.id}
                              disabled={!item.isRental && item.quantity === 0}
                            >
                              <div className="flex items-center gap-2">
                                <span>{item.name}</span>
                                <span className="text-gray-500">
                                  (Rs.{item.sellPrice.toFixed(2)})
                                </span>
                                {!item.isRental && (
                                  <span className="text-xs text-gray-400">
                                    Stock: {item.quantity}
                                  </span>
                                )}
                                {item.isRental && (
                                  <Badge variant="outline" className="text-xs">
                                    Rental
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedItem && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium">{selectedItem.name}</p>
                        <p className="text-sm text-gray-500">
                          {selectedItem.category.name} • Rs.{selectedItem.sellPrice.toFixed(2)}
                        </p>
                        {!selectedItem.isRental && (
                          <p className="text-sm text-gray-500">
                            Available: {selectedItem.quantity}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="1"
                        max={selectedItem && !selectedItem.isRental ? selectedItem.quantity : 100}
                        defaultValue="1"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddSaleOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !selectedItemId}>
                      {isSubmitting ? 'Adding...' : 'Add Item'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {booking.sales.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No items added to this booking yet
            </p>
          ) : (
            <div className="space-y-3">
              {booking.sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{sale.inventoryItem.name}</p>
                      {sale.isRental && (
                        <Badge variant="outline" className="text-xs">
                          Rental
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {sale.quantity} x Rs.{sale.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">Rs.{sale.total.toFixed(2)}</span>
                    {booking.status === 'ACTIVE' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleRemoveSale(sale.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
