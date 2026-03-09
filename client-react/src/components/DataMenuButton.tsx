import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, FlaskConical, Download, Upload, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { ImportDialog } from './ImportDialog'
import { ExportDialog } from './ExportDialog'
import { useDataStore } from '../store/useDataStore'
import { useAllocationStore } from '../store/useAllocationStore'
import { generateDemoData, isDemoModeEnabled } from '../utils/demoData'
import toast from 'react-hot-toast'

export function DataMenuButton() {
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [loadExampleConfirm, setLoadExampleConfirm] = useState(false)

  function handleLoadExample() {
    const demo = generateDemoData(5, 50)
    useDataStore.getState().setProjects(demo.projects)
    useDataStore.getState().setSkills(demo.skills)
    useDataStore.getState().setStudents(demo.students)
    useAllocationStore.getState().setAllocations({})
    setLoadExampleConfirm(false)
    toast.success('Loaded demo data: 5 projects, 50 students')
  }

  function handleReset() {
    useAllocationStore.getState().resetAllocations()
    setResetConfirm(false)
    toast.success('All allocations reset')
  }

  return (
    <>
      {/* Controlled dialogs — rendered here, opened via dropdown */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />

      {/* Load Example confirmation */}
      <Dialog open={loadExampleConfirm} onOpenChange={setLoadExampleConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Example Data?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">
            This will replace all current students, projects, and allocations with demo data.
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setLoadExampleConfirm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleLoadExample}
            >
              Load Example
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset allocations confirmation */}
      <Dialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Allocations?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">
            All students will be moved back to the unallocated pool. Student data and projects
            will be preserved. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setResetConfirm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dropdown trigger */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button size="sm" variant="outline">
            Data
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-[300] min-w-[168px] rounded-md border bg-popover text-popover-foreground shadow-md p-1"
            align="end"
            sideOffset={4}
          >
            {isDemoModeEnabled() && (
              <>
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
                  onSelect={() => setLoadExampleConfirm(true)}
                >
                  <FlaskConical className="h-4 w-4" />
                  Load Example
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
              </>
            )}
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
              onSelect={() => setImportOpen(true)}
            >
              <Download className="h-4 w-4" />
              Import
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
              onSelect={() => setExportOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Export
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent text-destructive focus:text-destructive"
              onSelect={() => setResetConfirm(true)}
            >
              <RotateCcw className="h-4 w-4" />
              Reset Allocations
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  )
}
