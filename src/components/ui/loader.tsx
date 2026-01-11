import { cn } from '@/lib/utils'

interface LoaderProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export function Loader({ className, size = 'md', text }: LoaderProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className="relative">
        {/* Outer spinning ring */}
        <div
          className={cn(
            'animate-spin rounded-full border-4 border-gray-200',
            sizeClasses[size]
          )}
          style={{
            borderTopColor: 'rgb(37, 99, 235)',
            animationDuration: '1s',
          }}
        />

        {/* Inner pulsing circle */}
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-blue-600 animate-pulse',
            size === 'sm' && 'm-2',
            size === 'md' && 'm-3',
            size === 'lg' && 'm-4'
          )}
          style={{
            animationDuration: '1.5s',
            opacity: 0.2,
          }}
        />
      </div>

      {text && (
        <p className="text-sm font-medium text-gray-600 animate-pulse">
          {text}
        </p>
      )}
    </div>
  )
}

export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <Loader size="lg" text={text} />
    </div>
  )
}

export function FullPageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <Loader size="lg" text={text} />
      </div>
    </div>
  )
}
