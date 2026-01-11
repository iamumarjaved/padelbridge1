'use client'

import { useEffect, useState } from 'react'
import { getCourts, createCourt, updateCourt, deleteCourt, toggleCourtStatus } from '@/actions/courts'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Edit, Trash2, Power } from 'lucide-react'
import { toast } from 'sonner'

type Court = {
  id: string
  name: string
  courtNumber: number
  basePrice: number
  description: string | null
  isActive: boolean
  _count: {
    bookings: number
  }
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadCourts()
  }, [])

  async function loadCourts() {
    setIsLoading(true)
    const data = await getCourts()
    setCourts(data)
    setIsLoading(false)
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const result = await createCourt(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Court created successfully')
      setIsCreateOpen(false)
      loadCourts()
      e.currentTarget.reset()
    }

    setIsSubmitting(false)
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedCourt) return

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const result = await updateCourt(selectedCourt.id, formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Court updated successfully')
      setIsEditOpen(false)
      setSelectedCourt(null)
      loadCourts()
    }

    setIsSubmitting(false)
  }

  async function handleDelete() {
    if (!selectedCourt) return
    setIsSubmitting(true)

    const result = await deleteCourt(selectedCourt.id)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Court deleted successfully')
      setIsDeleteOpen(false)
      setSelectedCourt(null)
      loadCourts()
    }

    setIsSubmitting(false)
  }

  async function handleToggleStatus(court: Court) {
    const result = await toggleCourtStatus(court.id)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Court ${court.isActive ? 'deactivated' : 'activated'} successfully`)
      loadCourts()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courts</h1>
          <p className="text-gray-500">Manage your padel courts</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Court
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add New Court</DialogTitle>
                <DialogDescription>Create a new court for bookings</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Court Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Court 1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courtNumber">Court Number *</Label>
                  <Input
                    id="courtNumber"
                    name="courtNumber"
                    type="number"
                    min="1"
                    placeholder="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Default Base Price (Rs.) *</Label>
                  <Input
                    id="basePrice"
                    name="basePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1000.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Optional court description..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="isActive" name="isActive" defaultChecked />
                  <Label htmlFor="isActive">Active (available for bookings)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Court'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Courts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Courts</CardTitle>
          <CardDescription>
            {courts.length} court{courts.length !== 1 ? 's' : ''} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8"><Loader text="Loading courts..." /></div>
          ) : courts.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No courts found. Add your first court to get started!
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Court #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courts.map((court) => (
                    <TableRow key={court.id}>
                      <TableCell className="font-medium">{court.courtNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{court.name}</p>
                          {court.description && (
                            <p className="text-sm text-gray-500">{court.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>Rs.{court.basePrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className="text-gray-600">{court._count.bookings}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={court.isActive ? 'default' : 'secondary'}>
                          {court.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(court)}
                            title={court.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <Power className={`h-4 w-4 ${court.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedCourt(court)
                              setIsEditOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              setSelectedCourt(court)
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          {selectedCourt && (
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle>Edit Court</DialogTitle>
                <DialogDescription>Update court details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Court Name *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedCourt.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-courtNumber">Court Number *</Label>
                  <Input
                    id="edit-courtNumber"
                    name="courtNumber"
                    type="number"
                    min="1"
                    defaultValue={selectedCourt.courtNumber}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-basePrice">Default Base Price (Rs.) *</Label>
                  <Input
                    id="edit-basePrice"
                    name="basePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedCourt.basePrice}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={selectedCourt.description || ''}
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="edit-isActive"
                    name="isActive"
                    defaultChecked={selectedCourt.isActive}
                  />
                  <Label htmlFor="edit-isActive">Active (available for bookings)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Court'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Court</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this court? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedCourt && (
            <div className="py-4">
              <p className="text-sm text-gray-600">
                You are about to delete <strong>{selectedCourt.name}</strong>.
                {selectedCourt._count.bookings > 0 && (
                  <span className="text-orange-600">
                    {' '}This court has {selectedCourt._count.bookings} booking(s).
                    Consider deactivating instead of deleting.
                  </span>
                )}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Court'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
