import { useState, useEffect, useMemo } from 'react'
import { Users } from 'lucide-react'
import { ConstraintWrapper, Operator } from '../../types'
import { Button } from '../ui/button'
import { SkillConstraintFunction } from '../../matching/functions/SkillConstraintFunction'
import { GenderConstraintFunction } from '../../matching/functions/GenderConstraintFunction'
import { LanguageConstraintFunction } from '../../matching/functions/LanguageConstraintFunction'
import { DeviceConstraintFunction } from '../../matching/functions/DeviceConstraintFunction'
import { NationalityConstraintFunction } from '../../matching/functions/NationalityConstraintFunction'
import { IntroCourseConstraintFunction } from '../../matching/functions/IntroCourseConstraintFunction'
import { TeamSizeConstraintFunction } from '../../matching/functions/TeamSizeConstraintFunction'
import { useDataStore } from '../../store/useDataStore'
import { cn } from '../../lib/utils'

interface ConstraintFormViewProps {
  /** Pre-populated when editing; null when adding */
  editing: ConstraintWrapper | null
  onSave: (wrapper: ConstraintWrapper) => void
  onCancel: () => void
}

export function ConstraintFormView({ editing, onSave, onCancel }: ConstraintFormViewProps) {
  const { students, skills, projects } = useDataStore()

  const constraintFunctions = useMemo(
    () => [
      new SkillConstraintFunction(students, skills),
      new GenderConstraintFunction(students, skills),
      new LanguageConstraintFunction(students, skills),
      new DeviceConstraintFunction(students, skills),
      new NationalityConstraintFunction(students, skills),
      new IntroCourseConstraintFunction(students, skills),
      new TeamSizeConstraintFunction(students, skills),
    ],
    [students, skills],
  )

  // Find function index by property group name when editing
  function findFnIndexForEditing(w: ConstraintWrapper): number {
    const idx = constraintFunctions.findIndex(fn =>
      fn.getProperties().values.some(v => v.id === w.constraintFunction.propertyId),
    )
    return idx >= 0 ? idx : 0
  }

  const [selectedFnIndex, setSelectedFnIndex] = useState(() =>
    editing ? findFnIndexForEditing(editing) : 0,
  )
  const [selectedProperty, setSelectedProperty] = useState(editing?.constraintFunction.propertyId ?? '')
  const [selectedOperator, setSelectedOperator] = useState<Operator>(
    editing?.constraintFunction.operator ?? Operator.GREATER_THAN_OR_EQUAL,
  )
  const [selectedValue, setSelectedValue] = useState(editing?.constraintFunction.valueId ?? '')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    editing?.projectIds ?? [],
  )
  const [lowerBound, setLowerBound] = useState(editing?.threshold.lowerBound ?? 1)
  const [upperBound, setUpperBound] = useState(editing?.threshold.upperBound ?? 5)

  const selectedFn = constraintFunctions[selectedFnIndex]
  const propertiesGroup = selectedFn.getProperties()
  const operators = selectedFn.getOperators()
  const values = selectedFn.getValues()

  // Reset property/value when function type changes
  useEffect(() => {
    if (!editing) {
      setSelectedProperty('')
      setSelectedValue('')
    }
  }, [selectedFnIndex, editing])

  // Live match count
  const matchingStudents = useMemo(() => {
    if (!selectedProperty || !selectedValue) return null
    return selectedFn.filterStudentsByConstraintFunction(selectedProperty, selectedOperator, selectedValue)
  }, [selectedFn, selectedProperty, selectedOperator, selectedValue])

  // Validation
  const thresholdValid = lowerBound >= 0 && upperBound >= lowerBound
  const canSave = selectedValue !== '' && selectedProjectIds.length > 0 && thresholdValid

  function toggleProject(projectId: string) {
    setSelectedProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId],
    )
  }

  function toggleAllProjects() {
    if (selectedProjectIds.length === projects.length) {
      setSelectedProjectIds([])
    } else {
      setSelectedProjectIds(projects.map(p => p.id))
    }
  }

  const allSelected = selectedProjectIds.length === projects.length && projects.length > 0

  function handleSave() {
    if (!canSave || !matchingStudents) return
    const wrapper: ConstraintWrapper = {
      id: editing?.id ?? crypto.randomUUID(),
      projectIds: selectedProjectIds,
      constraintFunction: {
        property: propertiesGroup.values.find(v => v.id === selectedProperty)?.name ?? selectedProperty,
        propertyId: selectedProperty,
        operator: selectedOperator,
        value: values.find(v => v.id === selectedValue)?.name ?? selectedValue,
        valueId: selectedValue,
        studentIds: matchingStudents.map(s => s.id),
        description: selectedFn.getDescription(selectedProperty, selectedOperator, selectedValue),
      },
      threshold: { lowerBound, upperBound },
      isActive: editing?.isActive ?? true,
    }
    onSave(wrapper)
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Projects toggle chips */}
      <div>
        <label className="font-medium block mb-1.5">Projects</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={cn(
              'rounded border px-2.5 py-1 text-xs font-medium transition-colors',
              allSelected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-muted-foreground/30 hover:border-muted-foreground',
            )}
            onClick={toggleAllProjects}
          >
            All
          </button>
          {projects.map(p => {
            const active = selectedProjectIds.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                className={cn(
                  'rounded border px-2.5 py-1 text-xs transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-muted-foreground/30 hover:border-muted-foreground',
                )}
                onClick={() => toggleProject(p.id)}
              >
                {p.name}
              </button>
            )
          })}
        </div>
        {selectedProjectIds.length === 0 && (
          <p className="text-xs text-destructive mt-1">Select at least one project.</p>
        )}
      </div>

      {/* Constraint function */}
      <div>
        <label className="font-medium block mb-1.5">Constraint Function</label>
        <div className="grid grid-cols-3 gap-2">
          {/* Type / property grouped select */}
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <select
              className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
              value={selectedFnIndex}
              onChange={e => setSelectedFnIndex(Number(e.target.value))}
            >
              {constraintFunctions.map((fn, i) => (
                <option key={i} value={i}>
                  {fn.getProperties().name}
                </option>
              ))}
            </select>
          </div>
          {propertiesGroup.values.length > 1 && (
            <div>
              <label className="text-xs text-muted-foreground">Property</label>
              <select
                className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
                value={selectedProperty}
                onChange={e => setSelectedProperty(e.target.value)}
              >
                <option value="">Select…</option>
                {propertiesGroup.values.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {propertiesGroup.values.length === 1 && (
            <input type="hidden" value={propertiesGroup.values[0]?.id} ref={el => { if (el && !selectedProperty) setSelectedProperty(propertiesGroup.values[0]?.id ?? '') }} />
          )}
          <div>
            <label className="text-xs text-muted-foreground">Operator</label>
            <select
              className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
              value={selectedOperator}
              onChange={e => setSelectedOperator(e.target.value as Operator)}
            >
              {operators.map(op => (
                <option key={op.id} value={op.id}>
                  {op.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Value</label>
            <select
              className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
              value={selectedValue}
              onChange={e => setSelectedValue(e.target.value)}
            >
              <option value="">Select…</option>
              {values.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live match count */}
        {matchingStudents !== null && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>
              {matchingStudents.length} student{matchingStudents.length !== 1 ? 's' : ''} match
              this constraint
            </span>
          </div>
        )}
      </div>

      {/* Threshold: flanked ≤ symbols */}
      <div>
        <label className="font-medium block mb-1.5">Threshold</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className={cn(
              'w-20 rounded border px-2 py-1.5 text-sm text-center',
              !thresholdValid && lowerBound < 0 && 'border-destructive',
            )}
            min={0}
            value={lowerBound}
            onChange={e => setLowerBound(Number(e.target.value))}
          />
          <span className="text-muted-foreground text-sm">≤ Constraint Function ≤</span>
          <input
            type="number"
            className={cn(
              'w-20 rounded border px-2 py-1.5 text-sm text-center',
              !thresholdValid && upperBound < lowerBound && 'border-destructive',
            )}
            min={0}
            value={upperBound}
            onChange={e => setUpperBound(Number(e.target.value))}
          />
        </div>
        {!thresholdValid && (
          <p className="text-xs text-destructive mt-1">
            {lowerBound < 0 ? 'Min must be ≥ 0.' : 'Max must be ≥ Min.'}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!canSave}>
          {editing ? 'Save Changes' : 'Add Constraint'}
        </Button>
      </div>
    </div>
  )
}
