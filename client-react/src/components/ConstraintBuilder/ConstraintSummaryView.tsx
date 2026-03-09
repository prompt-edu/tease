import { Pencil, Trash2, ToggleLeft, ToggleRight, Check } from 'lucide-react'
import { ConstraintWrapper } from '../../types'
import { cn } from '../../lib/utils'

interface ConstraintSummaryViewProps {
  constraints: ConstraintWrapper[]
  projects: { id: string; name: string }[]
  onEdit: (id: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function ConstraintSummaryView({
  constraints,
  projects,
  onEdit,
  onToggle,
  onDelete,
}: ConstraintSummaryViewProps) {
  if (constraints.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No constraints yet. Click "Add Constraint" to create one.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Constraint</th>
            <th className="py-2 px-2 font-medium text-center">Min</th>
            <th className="py-2 px-2 font-medium text-center">Max</th>
            {projects.map(p => (
              <th key={p.id} className="py-2 px-2 font-medium text-center max-w-[60px] truncate" title={p.name}>
                {p.name.slice(0, 6)}{p.name.length > 6 ? '…' : ''}
              </th>
            ))}
            <th className="py-2 pl-2 font-medium text-center">Status</th>
            <th className="py-2 pl-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {constraints.map(w => (
            <tr key={w.id} className={cn('border-b last:border-0', !w.isActive && 'opacity-50')}>
              <td className="py-2 pr-3 truncate max-w-[200px]" title={w.constraintFunction.description}>
                {w.constraintFunction.description}
              </td>
              <td className="py-2 px-2 text-center">{w.threshold.lowerBound}</td>
              <td className="py-2 px-2 text-center">{w.threshold.upperBound}</td>
              {projects.map(p => (
                <td key={p.id} className="py-2 px-2 text-center">
                  {w.projectIds.includes(p.id) ? (
                    <Check className="h-3.5 w-3.5 text-green-600 mx-auto" />
                  ) : (
                    <span className="text-muted-foreground/30">—</span>
                  )}
                </td>
              ))}
              <td className="py-2 pl-2 text-center">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-xs',
                    w.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {w.isActive ? 'active' : 'inactive'}
                </span>
              </td>
              <td className="py-2 pl-2">
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={() => onEdit(w.id)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={() => onToggle(w.id)}
                    title={w.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {w.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(w.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
