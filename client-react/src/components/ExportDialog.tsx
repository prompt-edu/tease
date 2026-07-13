import { useState } from 'react'
import { Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from './ui/dialog'
import { Button } from './ui/button'
import { promptService } from '../services/PromptService'
import { useDataStore } from '../store/useDataStore'
import { useAllocationStore } from '../store/useAllocationStore'
import { Allocation } from '../types'
import toast from 'react-hot-toast'

interface ExportDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ExportDialog({ open: controlledOpen, onOpenChange }: ExportDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const isControlled = controlledOpen !== undefined
  const [loading, setLoading] = useState(false)
  const { courseIterationId } = useDataStore()
  const { allocations } = useAllocationStore()

  function buildAllocations(): Allocation[] {
    return Object.entries(allocations)
      .filter(([, students]) => students.length > 0)
      .map(([projectId, students]) => ({ projectId, students }))
  }

  function downloadCSV() {
    const rows = [['projectId', 'studentId']]
    for (const [pid, sids] of Object.entries(allocations)) {
      for (const sid of sids) {
        rows.push([pid, sid])
      }
    }
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'allocations.csv'
    a.click()
  }

  async function handleExportToPrompt() {
    if (!courseIterationId) return
    setLoading(true)
    try {
      const ok = await promptService.postAllocations(buildAllocations(), courseIterationId)
      if (ok) {
        toast.success('Allocations exported to PROMPT')
        setOpen(false)
      } else {
        toast.error('Export failed')
      }
    } catch (err) {
      toast.error('Export error: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1.5" />
            Export
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Allocations</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <p className="text-sm text-muted-foreground">
            {Object.values(allocations).flat().length} students allocated across{' '}
            {Object.keys(allocations).length} projects.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              Download CSV
            </Button>
            {courseIterationId && (
              <Button size="sm" disabled={loading} onClick={handleExportToPrompt}>
                {loading ? 'Exporting…' : 'Export to PROMPT'}
              </Button>
            )}
          </div>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button variant="ghost" size="sm">Close</Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
