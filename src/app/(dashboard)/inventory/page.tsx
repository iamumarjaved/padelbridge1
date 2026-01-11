'use client'

import { useEffect, useState } from 'react'
import {
  getInventoryItems,
  getCategories,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStock,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/actions/inventory'
import { Loader } from '@/components/ui/loader'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, Package, AlertTriangle, ArrowUpDown, Search, FolderPlus, Settings } from 'lucide-react'
import { toast } from 'sonner'

type Category = {
  id: string
  name: string
  type: string
  _count?: { items: number }
}

type InventoryItem = {
  id: string
  name: string
  sku: string
  quantity: number
  costPrice: number
  sellPrice: number
  minStock: number
  isRental: boolean
  category: Category
  categoryId: string
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isStockOpen, setIsStockOpen] = useState(false)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [selectedCategoryItem, setSelectedCategoryItem] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    const [itemsData, categoriesData] = await Promise.all([
      getInventoryItems(),
      getCategories(),
    ])
    setItems(itemsData)
    setCategories(categoriesData)
    setIsLoading(false)
  }

  // Filter items by category and search query
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category.type === selectedCategory
    const matchesSearch = searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const lowStockItems = items.filter((item) => item.quantity <= item.minStock)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const result = await createInventoryItem(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Item created successfully')
      setIsCreateOpen(false)
      loadData()
    }

    setIsSubmitting(false)
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedItem) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateInventoryItem(selectedItem.id, formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Item updated successfully')
      setIsEditOpen(false)
      setSelectedItem(null)
      loadData()
    }

    setIsSubmitting(false)
  }

  async function handleDelete() {
    if (!selectedItem) return
    setIsSubmitting(true)

    try {
      await deleteInventoryItem(selectedItem.id)
      toast.success('Item deleted successfully')
      setIsDeleteOpen(false)
      setSelectedItem(null)
      loadData()
    } catch {
      toast.error('Failed to delete item')
    }

    setIsSubmitting(false)
  }

  async function handleStockAdjust(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedItem) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const result = await adjustStock(selectedItem.id, formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Stock adjusted successfully')
      setIsStockOpen(false)
      setSelectedItem(null)
      loadData()
    }

    setIsSubmitting(false)
  }

  async function handleCreateCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const result = await createCategory(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Category created successfully')
      setIsCategoryOpen(false)
      loadData()
    }

    setIsSubmitting(false)
  }

  async function handleUpdateCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedCategoryItem) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateCategory(selectedCategoryItem.id, formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Category updated successfully')
      setIsEditCategoryOpen(false)
      setSelectedCategoryItem(null)
      loadData()
    }

    setIsSubmitting(false)
  }

  async function handleDeleteCategory() {
    if (!selectedCategoryItem) return
    setIsSubmitting(true)

    const result = await deleteCategory(selectedCategoryItem.id)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Category deleted successfully')
      setIsDeleteCategoryOpen(false)
      setSelectedCategoryItem(null)
      loadData()
    }

    setIsSubmitting(false)
  }

  const categoryLabels: Record<string, string> = {
    BEVERAGE_SNACK: 'Beverages & Snacks',
    EQUIPMENT_RENTAL: 'Equipment Rental',
    PRO_SHOP: 'Pro Shop',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500">Manage your products and stock levels</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new category to organize your inventory.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCategory}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name">Category Name</Label>
                    <Input id="cat-name" name="name" placeholder="e.g., Sports Equipment" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-type">Category Type</Label>
                    <Select name="type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BEVERAGE_SNACK">Beverages & Snacks</SelectItem>
                        <SelectItem value="EQUIPMENT_RENTAL">Equipment Rental</SelectItem>
                        <SelectItem value="PRO_SHOP">Pro Shop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCategoryOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Category'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>
                  Add a new item to your inventory.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" placeholder="Item name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input id="sku" name="sku" placeholder="SKU code" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category</Label>
                    <Select name="categoryId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="costPrice">Cost Price (Rs.)</Label>
                      <Input id="costPrice" name="costPrice" type="number" step="0.01" min="0" defaultValue="0" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sellPrice">Sell Price (Rs.)</Label>
                      <Input id="sellPrice" name="sellPrice" type="number" step="0.01" min="0" defaultValue="0" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Initial Quantity</Label>
                      <Input id="quantity" name="quantity" type="number" min="0" defaultValue="0" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minStock">Min Stock Alert</Label>
                      <Input id="minStock" name="minStock" type="number" min="0" defaultValue="5" required />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isRental" name="isRental" value="true" className="h-4 w-4" />
                    <Label htmlFor="isRental" className="font-normal">
                      This is a rental item (stock won&apos;t be reduced on sale)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Item'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Categories Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Categories
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
              >
                <span className="font-medium">{cat.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {cat._count?.items || 0} items
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setSelectedCategoryItem(cat)
                    setIsEditCategoryOpen(true)
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-600 hover:text-red-700"
                  onClick={() => {
                    setSelectedCategoryItem(cat)
                    setIsDeleteCategoryOpen(true)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-gray-500 text-sm">No categories yet. Add one to get started.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-600">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} are running low on stock:{' '}
              {lowStockItems.map((item) => item.name).join(', ')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Items
              </CardTitle>
              <CardDescription>
                {filteredItems.length} of {items.length} item{items.length !== 1 ? 's' : ''} shown
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <div className="overflow-x-auto -mx-2 px-2">
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                  <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="all" className="flex-1 sm:flex-initial">All</TabsTrigger>
                    <TabsTrigger value="BEVERAGE_SNACK" className="flex-1 sm:flex-initial">Beverages</TabsTrigger>
                    <TabsTrigger value="EQUIPMENT_RENTAL" className="flex-1 sm:flex-initial">Rentals</TabsTrigger>
                    <TabsTrigger value="PRO_SHOP" className="flex-1 sm:flex-initial">Pro Shop</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8"><Loader text="Loading inventory..." /></div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {searchQuery ? `No items found for "${searchQuery}"` : 'No items found'}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        {item.isRental && (
                          <Badge variant="outline" className="text-xs">Rental</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.category.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">Rs.{item.costPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">Rs.{item.sellPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          item.quantity <= item.minStock
                            ? 'text-orange-600 font-medium'
                            : ''
                        }
                      >
                        {item.quantity}
                      </span>
                      {item.quantity <= item.minStock && (
                        <AlertTriangle className="inline ml-1 h-4 w-4 text-orange-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Adjust Stock"
                          onClick={() => {
                            setSelectedItem(item)
                            setIsStockOpen(true)
                          }}
                        >
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedItem(item)
                            setIsEditOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setSelectedItem(item)
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

      {/* Edit Item Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update item information.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleUpdate}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input id="edit-name" name="name" defaultValue={selectedItem.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-sku">SKU</Label>
                    <Input id="edit-sku" name="sku" defaultValue={selectedItem.sku} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-categoryId">Category</Label>
                  <Select name="categoryId" defaultValue={selectedItem.categoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-costPrice">Cost Price (Rs.)</Label>
                    <Input id="edit-costPrice" name="costPrice" type="number" step="0.01" min="0" defaultValue={selectedItem.costPrice} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-sellPrice">Sell Price (Rs.)</Label>
                    <Input id="edit-sellPrice" name="sellPrice" type="number" step="0.01" min="0" defaultValue={selectedItem.sellPrice} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-quantity">Current Quantity</Label>
                    <Input id="edit-quantity" name="quantity" type="number" min="0" defaultValue={selectedItem.quantity} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-minStock">Min Stock Alert</Label>
                    <Input id="edit-minStock" name="minStock" type="number" min="0" defaultValue={selectedItem.minStock} required />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="edit-isRental" name="isRental" value="true" defaultChecked={selectedItem.isRental} className="h-4 w-4" />
                  <Label htmlFor="edit-isRental" className="font-normal">
                    This is a rental item
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {selectedItem && (
                <>Adjust stock for <strong>{selectedItem.name}</strong>. Current stock: {selectedItem.quantity}</>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleStockAdjust}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="stock-type">Adjustment Type</Label>
                  <Select name="type" defaultValue="IN">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Stock In (Add)</SelectItem>
                      <SelectItem value="OUT">Stock Out (Remove)</SelectItem>
                      <SelectItem value="ADJUSTMENT">Set to Exact Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-quantity">Quantity</Label>
                  <Input id="stock-quantity" name="quantity" type="number" min="0" defaultValue="0" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-notes">Notes (optional)</Label>
                  <Input id="stock-notes" name="notes" placeholder="Reason for adjustment" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsStockOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adjusting...' : 'Adjust Stock'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="py-4">
              <p className="text-sm text-gray-600">
                You are about to delete: <strong>{selectedItem.name}</strong> (SKU: {selectedItem.sku})
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category information.
            </DialogDescription>
          </DialogHeader>
          {selectedCategoryItem && (
            <form onSubmit={handleUpdateCategory}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-cat-name">Category Name</Label>
                  <Input id="edit-cat-name" name="name" defaultValue={selectedCategoryItem.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cat-type">Category Type</Label>
                  <Select name="type" defaultValue={selectedCategoryItem.type}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEVERAGE_SNACK">Beverages & Snacks</SelectItem>
                      <SelectItem value="EQUIPMENT_RENTAL">Equipment Rental</SelectItem>
                      <SelectItem value="PRO_SHOP">Pro Shop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditCategoryOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={isDeleteCategoryOpen} onOpenChange={setIsDeleteCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category?
            </DialogDescription>
          </DialogHeader>
          {selectedCategoryItem && (
            <div className="py-4">
              <p className="text-sm text-gray-600">
                You are about to delete: <strong>{selectedCategoryItem.name}</strong>
              </p>
              {(selectedCategoryItem._count?.items || 0) > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  This category has {selectedCategoryItem._count?.items} items. You must move or delete them first.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteCategoryOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
