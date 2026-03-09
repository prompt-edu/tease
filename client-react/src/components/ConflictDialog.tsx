import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
import { Button } from './ui/button'

interface ConflictDialogProps {
  open: boolean
  serverVersion: bigint
  onUseServer: () => void
  onUseLocal: () => void
}

export function ConflictDialog({
  open,
  serverVersion,
  onUseServer,
  onUseLocal,
}: ConflictDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>State conflict detected</DialogTitle>
          <DialogDescription>
            The collaboration server has a different allocation state (version {serverVersion}).
            Which state would you like to keep?
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex gap-3 justify-end">
          <Button variant="outline" onClick={onUseLocal}>
            Keep my local state
          </Button>
          <Button onClick={onUseServer}>
            Use server state
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
