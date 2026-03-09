import { useState } from 'react'
import { Download } from 'lucide-react'
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

interface ImportDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ImportDialog({ open: controlledOpen, onOpenChange }: ImportDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const isControlled = controlledOpen !== undefined
  const [loading, setLoading] = useState(false)
  const { courseIterationId, courseIterations, setCourseIterationId } = useDataStore()
  const [selectedId, setSelectedId] = useState(courseIterationId || '')
  const canImport = promptService.isImportPossible()

  async function handleImport() {
    if (!selectedId) return
    setLoading(true)
    try {
      const [students, projects, skills, allocations] = await Promise.all([
        promptService.getStudents(selectedId),
        promptService.getProjects(selectedId),
        promptService.getSkills(selectedId),
        promptService.getAllocations(selectedId).catch(() => [] as Allocation[]),
      ])

      const dataStore = useDataStore.getState()
      dataStore.setStudents(students)
      dataStore.setProjects(projects)
      dataStore.setSkills(skills)
      dataStore.setCourseIterationId(selectedId)

      // Apply existing allocations.
      const allocationMap: Record<string, string[]> = {}
      for (const a of allocations) {
        allocationMap[a.projectId] = a.students
      }
      useAllocationStore.getState().setAllocations(allocationMap)

      toast.success(`Imported ${students.length} students and ${projects.length} projects`)
      setOpen(false)
    } catch (err) {
      toast.error('Import failed: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1.5" />
            Import
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import from PROMPT</DialogTitle>
        </DialogHeader>
        {!canImport ? (
          <p className="text-sm text-muted-foreground">
            Please log in to PROMPT to enable import.
          </p>
        ) : (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Course Iteration</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Select…</option>
                {courseIterations.map(ci => (
                  <option key={ci.id} value={ci.id}>
                    {ci.semesterName || ci.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <Button size="sm" disabled={!selectedId || loading} onClick={handleImport}>
                {loading ? 'Importing…' : 'Import'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
