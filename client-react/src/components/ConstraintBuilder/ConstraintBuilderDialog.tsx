import { useState } from 'react'
import { Settings2, Plus, Trash2 } from 'lucide-react'
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
import { ConstraintWrapper, Operator } from '../../types'
import { SkillConstraintFunction } from '../../matching/functions/SkillConstraintFunction'
import { GenderConstraintFunction } from '../../matching/functions/GenderConstraintFunction'
import { LanguageConstraintFunction } from '../../matching/functions/LanguageConstraintFunction'
import { DeviceConstraintFunction } from '../../matching/functions/DeviceConstraintFunction'
import { NationalityConstraintFunction } from '../../matching/functions/NationalityConstraintFunction'
import { IntroCourseConstraintFunction } from '../../matching/functions/IntroCourseConstraintFunction'
import { cn } from '../../lib/utils'

export function ConstraintBuilderDialog() {
  const [open, setOpen] = useState(false)
  const { constraintWrappers, addConstraint, removeConstraint, toggleConstraint } =
    useConstraintStore()
  const { students, skills, projects } = useDataStore()

  const constraintFunctions = [
    new SkillConstraintFunction(students, skills),
    new GenderConstraintFunction(students, skills),
    new LanguageConstraintFunction(students, skills),
    new DeviceConstraintFunction(students, skills),
    new NationalityConstraintFunction(students, skills),
    new IntroCourseConstraintFunction(students, skills),
  ]

  const [selectedFnIndex, setSelectedFnIndex] = useState(0)
  const [selectedProperty, setSelectedProperty] = useState('')
  const [selectedOperator, setSelectedOperator] = useState<Operator>(Operator.GREATER_THAN_OR_EQUAL)
  const [selectedValue, setSelectedValue] = useState('')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [lowerBound, setLowerBound] = useState(1)
  const [upperBound, setUpperBound] = useState(5)

  const selectedFn = constraintFunctions[selectedFnIndex]
  const propertiesGroup = selectedFn.getProperties()
  const operators = selectedFn.getOperators()
  const values = selectedFn.getValues()

  function handleAdd() {
    if (!selectedValue || selectedProjectIds.length === 0) return
    const filteredStudents = selectedFn.filterStudentsByConstraintFunction(
      selectedProperty,
      selectedOperator,
      selectedValue,
    )
    const wrapper: ConstraintWrapper = {
      id: crypto.randomUUID(),
      projectIds: selectedProjectIds,
      constraintFunction: {
        property: propertiesGroup.values.find(v => v.id === selectedProperty)?.name || selectedProperty,
        propertyId: selectedProperty,
        operator: selectedOperator,
        value: values.find(v => v.id === selectedValue)?.name || selectedValue,
        valueId: selectedValue,
        studentIds: filteredStudents.map(s => s.id),
        description: selectedFn.getDescription(selectedProperty, selectedOperator, selectedValue),
      },
      threshold: { lowerBound, upperBound },
      isActive: true,
    }
    addConstraint(wrapper)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-1.5" />
          Constraints
          {constraintWrappers.filter(w => w.isActive).length > 0 && (
            <Badge variant="default" className="ml-1.5 text-xs">
              {constraintWrappers.filter(w => w.isActive).length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Constraint Builder</DialogTitle>
        </DialogHeader>

        {/* Constraint form */}
        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
          <div>
            <label className="font-medium">Type</label>
            <select
              className="mt-1 w-full rounded border px-2 py-1.5"
              value={selectedFnIndex}
              onChange={e => {
                setSelectedFnIndex(Number(e.target.value))
                setSelectedProperty('')
                setSelectedValue('')
              }}
            >
              {constraintFunctions.map((fn, i) => (
                <option key={i} value={i}>{fn.getProperties().name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-medium">Property</label>
            <select
              className="mt-1 w-full rounded border px-2 py-1.5"
              value={selectedProperty}
              onChange={e => setSelectedProperty(e.target.value)}
            >
              <option value="">Select…</option>
              {propertiesGroup.values.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-medium">Operator</label>
            <select
              className="mt-1 w-full rounded border px-2 py-1.5"
              value={selectedOperator}
              onChange={e => setSelectedOperator(e.target.value as Operator)}
            >
              {operators.map(op => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-medium">Value</label>
            <select
              className="mt-1 w-full rounded border px-2 py-1.5"
              value={selectedValue}
              onChange={e => setSelectedValue(e.target.value)}
            >
              <option value="">Select…</option>
              {values.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-medium">Min per project</label>
            <input
              type="number"
              className="mt-1 w-full rounded border px-2 py-1.5"
              min={0}
              value={lowerBound}
              onChange={e => setLowerBound(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="font-medium">Max per project</label>
            <input
              type="number"
              className="mt-1 w-full rounded border px-2 py-1.5"
              min={0}
              value={upperBound}
              onChange={e => setUpperBound(Number(e.target.value))}
            />
          </div>
          <div className="col-span-2">
            <label className="font-medium">Projects (hold Ctrl to multi-select)</label>
            <select
              multiple
              className="mt-1 w-full rounded border px-2 py-1.5 h-24"
              value={selectedProjectIds}
              onChange={e =>
                setSelectedProjectIds(Array.from(e.target.selectedOptions, o => o.value))
              }
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <Button size="sm" className="mt-2" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Constraint
        </Button>

        {/* Constraint list */}
        {constraintWrappers.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Active Constraints</p>
            {constraintWrappers.map(w => (
              <div
                key={w.id}
                className={cn(
                  'flex items-center gap-2 rounded border px-3 py-2 text-sm',
                  !w.isActive && 'opacity-50',
                )}
              >
                <input
                  type="checkbox"
                  checked={w.isActive}
                  onChange={() => toggleConstraint(w.id)}
                  className="shrink-0"
                />
                <span className="flex-1 truncate">{w.constraintFunction.description}</span>
                <span className="text-muted-foreground text-xs">
                  [{w.threshold.lowerBound}–{w.threshold.upperBound}]
                </span>
                <button
                  className="p-1 hover:text-destructive"
                  onClick={() => removeConstraint(w.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
