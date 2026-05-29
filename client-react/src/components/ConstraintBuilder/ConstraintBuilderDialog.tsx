import { useState } from 'react'
import { Settings2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useConstraintStore } from '../../store/useConstraintStore'
import { useDataStore } from '../../store/useDataStore'
import { ConstraintWrapper } from '../../types'
import { ConstraintSummaryView } from './ConstraintSummaryView'
import { ConstraintFormView } from './ConstraintFormView'

type ViewMode = 'summary' | 'form'

export function ConstraintBuilderDialog() {
  const [open, setOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [editingConstraint, setEditingConstraint] = useState<ConstraintWrapper | null>(null)

  const { constraintWrappers, addConstraint, updateConstraint, removeConstraint, toggleConstraint } =
    useConstraintStore()
  const { projects } = useDataStore()

  const activeCount = constraintWrappers.filter(w => w.isActive).length

  function handleAdd() {
    setEditingConstraint(null)
    setViewMode('form')
  }

  function handleEdit(id: string) {
    const w = constraintWrappers.find(c => c.id === id)
    if (!w) return
    setEditingConstraint(w)
    setViewMode('form')
  }

  function handleSave(wrapper: ConstraintWrapper) {
    if (editingConstraint) {
      updateConstraint(wrapper.id, wrapper)
    } else {
      addConstraint(wrapper)
    }
    setViewMode('summary')
    setEditingConstraint(null)
  }

  function handleCancel() {
    setViewMode('summary')
    setEditingConstraint(null)
  }

  function handleOpenChange(o: boolean) {
    setOpen(o)
    if (!o) {
      setViewMode('summary')
      setEditingConstraint(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-1.5" />
          Constraints
          {activeCount > 0 && (
            <Badge variant="default" className="ml-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl z-[200]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>
              {viewMode === 'form'
                ? editingConstraint
                  ? 'Edit Constraint'
                  : 'Add Constraint'
                : 'Constraint Builder'}
            </DialogTitle>
            {viewMode === 'summary' && (
              <Button size="sm" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add Constraint
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="mt-2">
          {viewMode === 'summary' ? (
            <ConstraintSummaryView
              constraints={constraintWrappers}
              projects={projects}
              onEdit={handleEdit}
              onToggle={toggleConstraint}
              onDelete={removeConstraint}
            />
          ) : (
            <ConstraintFormView
              editing={editingConstraint}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
