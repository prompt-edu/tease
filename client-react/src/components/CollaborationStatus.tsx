import { Wifi, WifiOff } from 'lucide-react'
import { cn } from '../lib/utils'

interface CollaborationStatusProps {
  connected: boolean
}

export function CollaborationStatus({ connected }: CollaborationStatusProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        connected
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-500',
      )}
    >
      {connected ? (
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      {connected ? 'Live' : 'Offline'}
    </div>
  )
}
