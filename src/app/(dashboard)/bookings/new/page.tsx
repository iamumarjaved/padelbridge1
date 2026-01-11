'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBooking } from '@/actions/bookings'
import { getActiveCourts } from '@/actions/courts'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

type Court = {
  id: string
  name: string
  courtNumber: number
  basePrice: number
}

export default function NewBookingPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourtId, setSelectedCourtId] = useState<string>('')
  const [basePrice, setBasePrice] = useState<string>('')

  useEffect(() => {
    loadCourts()
  }, [])

  async function loadCourts() {
    const data = await getActiveCourts()
    setCourts(data)
    if (data.length > 0) {
      // Select first court by default
      setSelectedCourtId(data[0].id)
      setBasePrice(data[0].basePrice.toString())
    }
  }

  function handleCourtChange(courtId: string) {
    setSelectedCourtId(courtId)
    const court = courts.find(c => c.id === courtId)
    if (court) {
      setBasePrice(court.basePrice.toString())
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    // Add court information
    const court = courts.find(c => c.id === selectedCourtId)
    if (court) {
      formData.set('courtNumber', court.courtNumber.toString())
      formData.set('courtId', court.id)
    }

    const result = await createBooking(formData)

    if (result.error) {
      toast.error(result.error)
      setIsSubmitting(false)
    } else {
      toast.success('Booking created successfully')
      router.push(`/bookings/${result.bookingId}`)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
          <p className="text-gray-500">Create a new court booking</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>
            Enter the booking information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  name="customerPhone"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="courtNumber">Select Court *</Label>
                <Select value={selectedCourtId} onValueChange={handleCourtChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select court" />
                  </SelectTrigger>
                  <SelectContent>
                    {courts.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No courts available. Add courts first.
                      </div>
                    ) : (
                      courts.map((court) => (
                        <SelectItem key={court.id} value={court.id}>
                          {court.name} (Rs.{court.basePrice})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {courts.length === 0 && (
                  <p className="text-sm text-orange-600">
                    <Link href="/courts" className="underline">Add courts</Link> to create bookings
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={today}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (Rs.) *</Label>
              <Input
                id="basePrice"
                name="basePrice"
                type="number"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="50.00"
                required
              />
              <p className="text-sm text-gray-500">
                The base court rental price for this booking
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Any special requests or notes..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Link href="/bookings">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Booking'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
