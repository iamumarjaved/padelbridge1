'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Calendar,
  ShoppingCart,
  Users,
  ChevronLeft,
  X,
  Grid3x3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Bookings', href: '/bookings', icon: Calendar },
  { name: 'Courts', href: '/courts', icon: Grid3x3 },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Sales History', href: '/sales', icon: ShoppingCart },
]

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: Users },
]

interface SidebarProps {
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
  isMobile?: boolean
  onClose?: () => void
}

export function Sidebar({ collapsed, onCollapse, isMobile = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <aside
      className={cn(
        'h-screen bg-white border-r border-gray-200 transition-all duration-300',
        isMobile ? 'w-full max-w-[280px]' : 'fixed left-0 top-0 z-40',
        !isMobile && (collapsed ? 'w-16' : 'w-64')
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2" onClick={isMobile ? onClose : undefined}>
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Padel Bridge 1</span>
            </Link>
          )}
          {collapsed && !isMobile && (
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center mx-auto">
              <Package className="h-5 w-5 text-white" />
            </div>
          )}
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Main
              </p>
            )}
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={isMobile ? onClose : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 flex-shrink-0', collapsed && 'mx-auto')} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </div>

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-gray-200">
              {!collapsed && (
                <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Admin
                </p>
              )}
              {adminNavigation.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={isMobile ? onClose : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5 flex-shrink-0', collapsed && 'mx-auto')} />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          )}
        </nav>

        {/* Collapse Button - Hidden on mobile */}
        {!isMobile && (
          <div className="p-2 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCollapse(!collapsed)}
              className={cn('w-full justify-center', !collapsed && 'justify-start')}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
              {!collapsed && <span className="ml-2">Collapse</span>}
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}
